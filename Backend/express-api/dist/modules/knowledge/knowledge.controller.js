import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { knowledgeService } from "./knowledge.service.js";
/**
 * Handles POST /api/v1/knowledge/search
 * Semantically searches code chunks in a project using vector similarity.
 */
export async function searchKnowledge(req, res, next) {
    try {
        const token = req.token;
        const supabase = getAuthenticatedSupabaseClient(token);
        const searchQuery = req.body;
        const results = await knowledgeService.searchCodebase(supabase, searchQuery);
        return res
            .status(200)
            .json(new ApiResponse(200, results, "Codebase search completed successfully"));
    }
    catch (error) {
        next(error);
    }
}
