import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import * as userController from "./user.controller.js";
import { updateProfileSchema } from "./user.validation.js";
const router = Router();
// Require authentication for all user endpoints
router.use(requireAuth);
/**
 * GET /api/v1/users/me - Get current user profile
 */
router.get("/me", userController.getMe);
/**
 * PATCH /api/v1/users/me - Update current user profile
 */
router.patch("/me", validateRequest({ body: updateProfileSchema }), userController.updateMe);
export default router;
