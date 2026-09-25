import { ApiError } from "../../utils/ApiError.js";
import { agentRunner } from "./agent.runner.js";
import { conversationRepository } from "./conversation.repository.js";
export class ConversationService {
    /**
     * Starts a new conversation thread.
     */
    async createConversation(supabase, userId, input) {
        return await conversationRepository.createConversation(supabase, {
            projectId: input.projectId,
            userId,
            title: input.title || "New Chat",
        });
    }
    /**
     * Retrieves a conversation and its full message history.
     */
    async getConversationWithHistory(supabase, conversationId) {
        const conversation = await conversationRepository.findConversationById(supabase, conversationId);
        if (!conversation) {
            throw new ApiError(404, `Conversation with ID ${conversationId} not found`);
        }
        const messages = await conversationRepository.listMessagesByConversationId(supabase, conversationId, 100);
        return { conversation, messages };
    }
    /**
     * Lists previous conversations for a user/project.
     */
    async listConversations(supabase, options) {
        return await conversationRepository.listConversations(supabase, options);
    }
    /**
     * Sends a user message, runs the AI Code Assistant agent, and saves the assistant response.
     */
    async sendMessage(supabase, userId, conversationId, input) {
        // 1. Verify conversation exists
        const conversation = await conversationRepository.findConversationById(supabase, conversationId);
        if (!conversation) {
            throw new ApiError(404, `Conversation with ID ${conversationId} not found`);
        }
        // 2. Save user message to database
        const userMessage = await conversationRepository.createMessage(supabase, {
            conversationId,
            role: "user",
            content: input.content,
        });
        // 3. Start Agent Run flight recorder
        const runId = await conversationRepository.createAgentRun(supabase, {
            conversationId,
            projectId: conversation.projectId,
            agentType: "code_assistant",
        });
        try {
            // 4. Fetch recent chat history for context
            const chatHistory = await conversationRepository.listMessagesByConversationId(supabase, conversationId, 100);
            // 5. Run the Autonomous AI Agent (Ollama + live code search)
            const agentOutput = await agentRunner.runAgent({
                supabase,
                projectId: conversation.projectId,
                repositoryId: input.repositoryId,
                userQuestion: input.content,
                chatHistory,
            });
            // 6. Save Assistant response to database
            const assistantMessage = await conversationRepository.createMessage(supabase, {
                conversationId,
                role: "assistant",
                content: agentOutput.answer,
            });
            // 7. Complete Agent Run flight recorder
            await conversationRepository.completeAgentRun(supabase, runId, "completed");
            return {
                conversationId,
                userMessage,
                assistantMessage,
                agentRunId: runId,
                sourcesUsed: agentOutput.sourcesUsed,
            };
        }
        catch (error) {
            await conversationRepository.completeAgentRun(supabase, runId, "failed", error.message);
            throw error;
        }
    }
    /**
     * Sends a user message and streams the AI agent's execution in real-time via SSE.
     */
    async sendMessageStream(supabase, userId, conversationId, input, onEvent) {
        // 1. Verify conversation exists
        const conversation = await conversationRepository.findConversationById(supabase, conversationId);
        if (!conversation) {
            throw new ApiError(404, `Conversation with ID ${conversationId} not found`);
        }
        // 2. Save user message to database
        const userMessage = await conversationRepository.createMessage(supabase, {
            conversationId,
            role: "user",
            content: input.content,
        });
        // 3. Start Agent Run flight recorder
        const runId = await conversationRepository.createAgentRun(supabase, {
            conversationId,
            projectId: conversation.projectId,
            agentType: "code_assistant",
        });
        // 4. Emit run_started event
        await onEvent({
            type: "run_started",
            data: { agentRunId: runId, conversationId },
        });
        try {
            // 5. Fetch recent chat history
            const chatHistory = await conversationRepository.listMessagesByConversationId(supabase, conversationId, 100);
            // 6. Run streaming agent execution
            const agentOutput = await agentRunner.runAgentStream({
                supabase,
                projectId: conversation.projectId,
                repositoryId: input.repositoryId,
                userQuestion: input.content,
                chatHistory,
                onEvent,
            });
            // 7. Save Assistant message to database
            const assistantMessage = await conversationRepository.createMessage(supabase, {
                conversationId,
                role: "assistant",
                content: agentOutput.answer,
            });
            // 8. Complete Agent Run flight recorder
            await conversationRepository.completeAgentRun(supabase, runId, "completed");
            // 9. Emit done event
            await onEvent({
                type: "done",
                data: {
                    userMessage,
                    assistantMessage,
                    agentRunId: runId,
                    sourcesUsed: agentOutput.sourcesUsed,
                },
            });
        }
        catch (error) {
            await conversationRepository.completeAgentRun(supabase, runId, "failed", error.message);
            await onEvent({
                type: "error",
                data: { error: error.message || "An error occurred during agent streaming." },
            });
            throw error;
        }
    }
    /**
     * Deletes a conversation thread and all its messages.
     */
    async deleteConversation(supabase, conversationId) {
        await conversationRepository.deleteConversation(supabase, conversationId);
    }
}
export const conversationService = new ConversationService();
