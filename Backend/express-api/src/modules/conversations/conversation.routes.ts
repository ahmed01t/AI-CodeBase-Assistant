import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  sendMessage,
  sendMessageStream,
} from "./conversation.controller.js";
import {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema,
  listConversationsQuerySchema,
} from "./conversation.validation.js";

const router = Router();

// All conversation routes require authentication
router.use(requireAuth);

router.post(
  "/",
  validateRequest({ body: createConversationSchema }),
  createConversation
);

router.get(
  "/",
  validateRequest({ query: listConversationsQuerySchema }),
  listConversations
);

router.get(
  "/:id",
  validateRequest({ params: conversationIdParamSchema }),
  getConversation
);

router.delete(
  "/:id",
  validateRequest({ params: conversationIdParamSchema }),
  deleteConversation
);

router.post(
  "/:id/messages",
  validateRequest({
    params: conversationIdParamSchema,
    body: sendMessageSchema,
  }),
  sendMessage
);

router.post(
  "/:id/messages/stream",
  validateRequest({
    params: conversationIdParamSchema,
    body: sendMessageSchema,
  }),
  sendMessageStream
);

export default router;