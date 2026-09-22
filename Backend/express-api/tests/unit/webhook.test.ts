import assert from "assert/strict";
import crypto from "crypto";
import { verifyGitHubWebhookSignature } from "../../src/modules/webhooks/webhook.verifier.js";
import type { GitHubPushWebhookPayload } from "../../src/modules/webhooks/webhook.types.js";

async function runTests() {
  console.log("🧪 Running GitHub Webhook Unit Tests...\n");

  const testSecret = "test-webhook-secret-12345";
  const samplePayload = JSON.stringify({
    ref: "refs/heads/main",
    repository: {
      id: 9999,
      name: "sample-repo",
      full_name: "test-user/sample-repo",
      html_url: "https://github.com/test-user/sample-repo",
      default_branch: "main",
    },
    commits: [
      {
        id: "commit1",
        message: "Add auth feature",
        added: ["src/auth/login.ts", "package-lock.json"],
        modified: ["src/app.ts"],
        removed: ["src/legacy.js"],
      },
      {
        id: "commit2",
        message: "Update auth feature and delete old helper",
        added: ["src/auth/types.ts"],
        modified: ["src/auth/login.ts"],
        removed: ["src/utils/old-helper.ts"],
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Test 1: HMAC SHA256 Signature Verification
  // -------------------------------------------------------------------------
  console.log("1️⃣  Testing HMAC SHA256 Signature Verification...");

  const validHmac = crypto
    .createHmac("sha256", testSecret)
    .update(Buffer.from(samplePayload))
    .digest("hex");
  const validSignatureHeader = `sha256=${validHmac}`;

  // Positive verification
  const isValid = verifyGitHubWebhookSignature(
    samplePayload,
    validSignatureHeader,
    testSecret
  );
  assert.equal(isValid, true, "Valid signature must return true");

  // Negative verification: Wrong secret
  const isInvalidSecret = verifyGitHubWebhookSignature(
    samplePayload,
    validSignatureHeader,
    "wrong-secret"
  );
  assert.equal(isInvalidSecret, false, "Signature with wrong secret must return false");

  // Negative verification: Tampered payload
  const tamperedPayload = samplePayload + " ";
  const isTampered = verifyGitHubWebhookSignature(
    tamperedPayload,
    validSignatureHeader,
    testSecret
  );
  assert.equal(isTampered, false, "Tampered payload must fail signature check");

  // Negative verification: Missing or malformed header
  const isMissing = verifyGitHubWebhookSignature(samplePayload, undefined, testSecret);
  assert.equal(isMissing, false, "Missing signature header must fail");

  const isMalformed = verifyGitHubWebhookSignature(samplePayload, "not-a-sha", testSecret);
  assert.equal(isMalformed, false, "Malformed signature header must fail");

  console.log("   ✅ HMAC signature verification tests passed!");

  // -------------------------------------------------------------------------
  // Test 2: Commit Diff Aggregation & Deduplication Logic
  // -------------------------------------------------------------------------
  console.log("2️⃣  Testing Commit Diff Aggregation & Deduplication Logic...");

  const pushEvent: GitHubPushWebhookPayload = JSON.parse(samplePayload);

  const addedFiles = new Set<string>();
  const modifiedFiles = new Set<string>();
  const removedFiles = new Set<string>();

  for (const commit of pushEvent.commits || []) {
    (commit.added || []).forEach((f) => {
      addedFiles.add(f);
      removedFiles.delete(f);
    });
    (commit.modified || []).forEach((f) => {
      if (!addedFiles.has(f)) {
        modifiedFiles.add(f);
      }
      removedFiles.delete(f);
    });
    (commit.removed || []).forEach((f) => {
      removedFiles.add(f);
      addedFiles.delete(f);
      modifiedFiles.delete(f);
    });
  }

  // Verify: src/auth/login.ts was added in commit 1, modified in commit 2 -> should remain in addedFiles
  assert.ok(addedFiles.has("src/auth/login.ts"), "login.ts should be in addedFiles");
  assert.ok(!modifiedFiles.has("src/auth/login.ts"), "login.ts should NOT be duplicated in modifiedFiles");

  // Verify: src/app.ts was modified -> should be in modifiedFiles
  assert.ok(modifiedFiles.has("src/app.ts"), "app.ts should be in modifiedFiles");

  // Verify: src/legacy.js and src/utils/old-helper.ts were removed -> should be in removedFiles
  assert.ok(removedFiles.has("src/legacy.js"), "legacy.js should be in removedFiles");
  assert.ok(removedFiles.has("src/utils/old-helper.ts"), "old-helper.ts should be in removedFiles");

  console.log("   ✅ Commit diff aggregation tests passed!");

  console.log("\n🎉 ALL GITHUB WEBHOOK TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

