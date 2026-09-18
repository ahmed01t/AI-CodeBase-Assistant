export interface ChunkMetadata {
  filePath: string;
  language: string;
  symbolType: "import" | "class" | "method" | "function" | "typeDeclaration" | "block" | "text";
  symbolName?: string;
  parentSymbol?: string;
  startLine: number;
  endLine: number;
}

export interface CodeChunk {
  chunkIndex: number;
  content: string;
  startLine: number;
  endLine: number;
  tokenEstimate: number;
  metadata: ChunkMetadata;
}

export interface ChunkOptions {
  code: string;
  filePath: string;
  language?: "typescript" | "tsx" | "javascript" | "python";
  maxLinesPerChunk?: number;
  overlapLines?: number;
}

export interface ChunkFileResult {
  filePath: string;
  language: string;
  totalChunks: number;
  chunks: CodeChunk[];
}

