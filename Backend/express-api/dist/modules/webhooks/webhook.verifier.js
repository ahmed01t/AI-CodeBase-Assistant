import crypto from "crypto";
import { env } from "../../config/env.js";
/**
 * Verifies the GitHub webhook HMAC SHA-256 signature against the raw request body.
 */
export function verifyGitHubWebhookSignature(rawBody, signatureHeader, secretOverride) {
    const secret = secretOverride || env.GITHUB_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
    // If no secret is configured in dev environment, allow request with a warning
    if (!secret) {
        console.warn("[WebhookVerifier] GITHUB_WEBHOOK_SECRET not set. Skipping signature verification in dev mode.");
        return true;
    }
    if (!signatureHeader || !rawBody) {
        return false;
    }
    try {
        const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf-8");
        const hmac = crypto.createHmac("sha256", secret);
        const expectedSignature = `sha256=${hmac.update(payload).digest("hex")}`;
        const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
        const actualBuffer = Buffer.from(signatureHeader, "utf-8");
        if (expectedBuffer.length !== actualBuffer.length) {
            return false;
        }
        // Use timingSafeEqual to prevent timing attacks
        return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    }
    catch (error) {
        console.error("[WebhookVerifier] Error during signature verification:", error);
        return false;
    }
}
