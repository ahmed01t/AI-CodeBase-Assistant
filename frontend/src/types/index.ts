export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Repository {
  id: string;
  projectId: string;
  provider: "github" | "gitlab" | "manual";
  externalId?: string;
  owner: string;
  name: string;
  url: string;
  defaultBranch?: string;
  status?: "pending" | "synced" | "syncing" | "failed";
  lastSyncedAt?: string;
  totalChunks?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  sourcesUsed?: Array<{
    filePath?: string;
    similarity?: number;
    symbolName?: string;
  }>;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AgentStreamEvent =
  | { type: "run_started"; data: { agentRunId: string; conversationId: string } }
  | { type: "tool_call"; data: { tool: string; query: string } }
  | {
      type: "tool_result";
      data: {
        tool: string;
        totalMatches: number;
        sources: Array<{ filePath?: string; similarity?: number; symbolName?: string }>;
      };
    }
  | { type: "text_chunk"; data: { text: string } }
  | {
      type: "done";
      data: {
        userMessage: Message;
        assistantMessage: Message;
        agentRunId: string;
        sourcesUsed: Array<{ filePath?: string; similarity?: number; symbolName?: string }>;
      };
    }
  | { type: "error"; data: { error: string } };

export interface SearchResultChunk {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata?: {
    filePath?: string;
    startLine?: number;
    endLine?: number;
    symbolName?: string;
    symbolType?: string;
    language?: string;
  };
}

