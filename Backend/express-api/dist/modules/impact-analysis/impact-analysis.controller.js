import { ApiResponse } from "../../utils/ApiResponse.js";
import { impactAnalysisService } from "./impact-analysis.service.js";
export async function analyzeImpact(req, res, next) {
    try {
        const result = await impactAnalysisService.analyze(req.token, req.body);
        return res.status(200).json(new ApiResponse(200, result, "Impact analysis completed"));
    }
    catch (error) {
        next(error);
    }
}
