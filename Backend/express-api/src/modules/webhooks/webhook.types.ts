export interface GitHubCommitAuthor {
  name: string;
  email: string;
  username?: string;
}

export interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  url: string;
  author: GitHubCommitAuthor;
  added: string[];
  modified: string[];
  removed: string[];
}

export interface GitHubRepositoryPayload {
  id: number;
  name: string;
  full_name: string; // e.g. "facebook/react"
  html_url: string;
  default_branch: string;
  owner: {
    name?: string;
    login: string;
  };
}

export interface GitHubPushWebhookPayload {
  ref: string; // e.g. "refs/heads/main"
  before: string;
  after: string;
  repository: GitHubRepositoryPayload;
  pusher: {
    name: string;
    email: string;
  };
  sender: {
    login: string;
    id: number;
  };
  commits: GitHubCommit[];
  head_commit: GitHubCommit | null;
}

export interface WebhookEventRecord {
  id: string;
  repositoryId: string | null;
  provider: "github";
  eventType: string;
  externalId: string | null; // GitHub X-GitHub-Delivery header
  payloadReference: string | null;
  status: "received" | "processing" | "processed" | "failed";
  receivedAt: string;
  processedAt?: string;
  error?: string;
}

export interface IncrementalSyncResult {
  repositoryId: string;
  filesAdded: number;
  filesModified: number;
  filesRemoved: number;
  totalChunksUpdated: number;
}

