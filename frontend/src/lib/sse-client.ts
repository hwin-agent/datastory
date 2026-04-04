import { API_URL } from "./api";

export type SSEEventType =
  | "status"
  | "profile"
  | "hypothesis"
  | "hypothesis_update"
  | "finding"
  | "deep_dive_start"
  | "report_ready"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
}

export type SSEEventHandler = (event: SSEEvent) => void;

/**
 * Connect to SSE using fetch() — no auto-reconnect like EventSource.
 * On disconnect, calls onClose. Caller decides whether to retry.
 */
export function connectSSE(
  sessionId: string,
  onEvent: SSEEventHandler,
  onClose?: () => void
): () => void {
  const url = `${API_URL}/api/explore/${sessionId}`;
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "text/event-stream" },
      });

      if (!response.ok || !response.body) {
        onEvent({
          type: "error",
          data: { message: `Server returned ${response.status}` },
        });
        onClose?.();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const parts = buffer.split("\n\n");
        // Keep the last incomplete part in buffer
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          // Skip keepalive comments
          if (part.trim().startsWith(":")) continue;

          let eventType: SSEEventType = "status";
          let dataStr = "";

          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim() as SSEEventType;
            } else if (line.startsWith("data: ")) {
              dataStr += line.slice(6);
            } else if (line.startsWith(":")) {
              // comment / keepalive, skip
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              onEvent({ type: eventType, data });
            } catch {
              onEvent({ type: eventType, data: { message: dataStr } });
            }
          }
        }
      }

      // Stream ended normally (exploration complete)
      onClose?.();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("SSE connection error:", err);
      onEvent({
        type: "error",
        data: {
          message:
            err instanceof Error ? err.message : "Connection lost",
        },
      });
      onClose?.();
    }
  })();

  return () => {
    controller.abort();
  };
}
