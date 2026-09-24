import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import { searchKnowledge } from "./knowledge.controller.js";
import { searchKnowledgeSchema } from "./knowledge.validation.js";
const router = Router();
// All knowledge endpoints require authentication
router.use(requireAuth);
/**
 * POST /api/v1/knowledge/search
 * Vector similarity search over project codebase
 */
router.post("/search", validateRequest({ body: searchKnowledgeSchema }), searchKnowledge);
export default router;
