/**
 * Model representing an ingestion_jobs record in PostgreSQL
 */
export interface IngestionJob {
  id: string;
  repository_id: string;
  job_type: "repository_sync" | "repository_index" | "incremental_index";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  created_at: string;
}

/**
 * MongoDB document structure for raw repository file contents
 */
export interface RawFileDocument {
  repository_id: string;
  project_id: string;
  path: string;
  filename: string;
  extension: string;
  size: number;
  content: string;
  sha: string;
  mime_type: string;
  created_at: Date;
  updated_at: Date;
  /** Lightweight, revision-aware static evidence. This intentionally contains no embeddings. */
  analysis?: StaticFileAnalysis;
}

export interface StaticEvidenceLocation {
  startLine: number;
  endLine: number;
}

export interface StaticSymbolEvidence extends StaticEvidenceLocation {
  name: string;
  kind: "class" | "function" | "method" | "interface" | "type" | "enum";
  qualifiedName?: string;
}

export interface StaticImportEvidence extends StaticEvidenceLocation {
  source: string;
  importedSymbols: string[];
}

export interface StaticRouteEvidence extends StaticEvidenceLocation {
  method: string;
  path: string;
}

export interface StaticDatabaseEvidence extends StaticEvidenceLocation {
  reference: string;
}

/**
 * Small, searchable code facts extracted during ingestion. The raw source remains
 * in MongoDB; this metadata lets impact analysis work without vector generation.
 */
export interface StaticFileAnalysis {
  indexedAt: string;
  parserVersion: number;
  language: string;
  parseSucceeded: boolean;
  symbols: StaticSymbolEvidence[];
  imports: StaticImportEvidence[];
  routes: StaticRouteEvidence[];
  databaseReferences: StaticDatabaseEvidence[];
  isTestFile: boolean;
}

/**
 * Options for file filter policy during ingestion
 */
export interface FilterPolicyOptions {
  maxSizeBytes?: number; // Default 500 KB (512,000 bytes)
  customIgnorePatterns?: string[];
}

/**
 * Task context for launching the background ingestion worker
 */
export interface IngestionTaskContext {
  jobId: string;
  repositoryId: string;
  projectId: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  userToken: string;
  customGithubToken?: string;
}
