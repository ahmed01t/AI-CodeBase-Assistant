import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import * as projectController from "./project.controller.js";
import {
  createProjectSchema,
  updateProjectSchema,
  projectParamSchema,
  listProjectsQuerySchema,
} from "./project.validation.js";

const router = Router();

// Require authentication for all project routes
router.use(requireAuth);

/**
 * POST /api/v1/projects - Create a new project inside an organization
 */
router.post(
  "/",
  validateRequest({ body: createProjectSchema }),
  projectController.createProject
);

/**
 * GET /api/v1/projects - List all projects accessible to the user (optional ?organization_id= filter)
 */
router.get(
  "/",
  validateRequest({ query: listProjectsQuerySchema }),
  projectController.listProjects
);

/**
 * GET /api/v1/projects/:id - Get a single project by ID
 */
router.get(
  "/:id",
  validateRequest({ params: projectParamSchema }),projectController.getProject
);

/**
 * PATCH /api/v1/projects/:id - Update a project by ID
 */
router.patch(
  "/:id",
  validateRequest({
    params: projectParamSchema,
    body: updateProjectSchema,
  }),
  projectController.updateProject
);

/**
 * DELETE /api/v1/projects/:id - Delete a project by ID
 */
router.delete(
  "/:id",
  validateRequest({ params: projectParamSchema }),
  projectController.deleteProject
);

export default router;

