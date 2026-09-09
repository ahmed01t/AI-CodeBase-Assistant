import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import * as organizationController from "./organization.controller.js";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationParamSchema,
} from "./organization.validation.js";
import organizationMemberRouter from "../organization-members/organization-member.routes.js";

const router = Router();

// Require authentication for all organization routes
router.use(requireAuth);

// Sub-router for Organization Members endpoints (/api/v1/organizations/:organizationId/members)
router.use("/:organizationId/members", organizationMemberRouter);

/**
 * POST /api/v1/organizations - Create a new organization
 */
router.post(
  "/",
  validateRequest({ body: createOrganizationSchema }),
  organizationController.createOrganization
);

/**
 * GET /api/v1/organizations - List all organizations accessible to the user
 */
router.get(
  "/",
  organizationController.listOrganizations
);

/**
 * GET /api/v1/organizations/:id - Get a single organization by ID
 */
router.get(
  "/:id",
  validateRequest({ params: organizationParamSchema }),
  organizationController.getOrganization
);

/**
 * PATCH /api/v1/organizations/:id - Update an organization by ID
 */
router.patch(
  "/:id",
  validateRequest({
    params: organizationParamSchema,
    body: updateOrganizationSchema,
  }),
  organizationController.updateOrganization
);

/**
 * DELETE /api/v1/organizations/:id - Delete an organization by ID
 */
router.delete(
  "/:id",
  validateRequest({ params: organizationParamSchema }),
  organizationController.deleteOrganization
);

export default router;