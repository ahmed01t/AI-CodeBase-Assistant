import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as ingestionController from "./ingestion.controller.js";

const router = Router({ mergeParams: true });

// Require authentication for all ingestion routes
router.use(requireAuth);

/**
 * Trigger background repository synchronization
 * Supports all client URL variations:
 * - POST /api/v1/ingestion/sync/:repositoryId
 * - POST /api/v1/ingestion/sync/:id
 * - POST /api/v1/ingestion/:repositoryId/sync
 * - POST /api/v1/ingestion/:id/sync
 */
router.post("/sync/:repositoryId", ingestionController.syncRepository);
router.post("/sync/:id", ingestionController.syncRepository);
router.post("/:repositoryId/sync", ingestionController.syncRepository);
router.post("/:id/sync", ingestionController.syncRepository);

/**
 * Ingestion Job Status & Progress Polling
 */
router.get("/sync/jobs/:jobId", ingestionController.getJobStatus);
router.get("/jobs/:jobId", ingestionController.getJobStatus);
router.get("/:jobId/status", ingestionController.getJobStatus);

export default router;
