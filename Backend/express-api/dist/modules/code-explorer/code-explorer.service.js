import { getMongoDb } from "../../lib/mongodb.js";
import { codeChunkerService } from "../code-chunker/code-chunker.service.js";
/**
 * On-Demand Code Explorer Engine
 * Provides live search, symbol extraction, file inspection, and directory navigation
 * directly over repository source files cached in MongoDB.
 */
export class CodeExplorerService {
    /**
     * Performs high-speed keyword, regex, and symbol search across repository files.
     */
    async searchCodebase(options) {
        const { repositoryId, projectId, query, limit = 6 } = options;
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            return { results: [], totalMatches: 0 };
        }
        const db = await getMongoDb();
        if (!db) {
            return { results: [], totalMatches: 0 };
        }
        const collection = db.collection("raw_files");
        // Build filter query for MongoDB
        const filter = {};
        if (repositoryId)
            filter.repository_id = repositoryId;
        if (projectId)
            filter.project_id = projectId;
        // Extract search keywords
        const keywords = cleanQuery
            .split(/\s+/)
            .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .filter((k) => k.length > 1);
        if (keywords.length === 0) {
            return { results: [], totalMatches: 0 };
        }
        // Search files containing any of the keywords
        const regexPattern = keywords.join("|");
        filter.content = { $regex: regexPattern, $options: "i" };
        const matchingDocs = await collection
            .find(filter)
            .limit(20)
            .project({ path: 1, filename: 1, content: 1, extension: 1 })
            .toArray();
        const matches = [];
        for (const doc of matchingDocs) {
            const content = doc.content || "";
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let lineScore = 0;
                for (const kw of keywords) {
                    const re = new RegExp(kw, "i");
                    if (re.test(line)) {
                        lineScore += 1;
                    }
                }
                // Boost score if line looks like a definition
                if (/(export\s+)?(function|class|interface|type|const|let|var|def|async)\s+/i.test(line)) {
                    lineScore += 2;
                }
                if (lineScore > 0) {
                    const startLine = Math.max(1, i - 2);
                    const endLine = Math.min(lines.length, i + 6);
                    const snippet = lines.slice(startLine - 1, endLine).join("\n");
                    const symbolMatch = line.match(/(?:function|class|interface|type|const|let|var|def)\s+([a-zA-Z0-9_$]+)/);
                    const symbolName = symbolMatch ? symbolMatch[1] : undefined;
                    matches.push({
                        filePath: doc.path,
                        filename: doc.filename,
                        matchedLine: i + 1,
                        startLine,
                        endLine,
                        snippet,
                        symbolName,
                        score: lineScore,
                    });
                    i += 4;
                }
            }
        }
        // Sort matches by relevance score
        matches.sort((a, b) => b.score - a.score);
        const finalResults = matches.slice(0, limit);
        return {
            results: finalResults,
            totalMatches: matches.length,
        };
    }
    /**
     * Finds files matching a path pattern (e.g. *auth*, *.controller.ts).
     */
    async findFiles(options) {
        const { repositoryId, projectId, pattern, limit = 15 } = options;
        const db = await getMongoDb();
        if (!db)
            return [];
        const collection = db.collection("raw_files");
        const filter = {};
        if (repositoryId)
            filter.repository_id = repositoryId;
        if (projectId)
            filter.project_id = projectId;
        const regexPattern = pattern
            .replace(/\./g, "\\.")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".");
        filter.path = { $regex: regexPattern, $options: "i" };
        const docs = await collection
            .find(filter)
            .limit(limit)
            .project({ path: 1 })
            .toArray();
        return docs.map((d) => d.path);
    }
    /**
     * Reads the full or sliced content of a specific code file.
     */
    async readFileContent(options) {
        const { repositoryId, projectId, filePath, startLine = 1, endLine } = options;
        const db = await getMongoDb();
        if (!db)
            return null;
        const collection = db.collection("raw_files");
        const filter = { path: filePath };
        if (repositoryId)
            filter.repository_id = repositoryId;
        if (projectId)
            filter.project_id = projectId;
        const doc = await collection.findOne(filter);
        if (!doc || !doc.content) {
            return null;
        }
        const lines = doc.content.split("\n");
        const totalLines = lines.length;
        const finalStart = Math.max(1, Math.min(startLine, totalLines));
        const finalEnd = endLine ? Math.min(endLine, totalLines) : totalLines;
        const slicedContent = lines.slice(finalStart - 1, finalEnd).join("\n");
        return {
            filePath: doc.path,
            content: slicedContent,
            startLine: finalStart,
            endLine: finalEnd,
            totalLines,
        };
    }
    /**
     * Uses Tree-sitter AST parser to extract structural symbol outline for a file.
     */
    async getFileSymbols(options) {
        const fileData = await this.readFileContent({
            repositoryId: options.repositoryId,
            projectId: options.projectId,
            filePath: options.filePath,
        });
        if (!fileData)
            return null;
        try {
            const chunkResult = await codeChunkerService.chunkFile({
                code: fileData.content,
                filePath: fileData.filePath,
            });
            const symbols = chunkResult.chunks.map((c) => ({
                name: c.metadata.symbolName || "block",
                type: c.metadata.symbolType || "code",
                startLine: c.metadata.startLine,
                endLine: c.metadata.endLine,
            }));
            return {
                filePath: fileData.filePath,
                symbols,
            };
        }
        catch {
            return {
                filePath: fileData.filePath,
                symbols: [],
            };
        }
    }
    /**
     * Lists directory structure or file hierarchy in the repository.
     */
    async listDirectory(options) {
        const { repositoryId, projectId, dirPath = "" } = options;
        const db = await getMongoDb();
        if (!db)
            return [];
        const collection = db.collection("raw_files");
        const filter = {};
        if (repositoryId)
            filter.repository_id = repositoryId;
        if (projectId)
            filter.project_id = projectId;
        if (dirPath) {
            filter.path = { $regex: `^${dirPath.replace(/\/$/, "")}/`, $options: "i" };
        }
        const docs = await collection.find(filter).project({ path: 1 }).toArray();
        return docs.map((d) => d.path);
    }
}
export const codeExplorerService = new CodeExplorerService();
