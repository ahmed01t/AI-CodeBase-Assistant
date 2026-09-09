import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import * as githubController from "./github.controller.js";
import { githubRepoParamSchema } from "./github.validation.js";
const router = Router();
// Require authentication for all GitHub integration routes
router.use(requireAuth);
/**
 * GET /api/v1/github/repos/:owner/:repo - Fetch repository metadata from GitHub REST API
 */
router.get("/repos/:owner/:repo", validateRequest({ params: githubRepoParamSchema }), githubController.getRepoMetadata);
export default router;
