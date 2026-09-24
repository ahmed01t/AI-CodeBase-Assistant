import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { knowledgeService } from "../knowledge/knowledge.service.js";
export class AgentRunner {
    baseUrl;
    modelName;
    constructor() {
        this.baseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, "");
        this.modelName = env.OLLAMA_CHAT_MODEL;
    }
    /**
     * Builds conversation message list for Ollama /api/chat
     */
    buildChatMessages(userQuestion, chatHistory, retrievedChunks) {
        const messages = [];
        // 1. System Prompt
        const systemPrompt = `You are CodePilot AI, a Senior AI Codebase Assistant running on a local inference engine.
Your mission is to assist developers in understanding, debugging, navigating, and improving their codebase.

GUIDELINES:
1. When relevant code snippets from the codebase are provided in the prompt, reference them directly, citing exact file paths (e.g., 'src/middleware/auth.middleware.ts') and line numbers.
2. If code snippets are not available or no exact match was found, explain the concept thoroughly based on standard TypeScript / Express / Node.js architectural patterns and where such files are conventionally placed.
3. Provide complete, clean, syntax-highlighted code blocks with language specifiers (e.g., \`\`\`typescript ... \`\`\`).
4. Be concise, precise, friendly, and well-structured using markdown headings and bullet points.`;
        messages.push({ role: "system", content: systemPrompt });
        // 2. Chat history (last 6 turns)
        for (const msg of chatHistory.slice(-6)) {
            messages.push({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content,
            });
        }
        // 3. Current user prompt with retrieved codebase context
        let promptWithContext = userQuestion;
        if (retrievedChunks && retrievedChunks.length > 0) {
            const codeContext = retrievedChunks
                .map((c, idx) => `--- Code Snippet #${idx + 1} (${c.metadata?.filePath || "unknown"} : lines ${c.metadata?.startLine || 1}-${c.metadata?.endLine || "?"}) ---\n${c.content}`)
                .join("\n\n");
            promptWithContext = `Relevant Code Snippets from Codebase:\n${codeContext}\n\nUser Question:\n${userQuestion}`;
        }
        messages.push({ role: "user", content: promptWithContext });
        return messages;
    }
    /**
     * Executes the AI Code Assistant agent synchronously using local Ollama.
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
        // 2. Build Chat Messages
        const messages = this.buildChatMessages(userQuestion, chatHistory, searchResults.results || []);
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
            const data = (await response.json());
            const answer = data.message?.content || "I was unable to generate a response from local Ollama.";
            return {
                answer,
                sourcesUsed,
            };
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            throw new ApiError(502, `Local Ollama execution failed: ${error?.message || error}`);
        }
    }
    /**
     * Executes the AI Code Assistant agent with real-time SSE streaming using local Ollama.
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
        // 4. Build Chat Messages & Stream tokens via SSE
        const messages = this.buildChatMessages(userQuestion, chatHistory, searchResults.results || []);
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
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    if (!line.trim())
                        continue;
                    try {
                        const parsed = JSON.parse(line);
                        const token = parsed.message?.content || "";
                        if (token) {
                            fullAnswer += token;
                            await onEvent({
                                type: "text_chunk",
                                data: { text: token },
                            });
                        }
                    }
                    catch {
                        // Ignore incomplete JSON chunks in streaming lines
                    }
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
            throw new ApiError(502, `Local Ollama streaming failed: ${error?.message || error}`);
        }
    }
}
export const agentRunner = new AgentRunner();
