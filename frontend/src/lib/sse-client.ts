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
 * Poll-based exploration client. Polls /api/explore/{sessionId}/poll every 2s.
 * Much more reliable than SSE on Render's free tier.
 */
export function connectSSE(
  sessionId: string,
  onEvent: SSEEventHandler,
  onClose?: () => void
): () => void {
  let cursor = 0;
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  async function poll() {
    if (stopped) return;

    try {
      const res = await fetch(
        `${API_URL}/api/explore/${sessionId}/poll?cursor=${cursor}`
      );

      if (!res.ok) {
        onEvent({
          type: "error",
          data: { message: `Server returned ${res.status}` },
        });
        onClose?.();
        return;
      }

      const body = await res.json();
      const { status, events, cursor: nextCursor, error } = body;

      // Dispatch new events
      for (const evt of events) {
        if (stopped) return;
        onEvent({ type: evt.type as SSEEventType, data: evt.data });
      }
      cursor = nextCursor;

      // Check if done
      if (status === "complete" || status === "error") {
        if (error) {
          onEvent({ type: "error", data: { message: error } });
        }
        onClose?.();
        return;
      }

      // Schedule next poll
      if (!stopped) {
        timeoutId = setTimeout(poll, 2000);
      }
    } catch (err) {
      if (stopped) return;
      console.error("Poll error:", err);
      // Retry after a delay
      if (!stopped) {
        timeoutId = setTimeout(poll, 3000);
      }
    }
  }

  // Start polling immediately
  poll();

  // Return cleanup function
  return () => {
    stopped = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  };
}
