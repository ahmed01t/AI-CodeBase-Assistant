import assert from "assert/strict";
import type { AgentStreamEvent } from "../../src/modules/conversations/conversation.types.js";

function formatSSE(event: AgentStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

function parseSSEChunk(chunk: string): { event: string; data: any } {
  const lines = chunk.trim().split("\n");
  const eventLine = lines.find((l) => l.startsWith("event: "));
  const dataLine = lines.find((l) => l.startsWith("data: "));

  if (!eventLine || !dataLine) {
    throw new Error(`Malformed SSE chunk: ${chunk}`);
  }

  const event = eventLine.substring("event: ".length);
  const data = JSON.parse(dataLine.substring("data: ".length));

  return { event, data };
}

async function runTests() {
  console.log("🧪 Running Server-Sent Events (SSE) Protocol Unit Tests...\n");

  // -------------------------------------------------------------------------
  // Test 1: SSE Event Serialization and Parsing
  // -------------------------------------------------------------------------
  console.log("1️⃣  Testing SSE Event Serialization...");

  const eventsToTest: AgentStreamEvent[] = [
    {
      type: "run_started",
      data: { agentRunId: "run-123", conversationId: "conv-456" },
    },
    {
      type: "tool_call",
      data: { tool: "search_codebase", query: "find authentication middleware" },
    },
    {
      type: "tool_result",
      data: {
        tool: "search_codebase",
        totalMatches: 2,
        sources: [
          { filePath: "src/middleware/auth.ts", similarity: 0.89, symbolName: "requireAuth" },
        ],
      },
    },
    {
      type: "text_chunk",
      data: { text: "The authentication middleware is located in " },
    },
    {
      type: "text_chunk",
      data: { text: "`src/middleware/auth.ts`." },
    },
    {
      type: "done",
      data: {
        userMessage: {
          id: "msg-user-1",
          conversationId: "conv-456",
          role: "user",
          content: "Where is auth?",
          createdAt: new Date().toISOString(),
        },
        assistantMessage: {
          id: "msg-assistant-1",
          conversationId: "conv-456",
          role: "assistant",
          content: "The authentication middleware is located in `src/middleware/auth.ts`.",
          createdAt: new Date().toISOString(),
        },
        agentRunId: "run-123",
        sourcesUsed: [
          { filePath: "src/middleware/auth.ts", similarity: 0.89, symbolName: "requireAuth" },
        ],
      },
    },
  ];

  let reconstructedAnswer = "";

  for (const ev of eventsToTest) {
    const serialized = formatSSE(ev);
    assert.ok(serialized.endsWith("\n\n"), "SSE messages must end with double newline");

    const parsed = parseSSEChunk(serialized);
    assert.equal(parsed.event, ev.type);

    if (ev.type === "text_chunk") {
      reconstructedAnswer += parsed.data.text;
    }
  }

  assert.equal(
    reconstructedAnswer,
    "The authentication middleware is located in `src/middleware/auth.ts`.",
    "Streamed text chunks must reconstruct the complete message faithfully"
  );

  console.log("   ✅ SSE event serialization and chunk reconstruction passed!");

  // -------------------------------------------------------------------------
  // Test 2: Error Event Serialization
  // -------------------------------------------------------------------------
  console.log("2️⃣  Testing Error Event Serialization...");

  const errorEvent: AgentStreamEvent = {
    type: "error",
    data: { error: "LLM token limit exceeded" },
  };

  const serializedError = formatSSE(errorEvent);
  const parsedError = parseSSEChunk(serializedError);

  assert.equal(parsedError.event, "error");
  assert.equal(parsedError.data.error, "LLM token limit exceeded");

  console.log("   ✅ Error event serialization passed!");

  console.log("\n🎉 ALL SSE STREAMING TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

