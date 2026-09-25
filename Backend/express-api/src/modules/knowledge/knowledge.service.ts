import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../../utils/ApiError.js";
import { codeExplorerService } from "../code-explorer/code-explorer.service.js";
import {
  SearchKnowledgeQuery,
  SearchKnowledgeResponse,
} from "./knowledge.types.js";

export class KnowledgeService {
  /**
   * Performs low-load evidence search over the synchronized source cache.
   * Vector search is deliberately not part of the default path: repositories
   * can be useful immediately without generating a large embedding corpus.
   */
  public async searchCodebase(
    supabase: SupabaseClient,
    searchQuery: SearchKnowledgeQuery
  ): Promise<SearchKnowledgeResponse> {
    const { query, projectId, repositoryId, limit = 5 } = searchQuery;

    if (!query || query.trim() === "") {
      throw new ApiError(400, "Search query text is required");
    }

    if (!projectId) {
      throw new ApiError(400, "projectId is required for knowledge search");
    }

    const matches = await codeExplorerService.searchCodebase({
      projectId,
      repositoryId,
      query,
      limit,
    });

    const matchedChunks = matches.results.map((match) => ({
      chunkId: `${match.filePath}:${match.startLine}`,
      documentId: match.filePath,
      content: match.snippet,
      // Score is lexical evidence strength, not a vector similarity percentage.
      similarity: Math.min(1, match.score / 10),
      metadata: {
        filePath: match.filePath,
        filename: match.filename,
        symbolName: match.symbolName,
        startLine: match.startLine,
        endLine: match.endLine,
        retrieval: "lexical_evidence",
      },
    }));

    return {
      query: query.trim(),
      totalMatches: matchedChunks.length,
      results: matchedChunks,
    };
  }
}

export const knowledgeService = new KnowledgeService();
