import { Router } from "express";
import { handleGitHubWebhook } from "./webhook.controller.js";

const webhookRouter = Router();

/**
 * @route   POST /api/v1/webhooks/github
 * @desc    Receive GitHub webhook events (push, ping, etc.)
 * @access  Public (Protected via HMAC SHA256 Signature verification)
 */
webhookRouter.post("/github", handleGitHubWebhook);

export default webhookRouter;

