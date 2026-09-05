import { ingestionService } from "./ingestion.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
/**
 * Ingestion Controller
 * Handles HTTP requests for triggering repository synchronization and polling ingestion jobs.
 */
/**
 * Handles POST /api/v1/repositories/:repositoryId/sync (Trigger Background Ingestion Sync)
 */
export async function syncRepository(req, res, next) {
    try {
        const token = req.token;
        const userId = req.userId;
        const repositoryId = (req.params.repositoryId || req.params.id);
        const customGithubToken = req.headers["x-github-token"];
        const job = await ingestionService.triggerSync(token, userId, repositoryId, customGithubToken);
        // Return 202 Accepted immediately without blocking HTTP connection
        return res
            .status(202)
            .json(new ApiResponse(202, job, "Repository sync job queued successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles GET /api/v1/repositories/sync/jobs/:jobId (Get Ingestion Job Status & Progress)
 */
export async function getJobStatus(req, res, next) {
    try {
        const token = req.token;
        const jobId = req.params.jobId;
        const job = await ingestionService.getJobStatus(token, jobId);
        return res
            .status(200)
            .json(new ApiResponse(200, job, "Ingestion job status retrieved successfully"));
    }
    catch (error) {
        next(error);
    }
}
