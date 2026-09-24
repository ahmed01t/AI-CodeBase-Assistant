import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { verifyGitHubWebhookSignature } from "./webhook.verifier.js";
import { webhookRepository } from "./webhook.repository.js";
import { webhookService } from "./webhook.service.js";
/**
 * Handles POST /api/v1/webhooks/github
 * Receives GitHub webhook events (push, ping, pull_request)
 */
export async function handleGitHubWebhook(req, res, next) {
    try {
        const eventType = req.headers["x-github-event"];
        const deliveryId = req.headers["x-github-delivery"];
        const signature = req.headers["x-hub-signature-256"];
        if (!eventType) {
            throw new ApiError(400, "Missing X-GitHub-Event header");
        }
        // 1. Verify HMAC Signature
        const rawBody = req.rawBody || JSON.stringify(req.body);
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
            .json(new ApiResponse(202, { eventId, eventType, deliveryId, status: "queued" }, "Webhook event accepted for processing"));
        // 5. Asynchronously process push event in background
        if (eventType === "push") {
            const pushPayload = req.body;
            setImmediate(async () => {
                try {
                    await webhookService.processPushEvent(pushPayload, eventId);
                }
                catch (err) {
                    console.error(`[WebhookController] Error processing push event ${eventId}:`, err);
                }
            });
        }
    }
    catch (error) {
        next(error);
    }
}
