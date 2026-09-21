import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../../utils/ApiError.js";
import { Conversation, Message } from "./conversation.types.js";

export class ConversationRepository {
  /**
   * Creates a new conversation thread in public.conversations.
   */
  public async createConversation(
    supabase: SupabaseClient,
    data: { projectId: string; userId: string; title?: string }
  ): Promise<Conversation> {
    const { data: record, error } = await supabase
      .from("conversations")
      .insert({
        project_id: data.projectId,
        user_id: data.userId,
        title: data.title || "New Chat",
      })
      .select("*")
      .single();

    if (error || !record) {
      throw new ApiError(500, `Failed to create conversation: ${error?.message}`);
    }

    return this.mapConversation(record);
  }

  /**
   * Finds a conversation by ID.
   */
  public async findConversationById(
    supabase: SupabaseClient,
    id: string
  ): Promise<Conversation | null> {
    const { data: record, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, `Failed to fetch conversation: ${error.message}`);
    }

    return record ? this.mapConversation(record) : null;
  }

  /**
   * Lists conversations for a project/user.
   */
  public async listConversations(
    supabase: SupabaseClient,
    options: { projectId?: string; limit: number }
  ): Promise<Conversation[]> {
    let query = supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(options.limit);

    if (options.projectId) {
      query = query.eq("project_id", options.projectId);
    }

    const { data: records, error } = await query;

    if (error) {
      throw new ApiError(500, `Failed to list conversations: ${error.message}`);
    }

    return (records || []).map((r) => this.mapConversation(r));
  }

  /**
   * Saves a message into public.messages and updates the conversation's updated_at.
   */
  public async createMessage(
    supabase: SupabaseClient,
    data: { conversationId: string; role: "user" | "assistant" | "system" | "tool"; content: string }
  ): Promise<Message> {
    // 1. Insert message
    const { data: record, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        role: data.role,
        content: data.content,
      })
      .select("*")
      .single();

    if (error || !record) {
      throw new ApiError(500, `Failed to save message: ${error?.message}`);
    }

    // 2. Touch conversation updated_at timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);

    return this.mapMessage(record);
  }

  /**
   * Retrieves messages for a conversation ordered chronologically (oldest to newest).
   */
  public async listMessagesByConversationId(
    supabase: SupabaseClient,
    conversationId: string,
    limit: number = 50
  ): Promise<Message[]> {
    const { data: records, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new ApiError(500, `Failed to fetch messages: ${error.message}`);
    }

    return (records || []).map((r) => this.mapMessage(r));
  }

  /**
   * Creates an agent run record in public.agent_runs for audit logging.
   */
  public async createAgentRun(
    supabase: SupabaseClient,
    data: { conversationId: string; projectId: string; agentType: string }
  ): Promise<string> {
    const { data: record, error } = await supabase
      .from("agent_runs")
      .insert({
        conversation_id: data.conversationId,
        project_id: data.projectId,
        agent_type: data.agentType,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !record) {
      return ""; // Non-blocking if audit record fails
    }

    return record.id;
  }

  /**
   * Completes an agent run record.
   */
  public async completeAgentRun(
    supabase: SupabaseClient,
    runId: string,
    status: "completed" | "failed",
    errorMessage?: string
  ): Promise<void> {
    if (!runId) return;

    await supabase
      .from("agent_runs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        error: errorMessage || null,
      })
      .eq("id", runId);
  }

  private mapConversation(row: any): Conversation {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    };
  }
}

export const conversationRepository = new ConversationRepository();