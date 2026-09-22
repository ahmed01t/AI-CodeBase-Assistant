import { GoogleGenAI, Type } from "@google/genai";
import { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { knowledgeService } from "../knowledge/knowledge.service.js";
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
  }>;
}

export interface AgentRunStreamInput extends AgentRunInput {
  onEvent: (event: AgentStreamEvent) => void | Promise<void>;
}

export class AgentRunner {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor() {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError(500, "GEMINI_API_KEY is not configured");
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = "gemini-2.5-flash";
  }

  /**
   * Executes the autonomous AI Code Assistant agent synchronously.
   */
  public async runAgent(input: AgentRunInput): Promise<AgentRunOutput> {
    const { supabase, projectId, repositoryId, userQuestion, chatHistory } = input;
    const sourcesUsed: AgentRunOutput["sourcesUsed"] = [];

    // 1. Tool Declaration for Gemini: search_codebase
    const searchCodebaseTool = {
      functionDeclarations: [
        {
          name: "search_codebase",
          description: "Search the codebase semantically using vector similarity to find relevant functions, classes, and code chunks.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: "The semantic search query text (e.g. 'authentication middleware', 'user repository')",
              },
            },
            required: ["query"],
          },
        },
      ],
    };

    // 2. Format chat history for Gemini contents
    const contents: Array<{ role: string; parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }> }> = [];

    // Add previous conversation turns
    for (const msg of chatHistory.slice(-6)) {
      if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "assistant") {
        contents.push({ role: "model", parts: [{ text: msg.content }] });
      }
    }

    // Add current user question
    contents.push({ role: "user", parts: [{ text: userQuestion }] });

    const systemInstruction = `You are a Senior AI Codebase Assistant.
Your job is to answer developer questions accurately using the repository's code.
RULES:
1. When asked about code, architecture, or features, ALWAYS use the 'search_codebase' tool to find the exact implementation.
2. Cite the exact file paths (e.g. 'src/modules/users/user.service.ts') and line numbers where possible.
3. Be concise, professional, and explain concepts clearly.
4. If you don't find relevant code in the search results, state clearly what was found and what is missing.`;

    try {
      // 3. First LLM Call: Generate content (LLM decides if it needs tools)
      let response = await this.ai.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction,
          tools: [searchCodebaseTool as any],
          temperature: 0.2,
        },
      });

      // 4. Handle Tool Calls if Gemini requested one
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === "search_codebase") {
            const searchQuery = (call.args as any)?.query || userQuestion;

            // Execute vector search in PostgreSQL
            const searchResults = await knowledgeService.searchCodebase(supabase, {
              query: searchQuery,
              projectId,
              repositoryId,
              limit: 5,
              similarityThreshold: 0.4,
            });

            // Track sources for citation
            for (const r of searchResults.results) {
              sourcesUsed.push({
                filePath: r.metadata?.filePath,
                similarity: r.similarity,
                symbolName: r.metadata?.symbolName,
              });
            }

            // Append model's tool call to conversation history
            contents.push({
              role: "model",
              parts: [{ functionCall: call }],
            });

            // Append tool execution result
            contents.push({
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: "search_codebase",
                    response: {
                      totalMatches: searchResults.totalMatches,
                      chunks: searchResults.results.map((c) => ({
                        content: c.content,
                        filePath: c.metadata?.filePath,
                        startLine: c.metadata?.startLine,
                        endLine: c.metadata?.endLine,
                        symbolName: c.metadata?.symbolName,
                      })),
                    },
                  },
                },
              ],
            });
          }
        }

        // 5. Second LLM Call: Give tool results to Gemini to synthesize final answer
        response = await this.ai.models.generateContent({
          model: this.modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
      }

      const answer = response.text || "I was unable to generate a response. Please try again.";

      return {
        answer,
        sourcesUsed,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `AI Agent execution failed: ${error.message}`);
    }
  }

  /**
   * Executes the autonomous AI Code Assistant agent with real-time SSE streaming.
   */
  public async runAgentStream(input: AgentRunStreamInput): Promise<AgentRunOutput> {
    const { supabase, projectId, repositoryId, userQuestion, chatHistory, onEvent } = input;
    const sourcesUsed: AgentRunOutput["sourcesUsed"] = [];

    // 1. Tool Declaration for Gemini: search_codebase
    const searchCodebaseTool = {
      functionDeclarations: [
        {
          name: "search_codebase",
          description: "Search the codebase semantically using vector similarity to find relevant functions, classes, and code chunks.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: "The semantic search query text (e.g. 'authentication middleware', 'user repository')",
              },
            },
            required: ["query"],
          },
        },
      ],
    };

    // 2. Format chat history for Gemini contents
    const contents: Array<{ role: string; parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }> }> = [];

    for (const msg of chatHistory.slice(-6)) {
      if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "assistant") {
        contents.push({ role: "model", parts: [{ text: msg.content }] });
      }
    }

    contents.push({ role: "user", parts: [{ text: userQuestion }] });

    const systemInstruction = `You are a Senior AI Codebase Assistant.
Your job is to answer developer questions accurately using the repository's code.
RULES:
1. When asked about code, architecture, or features, ALWAYS use the 'search_codebase' tool to find the exact implementation.
2. Cite the exact file paths (e.g. 'src/modules/users/user.service.ts') and line numbers where possible.
3. Be concise, professional, and explain concepts clearly.
4. If you don't find relevant code in the search results, state clearly what was found and what is missing.`;

    try {
      // 3. First LLM Call: Check if Gemini requests a tool call
      const firstResponse = await this.ai.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction,
          tools: [searchCodebaseTool as any],
          temperature: 0.2,
        },
      });

      const functionCalls = firstResponse.functionCalls;
      let fullAnswer = "";

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === "search_codebase") {
            const searchQuery = (call.args as any)?.query || userQuestion;

            // Emit tool_call event to client stream
            await onEvent({
              type: "tool_call",
              data: {
                tool: "search_codebase",
                query: searchQuery,
              },
            });

            // Execute vector search in PostgreSQL
            const searchResults = await knowledgeService.searchCodebase(supabase, {
              query: searchQuery,
              projectId,
              repositoryId,
              limit: 5,
              similarityThreshold: 0.4,
            });

            // Track sources for citation
            for (const r of searchResults.results) {
              sourcesUsed.push({
                filePath: r.metadata?.filePath,
                similarity: r.similarity,
                symbolName: r.metadata?.symbolName,
              });
            }

            // Emit tool_result event to client stream
            await onEvent({
              type: "tool_result",
              data: {
                tool: "search_codebase",
                totalMatches: searchResults.totalMatches,
                sources: sourcesUsed,
              },
            });

            // Append tool call & result to context
            contents.push({
              role: "model",
              parts: [{ functionCall: call }],
            });

            contents.push({
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: "search_codebase",
                    response: {
                      totalMatches: searchResults.totalMatches,
                      chunks: searchResults.results.map((c) => ({
                        content: c.content,
                        filePath: c.metadata?.filePath,
                        startLine: c.metadata?.startLine,
                        endLine: c.metadata?.endLine,
                        symbolName: c.metadata?.symbolName,
                      })),
                    },
                  },
                },
              ],
            });
          }
        }

        // 4. Stream final answer synthesis
        const responseStream = await this.ai.models.generateContentStream({
          model: this.modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        for await (const chunk of responseStream) {
          const textChunk = chunk.text || "";
          if (textChunk) {
            fullAnswer += textChunk;
            await onEvent({
              type: "text_chunk",
              data: { text: textChunk },
            });
          }
        }
      } else {
        // No tool calls needed, stream or emit direct answer
        const directText = firstResponse.text || "I was unable to generate a response.";
        fullAnswer = directText;
        await onEvent({
          type: "text_chunk",
          data: { text: directText },
        });
      }

      return {
        answer: fullAnswer || "Response completed.",
        sourcesUsed,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `AI Agent streaming failed: ${error.message}`);
    }
  }
}

export const agentRunner = new AgentRunner();


