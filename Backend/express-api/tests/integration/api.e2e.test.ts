import assert from "assert/strict";
import http from "http";
import app from "../../src/app.js";
import { codeParserService } from "../../src/modules/code-parser/code-parser.service.js";
import { codeChunkerService } from "../../src/modules/code-chunker/code-chunker.service.js";
import { embeddingService } from "../../src/modules/embeddings/embedding.service.js";
import { embeddingClient } from "../../src/modules/embeddings/embedding.client.js";

interface TestResult {
  module: string;
  endpoint: string;
  method: string;
  expectedStatus: number | number[];
  actualStatus: number;
  passed: boolean;
  description: string;
}

const testResults: TestResult[] = [];

async function runAllApiTests() {
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING AUTOMATED END-TO-END API TEST SUITE FOR ALL MODULES");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════\n");

  // Start test server on random available port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  console.log(`📡 Test Server listening on ${baseUrl}\n`);

  async function testEndpoint(
    module: string,
    description: string,
    method: string,
    path: string,
    options: {
      headers?: Record<string, string>;
      body?: any;
      expectedStatus: number | number[];
    }
  ): Promise<any> {
    const url = `${baseUrl}${path}`;
    const reqHeaders: Record<string, string> = {
      ...(options.headers || {}),
    };

    let bodyStr: string | undefined;
    if (options.body) {
      if (typeof options.body === "string") {
        bodyStr = options.body;
      } else {
        bodyStr = JSON.stringify(options.body);
        if (!reqHeaders["Content-Type"]) {
          reqHeaders["Content-Type"] = "application/json";
        }
      }
    }

    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: bodyStr,
    });

    const expectedArr = Array.isArray(options.expectedStatus)
      ? options.expectedStatus
      : [options.expectedStatus];
    const passed = expectedArr.includes(response.status);

    testResults.push({
      module,
      endpoint: path,
      method,
      expectedStatus: options.expectedStatus,
      actualStatus: response.status,
      passed,
      description,
    });

    const statusIcon = passed ? "✅" : "❌";
    const expectedStr = expectedArr.join(" or ");
    console.log(
      `${statusIcon} [${method.padEnd(6)}] ${path.padEnd(45)} ➔ Status: ${response.status} (Expected: ${expectedStr}) | ${description}`
    );

    const contentType = response.headers.get("content-type") || "";
    let data: any;
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      data = await response.text();
    }

    return { response, data };
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Health Module
    // -------------------------------------------------------------------------
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│ 1. HEALTH MODULE                                            │");
    console.log("└─────────────────────────────────────────────────────────────┘");
    await testEndpoint(
      "Health",
      "API & Database Health Check (200 Healthy or 503 DB offline)",
      "GET",
      "/health",
      { expectedStatus: [200, 503] }
    );

    // -------------------------------------------------------------------------
    // 2. GitHub Webhooks Module
    // -------------------------------------------------------------------------
    console.log("\n┌─────────────────────────────────────────────────────────────┐");
    console.log("│ 2. GITHUB WEBHOOKS MODULE                                   │");
    console.log("└─────────────────────────────────────────────────────────────┘");

    // Ping event
    await testEndpoint(
      "Webhooks",
      "GitHub Ping Event (Webhook connectivity handshake)",
      "POST",
      "/webhooks/github",
      {
        headers: { "X-GitHub-Event": "ping" },
        body: { zen: "Design for failure." },
        expectedStatus: 200,
      }
    );

    // Missing header
    await testEndpoint(
      "Webhooks",
      "Reject Request Missing X-GitHub-Event Header",
      "POST",
      "/webhooks/github",
      {
        body: { repository: { name: "test" } },
        expectedStatus: 400,
      }
    );

    // Push event
    const samplePushPayload = {
      ref: "refs/heads/main",
      repository: {
        id: 12345,
        name: "AI-CodeBase-Assistant",
        full_name: "ahmed01t/AI-CodeBase-Assistant",
        html_url: "https://github.com/ahmed01t/AI-CodeBase-Assistant",
        default_branch: "main",
      },
      commits: [
        {
          id: "commit-abc123",
          message: "Feat: Add SSE streaming",
          added: ["src/modules/conversations/agent.stream.ts"],
          modified: ["src/modules/conversations/agent.runner.ts"],
          removed: [],
        },
      ],
    };

    await testEndpoint(
      "Webhooks",
      "Acknowledge Valid GitHub Push Event with 202 Accepted",
      "POST",
      "/webhooks/github",
      {
        headers: {
          "X-GitHub-Event": "push",
          "X-GitHub-Delivery": "delivery-uuid-98765",
        },
        body: samplePushPayload,
        expectedStatus: 202,
      }
    );

    // -------------------------------------------------------------------------
    // 3. Auth Gateways & Route Protection (401 Unauthorized)
    // -------------------------------------------------------------------------
    console.log("\n┌─────────────────────────────────────────────────────────────┐");
    console.log("│ 3. AUTHENTICATION & SECURITY GATEWAYS (401 ENFORCEMENT)    │");
    console.log("└─────────────────────────────────────────────────────────────┘");

    await testEndpoint(
      "Organizations",
      "Reject unauthenticated GET /organizations",
      "GET",
      "/organizations",
      { expectedStatus: 401 }
    );

    await testEndpoint(
      "Organizations",
      "Reject unauthenticated POST /organizations",
      "POST",
      "/organizations",
      { body: { name: "Acme", slug: "acme" }, expectedStatus: 401 }
    );

    await testEndpoint(
      "Projects",
      "Reject unauthenticated GET /projects",
      "GET",
      "/projects",
      { expectedStatus: 401 }
    );

    await testEndpoint(
      "Projects",
      "Reject unauthenticated POST /projects",
      "POST",
      "/projects",
      { body: { name: "Project X", organizationId: "123e4567-e89b-12d3-a456-426614174000" }, expectedStatus: 401 }
    );

    await testEndpoint(
      "Repositories",
      "Reject unauthenticated GET /repositories",
      "GET",
      "/repositories",
      { expectedStatus: 401 }
    );

    await testEndpoint(
      "Repositories",
      "Reject unauthenticated POST /repositories",
      "POST",
      "/repositories",
      { body: { projectId: "123e4567-e89b-12d3-a456-426614174000", name: "test-repo", url: "https://github.com/org/repo" }, expectedStatus: 401 }
    );

    await testEndpoint(
      "GitHub Integration",
      "Reject unauthenticated GET /github/repos",
      "GET",
      "/github/repos",
      { expectedStatus: 401 }
    );

    await testEndpoint(
      "Ingestion",
      "Reject unauthenticated POST /ingestion/sync/:id",
      "POST",
      "/ingestion/sync/123e4567-e89b-12d3-a456-426614174000",
      { expectedStatus: 401 }
    );

    await testEndpoint(
      "Knowledge",
      "Reject unauthenticated POST /knowledge/search",
      "POST",
      "/knowledge/search",
      { body: { query: "auth middleware" }, expectedStatus: 401 }
    );

    await testEndpoint(
      "Conversations",
      "Reject unauthenticated GET /conversations",
      "GET",
      "/conversations",
      { expectedStatus: 401 }
    );

    await testEndpoint(
      "Conversations",
      "Reject unauthenticated POST /conversations",
      "POST",
      "/conversations",
      { body: { projectId: "123e4567-e89b-12d3-a456-426614174000" }, expectedStatus: 401 }
    );

    await testEndpoint(
      "Conversations",
      "Reject unauthenticated GET /conversations/:id",
      "GET",
      "/conversations/123e4567-e89b-12d3-a456-426614174000",
      { expectedStatus: 401 }
    );

    await testEndpoint(
      "Conversations",
      "Reject unauthenticated POST /conversations/:id/messages",
      "POST",
      "/conversations/123e4567-e89b-12d3-a456-426614174000/messages",
      { body: { content: "Where is auth?" }, expectedStatus: 401 }
    );

    await testEndpoint(
      "Conversations",
      "Reject unauthenticated POST /conversations/:id/messages/stream (SSE)",
      "POST",
      "/conversations/123e4567-e89b-12d3-a456-426614174000/messages/stream",
      { body: { content: "Where is auth?" }, expectedStatus: 401 }
    );

    // -------------------------------------------------------------------------
    // 4. AI Engine & Ingestion Pipeline Validation (Live Gemini & Tree-Sitter)
    // -------------------------------------------------------------------------
    console.log("\n┌─────────────────────────────────────────────────────────────┐");
    console.log("│ 4. AI ENGINE & INGESTION PIPELINE (LIVE GEMINI & TREE-SITTER)│");
    console.log("└─────────────────────────────────────────────────────────────┘");

    // 4.1 Tree-sitter AST Parser
    const testTypeScriptCode = `
export interface UserSession {
  userId: string;
  token: string;
}

export class AuthService {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  public async authenticate(token: string): Promise<UserSession> {
    return { userId: "u123", token };
  }
}
`;
    const parseResult = await codeParserService.parseCode({
      code: testTypeScriptCode,
      filePath: "src/auth/auth.service.ts",
    });
    assert.equal(parseResult.success, true);
    assert.equal(parseResult.language, "typescript");
    assert.ok(parseResult.symbols.length >= 2, "Should extract UserSession interface and AuthService class");
    console.log(`✅ [Code Parser] Tree-sitter WASM Parser: Extracted ${parseResult.symbols.length} AST symbols (interface, class, method)`);

    // 4.2 AST Code Chunker
    const chunkResult = await codeChunkerService.chunkFile({
      code: testTypeScriptCode,
      filePath: "src/auth/auth.service.ts",
    });
    assert.ok(chunkResult.chunks.length >= 2, "Should generate AST chunks");
    console.log(`✅ [Code Chunker] AST Chunker: Generated ${chunkResult.totalChunks} semantic chunks with syntax boundaries`);

    // 4.3 Google Gemini Live Vector Embedding Generation
    console.log("🔄 [Gemini AI] Requesting text-embedding-004 with configured GEMINI_API_KEY...");
    const embedding = await embeddingService.embedQuery(
      "export class AuthService { authenticate(token: string): Promise<UserSession> }"
    );
    assert.equal(embedding.dimension, 768, "Gemini text-embedding-004 dimension must be 768");
    console.log(`✅ [Gemini AI] Single Vector Embedding: Successfully generated 768-dim vector [${embedding.values.slice(0, 3).map((n: number) => n.toFixed(4)).join(", ")}...]`);

    // 4.4 Google Gemini Batch Embeddings
    const batchEmbeddings = await embeddingClient.embedBatch([
      "export interface UserSession { userId: string }",
      "export function hashPassword(pwd: string): string",
    ]);
    assert.equal(batchEmbeddings.length, 2);
    assert.equal(batchEmbeddings[0].dimension, 768);
    assert.equal(batchEmbeddings[1].dimension, 768);
    console.log(`✅ [Gemini AI] Batch Vector Embedding: Successfully generated ${batchEmbeddings.length} 768-dim vectors in batch`);

    // -------------------------------------------------------------------------
    // Final Summary Report
    // -------------------------------------------------------------------------
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════════");
    console.log("📊 COMPLETE API ENDPOINTS AND AI ENGINE TEST REPORT");
    console.log("═══════════════════════════════════════════════════════════════════════════════════════════\n");

    console.table(
      testResults.map((r) => ({
        Module: r.module,
        Method: r.method,
        Endpoint: r.endpoint,
        "Actual Status": r.actualStatus,
        "Expected Status": Array.isArray(r.expectedStatus) ? r.expectedStatus.join("/") : r.expectedStatus,
        Result: r.passed ? "PASS" : "FAIL",
        Description: r.description,
      }))
    );

    const totalTests = testResults.length;
    const passedTests = testResults.filter((r) => r.passed).length;
    const failedTests = testResults.filter((r) => !r.passed).length;

    console.log(`\n📈 SUMMARY: Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);

    if (failedTests > 0) {
      console.error("❌ Some tests failed!");
      process.exit(1);
    } else {
      console.log("🎉 ALL 17 API ENDPOINTS, SECURITY GATEWAYS, AND AI ENGINE TESTS PASSED 100%!");
    }
  } finally {
    server.close();
  }
}

runAllApiTests().catch((err) => {
  console.error("❌ Test Runner Error:", err);
  process.exit(1);
});

