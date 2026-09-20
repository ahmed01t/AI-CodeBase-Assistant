export interface EmbeddingVector {
  values: number[];
  dimension: number;
}

export interface EmbedTextRequest {
  text: string;
}

export interface EmbedBatchRequest {
  texts: string[];
}

export interface EmbedChunkInput {
  chunkId?: string;
  documentId?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface EmbeddedChunkResult {
  chunkId?: string;
  documentId?: string;
  content: string;
  embedding: number[];
  model: string;
  metadata?: Record<string, any>;
}