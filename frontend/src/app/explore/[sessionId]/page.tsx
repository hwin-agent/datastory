"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { connectSSE } from "@/lib/sse-client";
import type { SSEEvent } from "@/lib/sse-client";
import type { TimelineStep, Finding } from "@/lib/types";
import AgentTimeline from "@/components/AgentTimeline";
import FindingCard from "@/components/FindingCard";

export default function ExplorePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [status, setStatus] = useState<string>("Connecting to agent...");
  const [reportReady, setReportReady] = useState(false);
  const isDeepDiveRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new findings appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [findings]);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case "status": {
          const msg = (event.data.message as string) || "Working...";
          const step = (event.data.step as string) || "";
          setStatus(msg);

          if (step === "complete") {
            setSteps((prev) =>
              prev.map((s) =>
                s.status === "active"
                  ? { ...s, status: "complete" as const }
                  : s
              )
            );
            break;
          }

          setSteps((prev) => {
            const updated = prev.map((s) =>
              s.status === "active"
                ? { ...s, status: "complete" as const }
                : s
            );
            return [
              ...updated,
              {
                id: `step-${Date.now()}`,
                label: msg,
                status: "active" as const,
                isDeepDive: step === "deep_dive",
              },
            ];
          });
          break;
        }

        case "profile": {
          const rows = event.data.rows as number;
          const cols = event.data.columns as number;
          setSteps((prev) => {
            const updated = prev.map((s) =>
              s.status === "active"
                ? { ...s, status: "complete" as const }
                : s
            );
            return [
              ...updated,
              {
                id: `profile-${Date.now()}`,
                label: `Profiled: ${rows.toLocaleString()} rows, ${cols} columns`,
                status: "complete" as const,
                isDeepDive: false,
              },
            ];
          });
          break;
        }

        case "hypothesis": {
          const text = (event.data.text as string) || "";
          setSteps((prev) => [
            ...prev,
            {
              id: `hyp-${event.data.id || Date.now()}`,
              label: `Hypothesis: ${text.substring(0, 60)}${text.length > 60 ? "…" : ""}`,
              status: "pending" as const,
              isDeepDive: false,
            },
          ]);
          break;
        }

        case "hypothesis_update": {
          const hypStatus = event.data.status as string;
          const hypText = (event.data.text as string) || "";
          setSteps((prev) => {
            const stepId = `hyp-${event.data.id}`;
            const exists = prev.some((s) => s.id === stepId);
            if (exists) {
              return prev.map((s) =>
                s.id === stepId
                  ? {
                      ...s,
                      status:
                        hypStatus === "testing"
                          ? ("active" as const)
                          : ("complete" as const),
                      label:
                        hypStatus === "testing"
                          ? `Testing: ${hypText.substring(0, 55)}…`
                          : hypStatus === "not_significant"
                            ? `Not significant: ${hypText.substring(0, 45)}…`
                            : s.label,
                    }
                  : s
              );
            }
            return prev;
          });
          break;
        }

        case "finding": {
          const f = event.data as Record<string, unknown>;
          setFindings((prev) => [
            ...prev,
            {
              id: (f.id as string) || `finding-${Date.now()}`,
              hypothesis: (f.hypothesis as string) || "",
              chart_url: f.chart_url as string | undefined,
              test_type: f.test_type as string | undefined,
              p_value: f.p_value as number | undefined,
              effect_summary: f.effect_summary as string | undefined,
              insight: (f.insight as string) || "",
              isDeepDive: (f.is_deep_dive as boolean) || isDeepDiveRef.current,
            },
          ]);

          const hypText = (f.hypothesis as string) || "";
          setSteps((prev) => [
            ...prev.map((s) =>
              s.status === "active"
                ? { ...s, status: "complete" as const }
                : s
            ),
            {
              id: `finding-${f.id || Date.now()}`,
              label: `✓ ${hypText.substring(0, 55)}${hypText.length > 55 ? "…" : ""}`,
              status: "complete" as const,
              isDeepDive: (f.is_deep_dive as boolean) || isDeepDiveRef.current,
            },
          ]);
          break;
        }

        case "deep_dive_start": {
          isDeepDiveRef.current = true;
          const reason =
            (event.data.reason as string) || "Investigating further…";
          setSteps((prev) => {
            const updated = prev.map((s) =>
              s.status === "active"
                ? { ...s, status: "complete" as const }
                : s
            );
            return [
              ...updated,
              {
                id: `deep-dive-${Date.now()}`,
                label: reason.substring(0, 70),
                status: "active" as const,
                isDeepDive: true,
              },
            ];
          });
          break;
        }

        case "report_ready": {
          setReportReady(true);
          setSteps((prev) =>
            prev.map((s) =>
              s.status === "active"
                ? { ...s, status: "complete" as const }
                : s
            )
          );
          setStatus("Data story is ready!");
          break;
        }

        case "error": {
          setStatus(
            `Error: ${(event.data.message as string) || "Unknown error"}`
          );
          break;
        }
      }
    },
    []
  );

  useEffect(() => {
    const disconnect = connectSSE(sessionId, handleEvent, () => {
      // Exploration finished (complete or error)
      setStatus("Analysis complete.");
    });
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, handleEvent]);

  return (
    <div className="flex flex-1 min-h-screen bg-paper">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-surface p-6 overflow-y-auto max-h-screen sticky top-0">
        <h2 className="font-display text-lg font-semibold text-ink mb-6">
          Agent Progress
        </h2>
        <AgentTimeline steps={steps} />
        {steps.length === 0 && (
          <p className="font-ui text-xs text-muted animate-pulse">{status}</p>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <header className="mb-8 border-b border-border pb-6">
            <h1 className="font-display text-3xl font-bold text-ink">
              Exploring your data
            </h1>
            <p className="font-ui text-sm text-muted mt-2">{status}</p>
          </header>

          <div className="flex flex-col">
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                sessionId={sessionId}
              />
            ))}
          </div>

          {findings.length === 0 && !reportReady && (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="font-body text-base text-muted">
                The agent is analyzing your data. Findings will appear here as
                they are discovered.
              </p>
            </div>
          )}

          {reportReady && (
            <div className="mt-10 pt-8 border-t border-border text-center">
              <p className="font-body text-base text-ink mb-4">
                The agent has finished exploring your data and written a complete data story.
              </p>
              <button
                onClick={() => router.push(`/report/${sessionId}`)}
                className="font-ui text-sm font-medium text-white bg-accent hover:bg-[#0A5C5F] px-8 py-3 rounded-[4px] transition-colors"
              >
                View Data Story →
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}
