import { getAuthToken } from "./api-client";
import type { AgentStreamEvent } from "../types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export interface StreamMessageOptions {
  conversationId: string;
  content: string;
  repositoryId?: string;
  onEvent: (event: AgentStreamEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

/**
 * Sends a message and consumes the Server-Sent Events (SSE) stream from the backend.
 */
export async function streamAgentMessage(options: StreamMessageOptions): Promise<void> {
  const { conversationId, content, repositoryId, onEvent, onError, onComplete, signal } =
    options;

  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages/stream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ content, repositoryId }),
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Server error ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.message || parsed.error || errorMsg;
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported in this browser.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split SSE packets by double newline
      const packets = buffer.split("\n\n");
      buffer = packets.pop() || "";

      for (const packet of packets) {
        if (!packet.trim()) continue;

        const lines = packet.split("\n");
        let eventType = "";
        let eventDataRaw = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.substring(7).trim();
          } else if (line.startsWith("data: ")) {
            eventDataRaw = line.substring(6).trim();
          }
        }

        if (eventType && eventDataRaw) {
          try {
            const parsedData = JSON.parse(eventDataRaw);
            onEvent({ type: eventType, data: parsedData } as AgentStreamEvent);
          } catch (e) {
            console.error("[SSE] Failed to parse event data JSON:", eventDataRaw, e);
          }
        }
      }
    }

    onComplete?.();
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("[SSE] Request aborted by user");
      return;
    }
    onError?.(err instanceof Error ? err : new Error(String(err)));
    let errorObj: Error;
    if (
      err.message?.includes("Failed to fetch") ||
      err.message?.includes("NetworkError") ||
      err.name === "TypeError"
    ) {
      errorObj = new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. Ensure the Express API is running (npm run dev in Backend/express-api).`
      );
    } else {
      errorObj = err instanceof Error ? err : new Error(String(err));
    }
    onError?.(errorObj);
  }
}

