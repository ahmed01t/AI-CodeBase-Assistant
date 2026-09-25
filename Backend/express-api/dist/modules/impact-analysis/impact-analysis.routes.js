import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import { analyzeImpact } from "./impact-analysis.controller.js";
import { impactAnalysisSchema } from "./impact-analysis.validation.js";
const router = Router();
router.use(requireAuth);
router.post("/", validateRequest({ body: impactAnalysisSchema }), analyzeImpact);
export default router;
