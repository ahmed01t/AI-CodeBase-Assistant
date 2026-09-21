import { z } from "zod";

/**
 * Validates request body for POST /api/v1/conversations (Create Conversation)
 */
export const createConversationSchema = z.object({
  projectId: z.string().uuid("Invalid project ID format (UUID expected)"),
  title: z.string().min(1).max(100).optional(),
});

/**
 * Validates request body for POST /api/v1/conversations/:id/messages (Send Message)
 */
export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(10000, "Message is too long"),
  repositoryId: z.string().uuid("Invalid repository ID format (UUID expected)").optional(),
});

/**
 * Validates URL params for routes with :id (e.g. GET /api/v1/conversations/:id)
 */
export const conversationIdParamSchema = z.object({
  id: z.string().uuid("Invalid conversation ID format (UUID expected)"),
});

/**
 * Validates query params for GET /api/v1/conversations (List Conversations)
 */
export const listConversationsQuerySchema = z.object({
  projectId: z.string().uuid("Invalid project ID format (UUID expected)").optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type CreateConversationSchema = z.infer<typeof createConversationSchema>;
export type SendMessageSchema = z.infer<typeof sendMessageSchema>;
export type ConversationIdParamSchema = z.infer<typeof conversationIdParamSchema>;
export type ListConversationsQuerySchema = z.infer<typeof listConversationsQuerySchema>;