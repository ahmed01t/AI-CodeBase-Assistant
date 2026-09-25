import { ApiError } from "../../utils/ApiError.js";
export class ConversationRepository {
    /**
     * Creates a new conversation thread in public.conversations.
     */
    async createConversation(supabase, data) {
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
    async findConversationById(supabase, id) {
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
    async listConversations(supabase, options) {
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
    async createMessage(supabase, data) {
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
    async listMessagesByConversationId(supabase, conversationId, limit = 50) {
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
    async createAgentRun(supabase, data) {
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
    async completeAgentRun(supabase, runId, status, errorMessage) {
        if (!runId)
            return;
        await supabase
            .from("agent_runs")
            .update({
            status,
            completed_at: new Date().toISOString(),
            error: errorMessage || null,
        })
            .eq("id", runId);
    }
    /**
     * Deletes a conversation by ID.
     */
    async deleteConversation(supabase, id) {
        // 1. Delete associated messages
        const { error: msgError } = await supabase
            .from("messages")
            .delete()
            .eq("conversation_id", id);
        if (msgError) {
            console.warn(`[ConversationRepository] Warning deleting messages:`, msgError.message);
        }
        // 2. Clear or delete associated agent_runs for this conversation
        const { error: runError } = await supabase
            .from("agent_runs")
            .delete()
            .eq("conversation_id", id);
        if (runError) {
            console.warn(`[ConversationRepository] Warning deleting agent_runs:`, runError.message);
        }
        // 3. Delete conversation record
        const { error } = await supabase.from("conversations").delete().eq("id", id);
        if (error) {
            throw new ApiError(500, `Failed to delete conversation: ${error.message}`);
        }
    }
    mapConversation(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            userId: row.user_id,
            title: row.title,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapMessage(row) {
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
