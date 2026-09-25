export interface ImpactAnalysisInput {
  repositoryId: string;
  target: string;
}

export type EvidenceKind = "definition" | "caller" | "import" | "route" | "test" | "database";

export interface ImpactEvidence {
  kind: EvidenceKind;
  filePath: string;
  startLine: number;
  endLine: number;
  message: string;
  revision: string;
}

export interface ImpactAnalysisResult {
  target: string;
  repositoryId: string;
  risk: "low" | "medium" | "high";
  confidence: "verified" | "partial" | "unknown";
  summary: string;
  evidence: ImpactEvidence[];
  affectedFiles: string[];
  verificationChecklist: string[];
  indexedFiles: number;
}
