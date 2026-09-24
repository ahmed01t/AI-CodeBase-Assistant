import { embeddingService } from "../embeddings/embedding.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { knowledgeRepository } from "./knowledge.repository.js";
export class KnowledgeService {
    /**
     * Semantically searches the codebase by embedding the natural language query
     * and retrieving nearest code chunks via pgvector.
     */
    async searchCodebase(supabase, searchQuery) {
        const { query, projectId, repositoryId, limit = 5, similarityThreshold = 0.5, } = searchQuery;
        if (!query || query.trim() === "") {
            throw new ApiError(400, "Search query text is required");
        }
        if (!projectId) {
            throw new ApiError(400, "projectId is required for knowledge search");
        }
        // 1. Convert user's question to a vector via Gemini
        const queryEmbedding = await embeddingService.embedQuery(query);
        // 2. Perform vector search in PostgreSQL
        const matchedChunks = await knowledgeRepository.searchSimilarChunks(supabase, {
            queryVector: queryEmbedding.values,
            projectId,
            repositoryId,
            matchCount: limit,
            similarityThreshold,
        });
        return {
            query: query.trim(),
            totalMatches: matchedChunks.length,
            results: matchedChunks,
        };
    }
}
export const knowledgeService = new KnowledgeService();
