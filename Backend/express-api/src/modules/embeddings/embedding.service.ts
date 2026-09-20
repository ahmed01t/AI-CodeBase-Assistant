import { SupabaseClient } from "@supabase/supabase-js";
import { CodeChunk } from "../code-chunker/code-chunker.types.js";
import { ApiError } from "../../utils/ApiError.js";
import { embeddingClient } from "./embedding.client.js";
import { EmbeddedChunkResult, EmbeddingVector } from "./embeddings.types.js";

export class EmbeddingService {
  /**
   * Embeds a search query string (e.g. user question) for vector retrieval.
   */
  public async embedQuery(query: string): Promise<EmbeddingVector> {
    if (!query || query.trim() === "") {
      throw new ApiError(400, "Search query cannot be empty");
    }
    return await embeddingClient.embedQuery(query.trim());
  }

  /**
   * Takes an array of CodeChunks from code-chunker, generates embeddings via Gemini,
   * and persists both document_chunks and embeddings into PostgreSQL.
   */
  public async processAndStoreChunks(
    documentId: string,
    chunks: CodeChunk[],
    supabase: SupabaseClient
  ): Promise<EmbeddedChunkResult[]> {
    if (chunks.length === 0) return [];

    try {
      // 1. Extract content strings from chunks
      const contents = chunks.map((c) => c.content);

      // 2. Generate vector embeddings from Gemini in batch
      const vectors = await embeddingClient.embedBatch(contents);

      const results: EmbeddedChunkResult[] = [];

      // 3. Process each chunk and save to PostgreSQL
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vector = vectors[i];

        // A. Insert into public.document_chunks
        const { data: chunkRecord, error: chunkError } = await supabase
          .from("document_chunks")
          .insert({
            document_id: documentId,
            content: chunk.content,
            chunk_index: chunk.chunkIndex,
            token_count: chunk.tokenEstimate,
            metadata: chunk.metadata,
          })
          .select("id")
          .single();

        if (chunkError || !chunkRecord) {
          throw new ApiError(500, `Failed to store document chunk: ${chunkError?.message}`);
        }

        // B. Insert vector into public.embeddings (pgvector)
        const { error: embeddingError } = await supabase
          .from("embeddings")
          .insert({
            chunk_id: chunkRecord.id,
            model: embeddingClient.modelName,
            embedding: vector.values,
          });

        if (embeddingError) {
          throw new ApiError(500, `Failed to store embedding vector: ${embeddingError?.message}`);
        }

        results.push({
          chunkId: chunkRecord.id,
          documentId,
          content: chunk.content,
          embedding: vector.values,
          model: embeddingClient.modelName,
          metadata: chunk.metadata,
        });
      }

      return results;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Embedding storage process failed: ${error.message}`);
    }
  }
}

export const embeddingService = new EmbeddingService();