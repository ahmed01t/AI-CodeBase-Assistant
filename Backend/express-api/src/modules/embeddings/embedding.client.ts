import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { EmbeddingVector } from "./embeddings.types.js";

export class EmbeddingClient {
  private ai: GoogleGenAI;
  public readonly modelName: string;

  constructor() {
    // 1. Get the Gemini API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError(500, "GEMINI_API_KEY is not configured in environment variables");
    }

    // 2. Initialize the official Google GenAI client
    this.ai = new GoogleGenAI({ apiKey });

    // 3. Google's standard embedding model
    this.modelName = "gemini-embedding-001";
  }

  /**
   * Generates an embedding vector for a single piece of text.
   * Perfect for embedding user questions during semantic search.
   */
  public async embedQuery(text: string): Promise<EmbeddingVector> {
    try {
      const response = await this.ai.models.embedContent({
        model: this.modelName,
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      const values = response.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new ApiError(502, "Gemini API returned an empty embedding vector");
      }

      return {
        values,
        dimension: values.length, // 768 dimensions
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Failed to generate embedding from Gemini: ${error.message}`);
    }
  }

  /**
   * Generates embedding vectors for multiple chunks in batch.
   * Efficiently embeds many code chunks with minimal API calls.
   */
  public async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    if (texts.length === 0) return [];

    try {
      // 1 single HTTP request containing all texts in the array!
      const response = await this.ai.models.embedContent({
        model: this.modelName,
        contents: texts,
        config: {
          outputDimensionality: 768,
        },
      });

      const embeddings = response.embeddings;
      if (!embeddings || embeddings.length === 0) {
        throw new ApiError(502, "Gemini API returned empty batch embeddings");
      }

      return embeddings.map((emb) => {
        const values = emb.values || [];
        return {
          values,
          dimension: values.length,
        };
      });
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Batch embedding failed: ${error.message}`);
    }
  }
}

export const embeddingClient = new EmbeddingClient();