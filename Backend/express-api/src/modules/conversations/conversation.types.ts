export interface Conversation {
  id: string;
  projectId: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
}

export interface CreateConversationInput {
  projectId: string;
  title?: string;
}

export interface SendMessageInput {
  content: string;
  repositoryId?: string; // (Optional) Scope search to specific repository
}

export interface AgentResponse {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  agentRunId?: string;
  stepsExecuted?: number;
  sourcesUsed?: Array<{
    filePath?: string;
    similarity?: number;
    symbolName?: string;
  }>;
}