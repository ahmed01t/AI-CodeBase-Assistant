import path from "path";
import { githubClient } from "../github/github.client.js";
import { ingestionRepository, IngestionRepository } from "./ingestion.repository.js";
import { defaultIngestionFilter, IngestionFilter } from "./ingestion.filter.js";
import type { IngestionTaskContext, RawFileDocument } from "./ingestion.types.js";

/**
 * Background Ingestion Worker
 * Executes repository tree retrieval, filtering, content fetching, and persistence
 * completely outside the HTTP request/response lifecycle.
 */
export class IngestionWorker {
  constructor(
    private repository: IngestionRepository = ingestionRepository,
    private filter: IngestionFilter = defaultIngestionFilter
  ) {}

  /**
   * Main entry point for executing a queued ingestion job in the background.
   */
  async runJob(context: IngestionTaskContext): Promise<void> {
    const {
      jobId,
      repositoryId,
      projectId,
      owner,
      repo,
      defaultBranch,
      userToken,
      customGithubToken,
    } = context;

    console.log(`[IngestionWorker] Starting background sync for job ${jobId} (${owner}/${repo})...`);

    try {
      // 1. Mark job as running
      await this.repository.updateJob(userToken, jobId, {
        status: "running",
        started_at: new Date().toISOString(),
        progress: 5,
      });

      // 2. Fetch repository git tree recursively from GitHub REST API
      const treeResponse = await githubClient.fetchRepoTree(
        owner,
        repo,
        defaultBranch,
        customGithubToken
      );

      const allItems = treeResponse.tree || [];

      // 3. Filter items using ignore policy (exclude blobs, directories, secrets, binaries)
      const validFiles = allItems.filter(
        (item) => item.type === "blob" && this.filter.shouldIngestFile(item.path, item.size)
      );

      console.log(
        `[IngestionWorker] Job ${jobId}: Tree fetched (${allItems.length} items). Identified ${validFiles.length} valid files to ingest.`
      );

      await this.repository.updateJob(userToken, jobId, { progress: 15 });

      if (validFiles.length === 0) {
        // No valid files to process
        await this.repository.updateJob(userToken, jobId, {
          status: "completed",
          progress: 100,
          completed_at: new Date().toISOString(),
        });
        await this.repository.updateRepositoryLastSynced(userToken, repositoryId);
        return;
      }

      // 4. Process valid files sequentially with progress tracking
      let processedCount = 0;

      for (const fileItem of validFiles) {
        try {
          const fileContentRes = await githubClient.fetchFileContent(
            owner,
            repo,
            fileItem.path,
            defaultBranch,
            customGithubToken
          );

          let decodedContent = "";
          if (fileContentRes.content) {
            decodedContent =
              fileContentRes.encoding === "base64"
                ? Buffer.from(fileContentRes.content, "base64").toString("utf-8")
                : fileContentRes.content;
          }

          const filename = path.basename(fileItem.path);
          const ext = path.extname(filename).replace(/^\./, "");

          // A. Store raw file content in MongoDB
          const rawDoc: RawFileDocument = {
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
          };

          await this.repository.storeRawFile(rawDoc);

          // B. Store file metadata in PostgreSQL knowledge_documents
          await this.repository.upsertKnowledgeDocument(userToken, {
            projectId,
            repositoryId,
            title: fileItem.path,
            sourceUri: fileItem.path,
            mimeType: "text/plain",
            contentHash: fileItem.sha,
          });

          processedCount++;

          // Periodically update progress (scale 15% -> 95%)
          const progressPercent = Math.min(
            95,
            Math.floor(15 + (processedCount / validFiles.length) * 80)
          );

          if (processedCount % 5 === 0 || processedCount === validFiles.length) {
            await this.repository.updateJob(userToken, jobId, {
              progress: progressPercent,
            });
          }
        } catch (fileError: any) {
          console.warn(
            `[IngestionWorker] Partial warning on file '${fileItem.path}' in job ${jobId}: ${fileError.message}`
          );
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

      console.log(
        `[IngestionWorker] Job ${jobId} completed successfully! Synced ${processedCount} files.`
      );
    } catch (error: any) {
      console.error(`[IngestionWorker] Job ${jobId} failed:`, error.message);

      await this.repository
        .updateJob(userToken, jobId, {
          status: "failed",
          error: error.message || "Unknown error during ingestion",
          completed_at: new Date().toISOString(),
        })
        .catch(() => {});
    }
  }
}

export const ingestionWorker = new IngestionWorker();

