import path from "path";
import { githubClient } from "../github/github.client.js";
import { ingestionRepository } from "./ingestion.repository.js";
import { defaultIngestionFilter } from "./ingestion.filter.js";
import { staticIndexerService } from "../code-intelligence/static-indexer.service.js";
/**
 * High-Speed Repository Ingestion Worker
 * Fetches repository file trees, filters out secrets & lockfiles, and persists
 * clean source files directly into MongoDB and PostgreSQL metadata in seconds.
 */
export class IngestionWorker {
    repository;
    filter;
    constructor(repository = ingestionRepository, filter = defaultIngestionFilter) {
        this.repository = repository;
        this.filter = filter;
    }
    /**
     * Main entry point for executing an ingestion sync job in the background.
     */
    async runJob(context) {
        const { jobId, repositoryId, projectId, owner, repo, defaultBranch, userToken, customGithubToken, } = context;
        console.log(`[IngestionWorker] Starting fast sync for job ${jobId} (${owner}/${repo})...`);
        try {
            // 1. Mark job as running
            await this.repository.updateJob(userToken, jobId, {
                status: "running",
                started_at: new Date().toISOString(),
                progress: 10,
            });
            // 2. Fetch repository git tree recursively from GitHub REST API
            const treeResponse = await githubClient.fetchRepoTree(owner, repo, defaultBranch || "HEAD", customGithubToken);
            const allItems = treeResponse.tree || [];
            // 3. Filter items using ignore policy (exclude lockfiles, binaries, secrets)
            const validFiles = allItems.filter((item) => item.type === "blob" && this.filter.shouldIngestFile(item.path, item.size));
            console.log(`[IngestionWorker] Job ${jobId}: Tree fetched (${allItems.length} items). Ingesting ${validFiles.length} clean source files.`);
            await this.repository.updateJob(userToken, jobId, { progress: 20 });
            if (validFiles.length === 0) {
                await this.repository.updateJob(userToken, jobId, {
                    status: "completed",
                    progress: 100,
                    completed_at: new Date().toISOString(),
                });
                await this.repository.updateRepositoryLastSynced(userToken, repositoryId);
                return;
            }
            // 4. Fetch and store clean source files
            let processedCount = 0;
            for (const fileItem of validFiles) {
                try {
                    const fileContentRes = await githubClient.fetchFileContent(owner, repo, fileItem.path, defaultBranch || "HEAD", customGithubToken);
                    let decodedContent = "";
                    if (fileContentRes.content) {
                        decodedContent =
                            fileContentRes.encoding === "base64"
                                ? Buffer.from(fileContentRes.content, "base64").toString("utf-8")
                                : fileContentRes.content;
                    }
                    const filename = path.posix.basename(fileItem.path);
                    const ext = path.posix.extname(filename).replace(/^\./, "");
                    // Static indexing is deliberately cheap: it extracts evidence but does
                    // not generate vectors or call an AI service during repository sync.
                    const analysis = await staticIndexerService.analyzeFile(decodedContent, fileItem.path);
                    // A. Store raw file content in MongoDB (cached for On-Demand Code Explorer)
                    const rawDoc = {
                        repository_id: repositoryId,
                        project_id: projectId,
                        path: fileItem.path,
                        filename,
                        extension: ext,
                        size: fileItem.size || decodedContent.length,
                        content: decodedContent,
                        sha: fileItem.sha,
                        mime_type: "text/plain",
                        created_at: new Date(),
                        updated_at: new Date(),
                        analysis,
                    };
                    await this.repository.storeRawFile(rawDoc);
                    // B. Record file metadata in PostgreSQL knowledge_documents
                    await this.repository.upsertKnowledgeDocument(userToken, {
                        projectId,
                        repositoryId,
                        title: fileItem.path,
                        sourceUri: fileItem.path,
                        mimeType: "text/plain",
                        contentHash: fileItem.sha,
                    });
                    processedCount++;
                    // Progress updates
                    const progressPercent = Math.min(95, Math.floor(20 + (processedCount / validFiles.length) * 75));
                    if (processedCount % 10 === 0 || processedCount === validFiles.length) {
                        await this.repository.updateJob(userToken, jobId, {
                            progress: progressPercent,
                        });
                    }
                }
                catch (fileError) {
                    console.warn(`[IngestionWorker] Notice on file '${fileItem.path}' in job ${jobId}: ${fileError.message}`);
                }
            }
            // 5. Complete job successfully
            await this.repository.updateJob(userToken, jobId, {
                status: "completed",
                progress: 100,
                completed_at: new Date().toISOString(),
                error: null,
            });
            // Update repositories.last_synced_at timestamp
            await this.repository.updateRepositoryLastSynced(userToken, repositoryId);
            console.log(`\x1b[32m✓ [IngestionWorker] Job ${jobId} completed successfully! Cached ${processedCount} files in MongoDB.\x1b[0m`);
        }
        catch (error) {
            console.error(`[IngestionWorker] Job ${jobId} failed:`, error.message);
            await this.repository
                .updateJob(userToken, jobId, {
                status: "failed",
                error: error.message || "Unknown error during ingestion",
                completed_at: new Date().toISOString(),
            })
                .catch(() => { });
        }
    }
}
export const ingestionWorker = new IngestionWorker();
