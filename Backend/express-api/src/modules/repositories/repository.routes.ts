import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import * as repositoryController from "./repository.controller.js";
import * as ingestionController from "../ingestion/ingestion.controller.js";
import {
  createRepositorySchema,
  repositoryParamSchema,
  listRepositoriesQuerySchema,
} from "./repository.validation.js";

// mergeParams: true allows capturing :projectId if mounted as a sub-router
const router = Router({ mergeParams: true });

// Require authentication for all repository endpoints
router.use(requireAuth);

/**
 * POST /api/v1/repositories - Create repository record for a project
 */
router.post(
  "/",
  validateRequest({ body: createRepositorySchema }),
  repositoryController.createRepository
);

/**
 * GET /api/v1/repositories - List repositories (supports optional ?project_id=... query parameter)
 */
router.get(
  "/",
  validateRequest({ query: listRepositoriesQuerySchema }),
  repositoryController.listRepositories
);

/**
 * GET /api/v1/repositories/sync/jobs/:jobId - Get ingestion job status & progress
 */
router.get("/sync/jobs/:jobId", ingestionController.getJobStatus);

/**
 * POST /api/v1/repositories/:repositoryId/sync or /:id/sync - Trigger background repository synchronization
 */
router.post("/:repositoryId/sync", ingestionController.syncRepository);
router.post("/:id/sync", ingestionController.syncRepository);

/**
 * GET /api/v1/repositories/:id - Get a repository by ID
 */
router.get(
  "/:id",
  validateRequest({ params: repositoryParamSchema }),
  repositoryController.getRepository
);

/**
 * DELETE /api/v1/repositories/:id - Delete a repository by ID
 */
router.delete(
  "/:id",
  validateRequest({ params: repositoryParamSchema }),
  repositoryController.deleteRepository
);

export default router;
