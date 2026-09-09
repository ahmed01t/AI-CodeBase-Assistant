import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as ingestionController from "./ingestion.controller.js";
const router = Router({ mergeParams: true });
// Require authentication for all ingestion routes
router.use(requireAuth);
/**
 * POST /api/v1/repositories/:repositoryId/sync - Trigger background repository synchronization
 */
router.post("/:repositoryId/sync", ingestionController.syncRepository);
router.post("/:id/sync", ingestionController.syncRepository);
/**
 * GET /api/v1/repositories/sync/jobs/:jobId - Get job status and progress
 */
router.get("/sync/jobs/:jobId", ingestionController.getJobStatus);
export default router;
