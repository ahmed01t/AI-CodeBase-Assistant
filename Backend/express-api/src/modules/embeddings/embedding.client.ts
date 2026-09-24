import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { EmbeddingVector } from "./embeddings.types.js";

export class EmbeddingClient {
  private baseUrl: string;
  public readonly modelName: string;

  constructor() {
    this.baseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, "");
    this.modelName = env.OLLAMA_EMBEDDING_MODEL;
  }

  /**
   * Generates an embedding vector for a single piece of text using local Ollama.
   */
  public async embedQuery(text: string): Promise<EmbeddingVector> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          input: text,
        }),
      });

      if (!response.ok) {
        // Fallback to /api/embeddings for legacy Ollama versions
        const fallbackRes = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.modelName,
            prompt: text,
          }),
        });

        if (!fallbackRes.ok) {
          const errorText = await fallbackRes.text();
          throw new Error(`Ollama embedding error (${fallbackRes.status}): ${errorText}`);
        }

        const data = (await fallbackRes.json()) as { embedding: number[] };
        const values = data.embedding || [];
        return {
          values,
          dimension: values.length,
        };
      }

      const data = (await response.json()) as { embeddings: number[][] };
      const values = data.embeddings?.[0] || [];

      if (!values || values.length === 0) {
        throw new ApiError(502, "Ollama returned an empty embedding vector");
      }

      return {
        values,
        dimension: values.length,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Failed to generate local Ollama embedding: ${error.message}`);
    }
  }

  /**
   * Generates embedding vectors for multiple chunks in batch using local Ollama.
   */
  public async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    if (texts.length === 0) return [];

    try {
      // Send batch directly to /api/embed
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          input: texts,
        }),
      });

      if (!response.ok) {
        // Fallback: embed sequentially via /api/embeddings
        const results: EmbeddingVector[] = [];
        for (const text of texts) {
          const vec = await this.embedQuery(text);
          results.push(vec);
        }
        return results;
      }

      const data = (await response.json()) as { embeddings: number[][] };
      const embeddings = data.embeddings || [];

      return embeddings.map((values) => ({
        values,
        dimension: values.length,
      }));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Local Ollama batch embedding failed: ${error.message}`);
    }
  }
}

export const embeddingClient = new EmbeddingClient();