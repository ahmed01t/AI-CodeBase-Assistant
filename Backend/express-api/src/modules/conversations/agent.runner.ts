import { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { codeExplorerService, CodeSearchMatch } from "../code-explorer/code-explorer.service.js";
import { Message, AgentStreamEvent } from "./conversation.types.js";

export interface AgentRunInput {
  supabase: SupabaseClient;
  projectId: string;
  repositoryId?: string;
  userQuestion: string;
  chatHistory: Message[];
}

export interface AgentRunOutput {
  answer: string;
  sourcesUsed: Array<{
    filePath?: string;
    similarity?: number;
    symbolName?: string;
    startLine?: number;
    endLine?: number;
  }>;
}

export interface AgentRunStreamInput extends AgentRunInput {
  onEvent: (event: AgentStreamEvent) => void | Promise<void>;
}

/**
 * On-Demand Agentic Codebase Assistant Runner
 * Explores repository code dynamically on user request, reads relevant files,
 * and streams accurate answers via local Ollama.
 */
export class AgentRunner {
  private baseUrl: string;
  private modelName: string;

  constructor() {
    this.baseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, "");
    this.modelName = env.OLLAMA_CHAT_MODEL;
  }

  /**
   * Constructs conversation messages for local Ollama /api/chat
   */
  private buildChatMessages(
    userQuestion: string,
    chatHistory: Message[],
    codeMatches: CodeSearchMatch[]
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // 1. System Prompt
    const systemPrompt = `You are an expert Senior Software Engineer analyzing a codebase.
The user provides actual code snippets extracted directly from the repository.
Your job is to carefully examine the provided code snippets and answer the user's question with 100% precision.
Always cite the exact files and lines provided.`;

    messages.push({ role: "system", content: systemPrompt });

    // 2. Chat history (last 6 turns)
    for (const msg of chatHistory.slice(-6)) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }

    // 3. Current user prompt with retrieved live codebase context
    let promptWithContext = "";

    if (codeMatches && codeMatches.length > 0) {
      const codeContext = codeMatches
        .map(
          (c, idx) =>
            `File: ${c.filePath} (lines ${c.startLine}-${c.endLine}):\n${c.snippet}`
        )
        .join("\n\n---\n\n");

      promptWithContext = `=== CODE SNIPPETS FROM REPOSITORY ===\n${codeContext}\n=====================================\n\nQUESTION: ${userQuestion}\n\nPlease analyze the code snippets above to answer the question thoroughly and accurately:`;
    } else {
      promptWithContext = `(Note: No matching code was found in the repository for this query)\n\nQUESTION: ${userQuestion}`;
    }

    messages.push({ role: "user", content: promptWithContext });

    return messages;
  }

  /**
   * Executes the AI Code Assistant agent synchronously using local Ollama.
   */
  public async runAgent(input: AgentRunInput): Promise<AgentRunOutput> {
    const { projectId, repositoryId, userQuestion, chatHistory } = input;
    const sourcesUsed: AgentRunOutput["sourcesUsed"] = [];

    // 1. On-Demand Code Exploration: Search repository files for relevant keywords and symbols
    let searchResults: { results: CodeSearchMatch[]; totalMatches: number } = {
      results: [],
      totalMatches: 0,
    };

    try {
      searchResults = await codeExplorerService.searchCodebase({
        repositoryId,
        projectId,
        query: userQuestion,
        limit: 6,
      });
    } catch (err: any) {
      console.warn(`[AgentRunner] Codebase search notice: ${err?.message}`);
    }

    for (const r of searchResults.results || []) {
      sourcesUsed.push({
        filePath: r.filePath,
        similarity: 1.0,
        symbolName: r.symbolName,
        startLine: r.startLine,
        endLine: r.endLine,
      });
    }

    // 2. Build Chat Messages & Execute Ollama
    const messages = this.buildChatMessages(
      userQuestion,
      chatHistory,
      searchResults.results || []
    );

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama chat error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const answer =
        data.message?.content || "I was unable to generate a response from local Ollama.";

      return {
        answer,
        sourcesUsed,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Local Ollama execution failed: ${error?.message || error}`);
    }
  }

  /**
   * Executes the AI Code Assistant agent with real-time SSE streaming using local Ollama.
   */
  public async runAgentStream(input: AgentRunStreamInput): Promise<AgentRunOutput> {
    const { projectId, repositoryId, userQuestion, chatHistory, onEvent } = input;
    const sourcesUsed: AgentRunOutput["sourcesUsed"] = [];

    // 1. Notify frontend that codebase search / exploration has started
    await onEvent({
      type: "tool_call",
      data: {
        tool: "search_codebase",
        query: userQuestion,
      },
    });

    // 2. On-Demand Code Exploration: Search repository files in MongoDB
    let searchResults: { results: CodeSearchMatch[]; totalMatches: number } = {
      results: [],
      totalMatches: 0,
    };

    try {
      searchResults = await codeExplorerService.searchCodebase({
        repositoryId,
        projectId,
        query: userQuestion,
        limit: 6,
      });
    } catch (err: any) {
      console.warn(`[AgentRunner] Codebase search notice: ${err?.message}`);
    }

    for (const r of searchResults.results || []) {
      sourcesUsed.push({
        filePath: r.filePath,
        similarity: 1.0,
        symbolName: r.symbolName,
        startLine: r.startLine,
        endLine: r.endLine,
      });
    }

    // 3. Emit tool result with citations to frontend
    await onEvent({
      type: "tool_result",
      data: {
        tool: "search_codebase",
        totalMatches: searchResults.totalMatches,
        sources: sourcesUsed,
      },
    });

    // 4. Build Chat Messages & Stream tokens via SSE
    const messages = this.buildChatMessages(
      userQuestion,
      chatHistory,
      searchResults.results || []
    );

    let fullAnswer = "";

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`Ollama chat stream error (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as {
              message?: { content?: string };
              done?: boolean;
            };

            const token = parsed.message?.content || "";
            if (token) {
              fullAnswer += token;
              await onEvent({
                type: "text_chunk",
                data: { text: token },
              });
            }
          } catch {
            // Ignore partial streaming chunks
          }
        }
      }

      return {
        answer: fullAnswer || "Response completed.",
        sourcesUsed,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Local Ollama streaming failed: ${error?.message || error}`);
    }
  }
}

export const agentRunner = new AgentRunner();