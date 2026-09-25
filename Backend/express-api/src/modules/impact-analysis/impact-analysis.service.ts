import { getMongoDb } from "../../lib/mongodb.js";
import { ApiError } from "../../utils/ApiError.js";
import { repositoryRepository } from "../repositories/repository.repository.js";
import type { RawFileDocument } from "../ingestion/ingestion.types.js";
import type { ImpactAnalysisInput, ImpactAnalysisResult, ImpactEvidence } from "./impact-analysis.types.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function targetName(target: string): string {
  const lastSegment = target.split(/[./\\]/).filter(Boolean).pop() || target;
  return lastSegment.replace(/\.(?:ts|tsx|js|jsx|py)$/i, "");
}

function evidenceKey(item: ImpactEvidence): string {
  return `${item.kind}:${item.filePath}:${item.startLine}:${item.message}`;
}

/**
 * Produces an explainable change-impact report from static sync evidence and
 * source text. No embeddings and no LLM calls occur in this service.
 */
export class ImpactAnalysisService {
  async analyze(token: string, input: ImpactAnalysisInput): Promise<ImpactAnalysisResult> {
    const repository = await repositoryRepository.findById(token, input.repositoryId);
    if (!repository) throw new ApiError(404, "Repository not found or access denied");

    const db = await getMongoDb();
    if (!db) throw new ApiError(503, "Code index is unavailable. Configure MongoDB and sync the repository first.");

    const collection = db.collection<RawFileDocument>("raw_files");
    const indexedFiles = await collection.countDocuments({ repository_id: input.repositoryId });
    if (!indexedFiles) throw new ApiError(409, "This repository has not been synced yet. Run a repository sync before impact analysis.");

    const name = targetName(input.target);
    const escapedName = escapeRegex(name);
    const evidence: ImpactEvidence[] = [];
    const affectedFiles = new Set<string>();
    const add = (item: ImpactEvidence) => {
      if (!evidence.some((existing) => evidenceKey(existing) === evidenceKey(item))) {
        evidence.push(item);
        affectedFiles.add(item.filePath);
      }
    };

    const definitions = await collection.find({
      repository_id: input.repositoryId,
      $or: [
        { path: input.target },
        { "analysis.symbols.name": name },
        { "analysis.symbols.qualifiedName": input.target },
      ],
    }).limit(30).toArray();

    for (const file of definitions) {
      const symbols = file.analysis?.symbols || [];
      const matchingSymbols = symbols.filter((symbol) =>
        symbol.name === name || symbol.qualifiedName === input.target || file.path === input.target
      );
      for (const symbol of matchingSymbols.length ? matchingSymbols : [{ startLine: 1, endLine: 1, name: file.path, kind: "file" }]) {
        add({
          kind: "definition",
          filePath: file.path,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
          message: `This is where ${name} is originally created.`,
          revision: file.sha,
        });
      }
    }

    // Textual callers plus named imports are intentionally shown as evidence,
    // not asserted as a perfect call graph for dynamic languages.
    const references = await collection.find({
      repository_id: input.repositoryId,
      $or: [
        { "analysis.imports.importedSymbols": name },
        { content: { $regex: `\\b${escapedName}\\s*\\(`, $options: "i" } },
        { content: { $regex: `\\b${escapedName}\\b`, $options: "i" } },
      ],
    }).limit(100).toArray();

    for (const file of references) {
      if (definitions.some((definition) => definition.path === file.path)) continue;
      const lines = file.content.split("\n");
      const lineIndex = lines.findIndex((line) => new RegExp(`\\b${escapedName}\\b`, "i").test(line));
      if (lineIndex < 0) continue;
      add({
        kind: file.analysis?.isTestFile ? "test" : "caller",
        filePath: file.path,
        startLine: lineIndex + 1,
        endLine: lineIndex + 1,
        message: file.analysis?.isTestFile
          ? `This check may be affected if ${name} changes.`
          : `This part of the application may rely on ${name}.`,
        revision: file.sha,
      });
    }

    const routeFiles = [...definitions, ...references];
    for (const file of routeFiles) {
      for (const route of file.analysis?.routes || []) {
        add({
          kind: "route",
          filePath: file.path,
          startLine: route.startLine,
          endLine: route.endLine,
          message: `The ${route.method} ${route.path} feature may be affected.`,
          revision: file.sha,
        });
      }
      for (const database of file.analysis?.databaseReferences || []) {
        add({
          kind: "database",
          filePath: file.path,
          startLine: database.startLine,
          endLine: database.endLine,
          message: `This code uses saved ${database.reference} data.`,
          revision: file.sha,
        });
      }
    }

    evidence.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.startLine - b.startLine);
    const routes = evidence.filter((item) => item.kind === "route").length;
    const callers = evidence.filter((item) => item.kind === "caller").length;
    const tests = evidence.filter((item) => item.kind === "test").length;
    const hasDefinition = evidence.some((item) => item.kind === "definition");
    const risk: ImpactAnalysisResult["risk"] = routes > 0 || callers >= 5 ? "high" : callers > 0 || evidence.some((item) => item.kind === "database") ? "medium" : "low";
    const confidence: ImpactAnalysisResult["confidence"] = hasDefinition ? "verified" : evidence.length ? "partial" : "unknown";

    return {
      target: input.target,
      repositoryId: input.repositoryId,
      risk,
      confidence,
      summary: hasDefinition
        ? `${name} is used in ${callers} other place${callers === 1 ? "" : "s"}${routes ? ` and may affect ${routes} user-facing feature${routes === 1 ? "" : "s"}` : ""}. Check the items below before making a change.`
        : `We found mentions of ${name}, but could not confirm where it is created. Treat this as a helpful starting point, not a complete answer.`,
      evidence,
      affectedFiles: [...affectedFiles].sort(),
      verificationChecklist: [
        "Open each item below and check whether it should still work after your change.",
        routes ? "Try the listed app features in the browser after making the change." : "Check whether this change affects any visible app feature.",
        tests ? "Run the existing automated checks after making the change." : "Ask a developer to add a small automated check for this change.",
        "Sync the repository after merging so this report stays up to date.",
      ],
      indexedFiles,
    };
  }
}

export const impactAnalysisService = new ImpactAnalysisService();
