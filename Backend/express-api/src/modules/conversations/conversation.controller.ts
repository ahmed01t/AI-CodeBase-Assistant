import type { Request, Response, NextFunction } from "express";
import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { conversationService } from "./conversation.service.js";
import type {
  CreateConversationSchema,
  SendMessageSchema,
  ListConversationsQuerySchema,
} from "./conversation.validation.js";

/**
 * POST /api/v1/conversations
 * Starts a new chat thread
 */
export async function createConversation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const userId = req.userId!;
    const supabase = getAuthenticatedSupabaseClient(token);

    const input: CreateConversationSchema = req.body;
    const conversation = await conversationService.createConversation(
      supabase,
      userId,
      input
    );

    return res
      .status(201)
      .json(new ApiResponse(201, conversation, "Conversation created successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/conversations
 * Lists user's previous conversations
 */
export async function listConversations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const supabase = getAuthenticatedSupabaseClient(token);

    const query = req.query as unknown as ListConversationsQuerySchema;
    const conversations = await conversationService.listConversations(supabase, {
      projectId: query.projectId,
      limit: query.limit || 20,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, conversations, "Conversations retrieved successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/conversations/:id
 * Fetches conversation details and message history
 */
export async function getConversation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const supabase = getAuthenticatedSupabaseClient(token);
    const id = req.params.id as string;

    const data = await conversationService.getConversationWithHistory(supabase, id);

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Conversation retrieved successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/conversations/:id
 * Deletes a conversation and its messages
 */
export async function deleteConversation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const supabase = getAuthenticatedSupabaseClient(token);
    const id = req.params.id as string;

    await conversationService.deleteConversation(supabase, id);

    return res
      .status(200)
      .json(new ApiResponse(200, { deleted: true }, "Conversation deleted successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/conversations/:id/messages
 * Sends a message and triggers the AI Code Assistant agent
 */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const userId = req.userId!;
    const supabase = getAuthenticatedSupabaseClient(token);
    const conversationId = req.params.id as string;

    const input: SendMessageSchema = req.body;
    const response = await conversationService.sendMessage(
      supabase,
      userId,
      conversationId,
      input
    );

    return res
      .status(200)
      .json(new ApiResponse(200, response, "Agent response generated successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/conversations/:id/messages/stream
 * Streams agent response token-by-token and tool calls in real-time via Server-Sent Events (SSE)
 */
export async function sendMessageStream(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const userId = req.userId!;
    const supabase = getAuthenticatedSupabaseClient(token);
    const conversationId = req.params.id as string;
    const input: SendMessageSchema = req.body;

    // Set Server-Sent Events headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let isClientConnected = true;
    req.on("close", () => {
      isClientConnected = false;
    });

    const sendSSE = (event: import("./conversation.types.js").AgentStreamEvent) => {
      if (!isClientConnected) return;
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    };

    await conversationService.sendMessageStream(
      supabase,
      userId,
      conversationId,
      input,
      sendSSE
    );

    res.end();
  } catch (error: any) {
    if (res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message || "Streaming failed" })}\n\n`
      );
      res.end();
    } else {
      next(error);
    }
  }
}

