import type { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { impactAnalysisService } from "./impact-analysis.service.js";
import type { ImpactAnalysisSchema } from "./impact-analysis.validation.js";

export async function analyzeImpact(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await impactAnalysisService.analyze(req.token!, req.body as ImpactAnalysisSchema);
    return res.status(200).json(new ApiResponse(200, result, "Impact analysis completed"));
  } catch (error) {
    next(error);
  }
}
