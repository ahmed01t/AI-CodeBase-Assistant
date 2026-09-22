import path from "path";
import { githubClient } from "../github/github.client.js";
import { defaultIngestionFilter } from "../ingestion/ingestion.filter.js";
import { ingestionRepository } from "../ingestion/ingestion.repository.js";
import { codeChunkerService } from "../code-chunker/code-chunker.service.js";
import { embeddingService } from "../embeddings/embedding.service.js";
import { supabase } from "../../lib/supabase.js";
import { webhookRepository, WebhookRepository } from "./webhook.repository.js";
import {
  GitHubPushWebhookPayload,
  IncrementalSyncResult,
} from "./webhook.types.js";
import type { RawFileDocument } from "../ingestion/ingestion.types.js";

export class WebhookService {
  constructor(private repo: WebhookRepository = webhookRepository) {}

  /**
   * Processes a GitHub push webhook event and executes incremental sync.
   */
  public async processPushEvent(
    payload: GitHubPushWebhookPayload,
    eventId: string
  ): Promise<IncrementalSyncResult | null> {
    const repoFullName = payload.repository?.full_name;
    const repoUrl = payload.repository?.html_url;

    if (!repoFullName && !repoUrl) {
      await this.repo.updateWebhookEventStatus(eventId, "failed", "Missing repository info in payload");
      return null;
    }

    // 1. Find the repository in our database
    const dbRepo = await this.repo.findRepositoryByFullNameOrUrl(repoFullName, repoUrl);

    if (!dbRepo) {
      console.log(`[WebhookService] Repository '${repoFullName}' is not connected in our system. Skipping.`);
      await this.repo.updateWebhookEventStatus(eventId, "processed", "Repository not tracked");
      return null;
    }

    await this.repo.updateWebhookEventStatus(eventId, "processing");

    // 2. Aggregate all added, modified, and removed files from commits
    const filesAdded = new Set<string>();
    const filesModified = new Set<string>();
    const filesRemoved = new Set<string>();

    for (const commit of payload.commits || []) {
      commit.added?.forEach((f) => filesAdded.add(f));
      commit.modified?.forEach((f) => filesModified.add(f));
      commit.removed?.forEach((f) => filesRemoved.add(f));
    }

    // A file added and then removed in the same push should be treated as removed
    for (const f of filesRemoved) {
      filesAdded.delete(f);
      filesModified.delete(f);
    }

    const owner = dbRepo.owner;
    const repoName = dbRepo.name;
    const branch = payload.ref?.replace("refs/heads/", "") || dbRepo.default_branch || "main";
    let chunksUpdated = 0;

    console.log(
      `[WebhookService] Incremental sync for ${owner}/${repoName}: +${filesAdded.size} added, ~${filesModified.size} modified, -${filesRemoved.size} removed.`
    );

    // 3. Handle Removed Files
    for (const filePath of filesRemoved) {
      try {
        await this.repo.deleteRawFile(dbRepo.id, filePath);
        await this.repo.deleteKnowledgeDocumentByPath(dbRepo.id, filePath);
      } catch (err: any) {
        console.warn(`[WebhookService] Error deleting file '${filePath}': ${err.message}`);
      }
    }

    // 4. Handle Added and Modified Files
    const filesToSync = new Set([...filesAdded, ...filesModified]);

    for (const filePath of filesToSync) {
      // Check ignore filter
      if (!defaultIngestionFilter.shouldIngestFile(filePath)) {
        continue;
      }

      try {
        // A. Fetch updated content from GitHub
        const fileContentRes = await githubClient.fetchFileContent(
          owner,
          repoName,
          filePath,
          branch
        );

        let decodedContent = "";
        if (fileContentRes.content) {
          decodedContent =
            fileContentRes.encoding === "base64"
              ? Buffer.from(fileContentRes.content, "base64").toString("utf-8")
              : fileContentRes.content;
        }

        const filename = path.basename(filePath);
        const ext = path.extname(filename).replace(/^\./, "");

        // B. Update raw file in MongoDB
        const rawDoc: RawFileDocument = {
          repository_id: dbRepo.id,
          project_id: dbRepo.project_id,
          path: filePath,
          filename,
          extension: ext,
          size: decodedContent.length,
          content: decodedContent,
          sha: fileContentRes.sha,
          mime_type: "text/plain",
          created_at: new Date(),
          updated_at: new Date(),
        };

        await this.repo.updateRawFile(rawDoc);

        // C. Upsert Knowledge Document in PostgreSQL (remove old chunks first)
        await this.repo.deleteKnowledgeDocumentByPath(dbRepo.id, filePath);

        const { data: newDoc } = await supabase
          .from("knowledge_documents")
          .insert({
            project_id: dbRepo.project_id,
            repository_id: dbRepo.id,
            source_type: "repository",
            title: filePath,
            source_uri: filePath,
            mime_type: "text/plain",
            content_hash: fileContentRes.sha,
            status: "indexed",
          })
          .select("id")
          .maybeSingle();

        // D. Chunk and Re-Embed using Tree-sitter & Gemini
        if (newDoc?.id && decodedContent.trim()) {
          const chunkResult = await codeChunkerService.chunkFile({
            code: decodedContent,
            filePath,
          });

          if (chunkResult.chunks.length > 0 && process.env.GEMINI_API_KEY) {
            await embeddingService.processAndStoreChunks(
              newDoc.id,
              chunkResult.chunks,
              supabase
            );
            chunksUpdated += chunkResult.chunks.length;
          }
        }
      } catch (fileErr: any) {
        console.warn(`[WebhookService] Warning processing file '${filePath}': ${fileErr.message}`);
      }
    }

    // 5. Update last_synced_at timestamp
    await this.repo.updateRepositoryLastSynced(dbRepo.id);
    await this.repo.updateWebhookEventStatus(eventId, "processed");

    return {
      repositoryId: dbRepo.id,
      filesAdded: filesAdded.size,
      filesModified: filesModified.size,
      filesRemoved: filesRemoved.size,
      totalChunksUpdated: chunksUpdated,
    };
  }
}

export const webhookService = new WebhookService();
