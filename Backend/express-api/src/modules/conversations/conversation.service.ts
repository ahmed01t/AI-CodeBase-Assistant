import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../../utils/ApiError.js";
import { agentRunner } from "./agent.runner.js";
import { conversationRepository } from "./conversation.repository.js";
import {
  AgentResponse,
  Conversation,
  CreateConversationInput,
  Message,
  SendMessageInput,
} from "./conversation.types.js";

export class ConversationService {
  /**
   * Starts a new conversation thread.
   */
  public async createConversation(
    supabase: SupabaseClient,
    userId: string,
    input: CreateConversationInput
  ): Promise<Conversation> {
    return await conversationRepository.createConversation(supabase, {
      projectId: input.projectId,
      userId,
      title: input.title || "New Chat",
    });
  }

  /**
   * Retrieves a conversation and its full message history.
   */
  public async getConversationWithHistory(
    supabase: SupabaseClient,
    conversationId: string
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const conversation = await conversationRepository.findConversationById(
      supabase,
      conversationId
    );

    if (!conversation) {
      throw new ApiError(404, `Conversation with ID ${conversationId} not found`);
    }

    const messages = await conversationRepository.listMessagesByConversationId(
      supabase,
      conversationId,
      100
    );

    return { conversation, messages };
  }

  /**
   * Lists previous conversations for a user/project.
   */
  public async listConversations(
    supabase: SupabaseClient,
    options: { projectId?: string; limit: number }
  ): Promise<Conversation[]> {
    return await conversationRepository.listConversations(supabase, options);
  }

  /**
   * Sends a user message, runs the AI Code Assistant agent, and saves the assistant response.
   */
  public async sendMessage(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    input: SendMessageInput
  ): Promise<AgentResponse> {
    // 1. Verify conversation exists
    const conversation = await conversationRepository.findConversationById(
      supabase,
      conversationId
    );

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
      const chatHistory = await conversationRepository.listMessagesByConversationId(
        supabase,
        conversationId,
        10
      );

      // 5. Run the Autonomous AI Agent (Gemini + vector search tools)
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
    } catch (error: any) {
      // Record failure in agent run
      await conversationRepository.completeAgentRun(
        supabase,
        runId,
        "failed",
        error.message
      );
      throw error;
    }
  }
}

export const conversationService = new ConversationService();
