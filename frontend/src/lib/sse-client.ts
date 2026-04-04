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

export function connectSSE(
  sessionId: string,
  onEvent: SSEEventHandler,
  onError?: (error: Event | Error) => void
): () => void {
  const url = `${API_URL}/api/explore/${sessionId}`;
  const eventSource = new EventSource(url);

  const eventTypes: SSEEventType[] = [
    "status",
    "profile",
    "hypothesis",
    "hypothesis_update",
    "finding",
    "deep_dive_start",
    "report_ready",
    "error",
  ];

  for (const type of eventTypes) {
    eventSource.addEventListener(type, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEvent({ type, data });
      } catch {
        onEvent({ type, data: { message: e.data } });
      }
    });
  }

  eventSource.onerror = (e) => {
    if (onError) {
      onError(e);
    }
  };

  return () => {
    eventSource.close();
  };
}
