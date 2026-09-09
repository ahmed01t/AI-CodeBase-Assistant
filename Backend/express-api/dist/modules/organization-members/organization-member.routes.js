import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import * as memberController from "./organization-member.controller.js";
import { addMemberSchema, updateMemberRoleSchema, organizationMemberParamSchema, } from "./organization-member.validation.js";
// mergeParams: true allows accessing :organizationId from the parent router
const router = Router({ mergeParams: true });
// Require authentication for all member routes
router.use(requireAuth);
/**
 * GET /api/v1/organizations/:organizationId/members - List members
 */
router.get("/", validateRequest({ params: organizationMemberParamSchema }), memberController.listMembers);
/**
 * POST /api/v1/organizations/:organizationId/members - Add member
 */
router.post("/", validateRequest({
    params: organizationMemberParamSchema,
    body: addMemberSchema,
}), memberController.addMember);
/**
 * PATCH /api/v1/organizations/:organizationId/members/:userId - Update member role
 */
router.patch("/:userId", validateRequest({
    params: organizationMemberParamSchema,
    body: updateMemberRoleSchema,
}), memberController.updateMemberRole);
/**
 * DELETE /api/v1/organizations/:organizationId/members/:userId - Remove member
 */
router.delete("/:userId", validateRequest({ params: organizationMemberParamSchema }), memberController.removeMember);
export default router;
