import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { knowledgeService } from "../knowledge/knowledge.service.js";
export class AgentRunner {
    ai;
    candidateModels;
    constructor() {
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new ApiError(500, "GEMINI_API_KEY is not configured");
        }
        this.ai = new GoogleGenAI({ apiKey });
        // Prioritized list of active Gemini and Gemma models
        this.candidateModels = [
            "gemini-3.1-flash-lite",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemma-4-26b-a4b-it",
        ];
    }
    /**
     * Helper to execute generateContentStream with model fallback
     */
    async streamWithFallback(params) {
        let lastError = null;
        for (const model of this.candidateModels) {
            try {
                const stream = await this.ai.models.generateContentStream({
                    model,
                    contents: params.contents,
                    config: {
                        systemInstruction: params.systemInstruction,
                        temperature: params.temperature ?? 0.2,
                    },
                });
                return { stream, model };
            }
            catch (err) {
                lastError = err;
                console.warn(`[AgentRunner] Model ${model} unavailable: ${err?.message || err}. Trying next candidate...`);
            }
        }
        throw lastError || new Error("All candidate Gemini models failed to respond.");
    }
    /**
     * Helper to execute generateContent with model fallback
     */
    async generateWithFallback(params) {
        let lastError = null;
        for (const model of this.candidateModels) {
            try {
                const response = await this.ai.models.generateContent({
                    model,
                    contents: params.contents,
                    config: {
                        systemInstruction: params.systemInstruction,
                        temperature: params.temperature ?? 0.2,
                    },
                });
                return { response, model };
            }
            catch (err) {
                lastError = err;
                console.warn(`[AgentRunner] Model ${model} unavailable: ${err?.message || err}. Trying next candidate...`);
            }
        }
        throw lastError || new Error("All candidate Gemini models failed to respond.");
    }
    /**
     * Builds conversation context and prompt for the LLM
     */
    buildPromptContext(userQuestion, chatHistory, retrievedChunks) {
        const contents = [];
        // 1. Add previous conversation turns
        for (const msg of chatHistory.slice(-6)) {
            if (msg.role === "user") {
                contents.push({ role: "user", parts: [{ text: msg.content }] });
            }
            else if (msg.role === "assistant") {
                contents.push({ role: "model", parts: [{ text: msg.content }] });
            }
        }
        // 2. Format current prompt with codebase context
        let promptWithContext = userQuestion;
        if (retrievedChunks && retrievedChunks.length > 0) {
            const codeContext = retrievedChunks
                .map((c, idx) => `--- Code Snippet #${idx + 1} (${c.metadata?.filePath || "unknown"} : lines ${c.metadata?.startLine || 1}-${c.metadata?.endLine || "?"}) ---\n${c.content}`)
                .join("\n\n");
            promptWithContext = `Relevant Code Snippets from Codebase:\n${codeContext}\n\nUser Question:\n${userQuestion}`;
        }
        contents.push({ role: "user", parts: [{ text: promptWithContext }] });
        const systemInstruction = `You are CodePilot AI, an expert Senior AI Codebase Assistant.
Your mission is to assist developers in understanding, debugging, navigating, and improving their codebase.

GUIDELINES:
1. When code snippets from the codebase are provided, reference them directly, citing exact file paths (e.g., 'src/middleware/auth.middleware.ts') and line numbers.
2. If code snippets are not provided or no exact match was found, explain the concept thoroughly based on standard TypeScript / Express / Node.js architectural patterns and explain where such files are conventionally placed.
3. Provide complete, clean, syntax-highlighted code blocks with language specifiers (e.g., \`\`\`typescript ... \`\`\`).
4. Be concise, precise, friendly, and structured (use headings, bullet points, and code snippets).`;
        return { contents, systemInstruction };
    }
    /**
     * Executes the AI Code Assistant agent synchronously.
     */
    async runAgent(input) {
        const { supabase, projectId, repositoryId, userQuestion, chatHistory } = input;
        const sourcesUsed = [];
        // 1. Search vector database for matching code chunks
        let searchResults = { results: [], totalMatches: 0 };
        if (supabase) {
            try {
                searchResults = await knowledgeService.searchCodebase(supabase, {
                    query: userQuestion,
                    projectId,
                    repositoryId,
                    limit: 6,
                    similarityThreshold: 0.35,
                });
            }
            catch (err) {
                console.warn(`[Agent] Codebase vector search notice: ${err?.message}`);
            }
        }
        for (const r of searchResults.results || []) {
            sourcesUsed.push({
                filePath: r.metadata?.filePath,
                similarity: r.similarity,
                symbolName: r.metadata?.symbolName,
            });
        }
        // 2. Build Prompt & Execute LLM with Fallback
        const { contents, systemInstruction } = this.buildPromptContext(userQuestion, chatHistory, searchResults.results || []);
        try {
            const { response } = await this.generateWithFallback({
                contents,
                systemInstruction,
                temperature: 0.2,
            });
            const answer = response.text || "I was unable to generate a response. Please try again.";
            return {
                answer,
                sourcesUsed,
            };
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            throw new ApiError(502, `AI Agent execution failed: ${error?.message || error}`);
        }
    }
    /**
     * Executes the AI Code Assistant agent with real-time SSE streaming.
     */
    async runAgentStream(input) {
        const { supabase, projectId, repositoryId, userQuestion, chatHistory, onEvent } = input;
        const sourcesUsed = [];
        // 1. Notify client that codebase search has started
        await onEvent({
            type: "tool_call",
            data: {
                tool: "search_codebase",
                query: userQuestion,
            },
        });
        // 2. Search vector database for matching code chunks
        let searchResults = { results: [], totalMatches: 0 };
        if (supabase) {
            try {
                searchResults = await knowledgeService.searchCodebase(supabase, {
                    query: userQuestion,
                    projectId,
                    repositoryId,
                    limit: 6,
                    similarityThreshold: 0.35,
                });
            }
            catch (err) {
                console.warn(`[Agent] Codebase vector search notice: ${err?.message}`);
            }
        }
        for (const r of searchResults.results || []) {
            sourcesUsed.push({
                filePath: r.metadata?.filePath,
                similarity: r.similarity,
                symbolName: r.metadata?.symbolName,
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
        // 4. Build Prompt & Stream final answer synthesis
        const { contents, systemInstruction } = this.buildPromptContext(userQuestion, chatHistory, searchResults.results || []);
        let fullAnswer = "";
        try {
            const { stream } = await this.streamWithFallback({
                contents,
                systemInstruction,
                temperature: 0.2,
            });
            for await (const chunk of stream) {
                const textChunk = chunk.text || "";
                if (textChunk) {
                    fullAnswer += textChunk;
                    await onEvent({
                        type: "text_chunk",
                        data: { text: textChunk },
                    });
                }
            }
            return {
                answer: fullAnswer || "Response completed.",
                sourcesUsed,
            };
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            throw new ApiError(502, `AI Agent streaming failed: ${error?.message || error}`);
        }
    }
}
export const agentRunner = new AgentRunner();
