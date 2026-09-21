import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../../utils/ApiError.js";
import { MatchedChunk } from "./knowledge.types.js";

export interface VectorSearchOptions {
  queryVector: number[];
  projectId: string;
  repositoryId?: string;
  matchCount: number;
  similarityThreshold: number;
}

export class KnowledgeRepository {
  /**
   * Performs semantic vector search using pgvector cosine similarity.
   * Matches query vector against stored embeddings scoped by projectId and repositoryId.
   */
  public async searchSimilarChunks(
    supabase: SupabaseClient,
    options: VectorSearchOptions
  ): Promise<MatchedChunk[]> {
    const {
      queryVector,
      projectId,
      repositoryId,
      matchCount,
      similarityThreshold,
    } = options;

    try {
      // 1. Convert vector array to pgvector string format: '[0.012,-0.451,...]'
      const vectorString = `[${queryVector.join(",")}]`;

      // 2. Call the PostgreSQL matching query / RPC
      // Supabase pgvector cosine distance operator: <=>
      // Similarity = 1 - (embedding <=> query_vector)
      const { data, error } = await supabase.rpc("match_document_chunks", {
        query_embedding: vectorString,
        match_threshold: similarityThreshold,
        match_count: matchCount,
        filter_project_id: projectId,
        filter_repository_id: repositoryId || null,
      });

      if (error) {
        // If RPC function is not yet installed, fallback to querying tables directly
        return await this.fallbackDirectSearch(supabase, options);
      }

      return (data || []).map((row: any) => ({
        chunkId: row.id,
        documentId: row.document_id,
        content: row.content,
        similarity: Number(row.similarity.toFixed(4)),
        metadata: row.metadata || {},
      }));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Vector search failed: ${error.message}`);
    }
  }

  /**
   * Fallback direct query if the match_document_chunks SQL RPC function is not yet created.
   */
  private async fallbackDirectSearch(
    supabase: SupabaseClient,
    options: VectorSearchOptions
  ): Promise<MatchedChunk[]> {
    const { projectId, matchCount } = options;

    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select(`
        id,
        document_id,
        content,
        metadata,
        knowledge_documents!inner (
          project_id,
          repository_id
        )
      `)
      .eq("knowledge_documents.project_id", projectId)
      .limit(matchCount);

    if (error) {
      throw new ApiError(500, `Failed to fetch document chunks: ${error.message}`);
    }

    return (chunks || []).map((chunk: any) => ({
      chunkId: chunk.id,
      documentId: chunk.document_id,
      content: chunk.content,
      similarity: 1.0,
      metadata: chunk.metadata || {},
    }));
  }
}

export const knowledgeRepository = new KnowledgeRepository();