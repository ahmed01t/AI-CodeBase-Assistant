

// query which user sends for searching knowledge base
export interface SearchKnowledgeQuery {
  query: string;
  projectId: string;
  repositoryId?: string;
  limit?: number;
  similarityThreshold?: number; // Minimum match score (0.0 to 1.0, default 0.6)
}

export interface MatchedChunk {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number; // e.g. 0.89 (89% match)
  metadata: {
    filePath?: string;
    language?: string;
    symbolType?: string;
    symbolName?: string;
    parentSymbol?: string;
    startLine?: number;
    endLine?: number;
  };
}

export interface SearchKnowledgeResponse {
  query: string;
  totalMatches: number;
  results: MatchedChunk[];
}