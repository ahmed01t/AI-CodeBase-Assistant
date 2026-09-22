import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { verifyGitHubWebhookSignature } from "./webhook.verifier.js";
import { webhookRepository } from "./webhook.repository.js";
import { webhookService } from "./webhook.service.js";
import type { GitHubPushWebhookPayload } from "./webhook.types.js";

/**
 * Handles POST /api/v1/webhooks/github
 * Receives GitHub webhook events (push, ping, pull_request)
 */
export async function handleGitHubWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const eventType = req.headers["x-github-event"] as string;
    const deliveryId = req.headers["x-github-delivery"] as string;
    const signature = req.headers["x-hub-signature-256"] as string;

    if (!eventType) {
      throw new ApiError(400, "Missing X-GitHub-Event header");
    }

    // 1. Verify HMAC Signature
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const isSignatureValid = verifyGitHubWebhookSignature(rawBody, signature);

    if (!isSignatureValid) {
      throw new ApiError(401, "Invalid GitHub webhook signature");
    }

    // 2. Handle GitHub Ping event (webhook setup test)
    if (eventType === "ping") {
      return res
        .status(200)
        .json(new ApiResponse(200, { pong: true }, "GitHub ping received successfully"));
    }

    // 3. Log event into public.webhook_events
    const eventId = await webhookRepository.createWebhookEvent({
      provider: "github",
      eventType,
      externalId: deliveryId,
      payloadReference: req.body?.repository?.full_name || null,
    });

    // 4. Return HTTP 202 Accepted immediately (Non-blocking for GitHub)
    res
      .status(202)
      .json(
        new ApiResponse(
          202,
          { eventId, eventType, deliveryId, status: "queued" },
          "Webhook event accepted for processing"
        )
      );

    // 5. Asynchronously process push event in background
    if (eventType === "push") {
      const pushPayload: GitHubPushWebhookPayload = req.body;

      setImmediate(async () => {
        try {
          await webhookService.processPushEvent(pushPayload, eventId);
        } catch (err: any) {
          console.error(`[WebhookController] Error processing push event ${eventId}:`, err);
        }
      });
    }
  } catch (error) {
    next(error);
  }
}

