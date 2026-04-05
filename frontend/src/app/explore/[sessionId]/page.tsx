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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isDeepDiveRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());

  // Timer for elapsed time
  useEffect(() => {
    if (reportReady) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [reportReady]);

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
              label: `Hypothesis: ${text.substring(0, 60)}${text.length > 60 ? "\u2026" : ""}`,
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
                          ? `Testing: ${hypText.substring(0, 55)}\u2026`
                          : hypStatus === "not_significant"
                            ? `Not significant: ${hypText.substring(0, 45)}\u2026`
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
              label: `Found: ${hypText.substring(0, 55)}${hypText.length > 55 ? "\u2026" : ""}`,
              status: "complete" as const,
              isDeepDive: (f.is_deep_dive as boolean) || isDeepDiveRef.current,
            },
          ]);
          break;
        }

        case "deep_dive_start": {
          isDeepDiveRef.current = true;
          const reason =
            (event.data.reason as string) || "Investigating further\u2026";
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
      setStatus("Analysis complete.");
    });
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, handleEvent]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="flex flex-1 min-h-screen bg-paper">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-surface/50 overflow-y-auto max-h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Agent Progress
            </h2>
            <span className="font-mono text-xs text-muted tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <AgentTimeline steps={steps} />

          {steps.length === 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
              <p className="font-ui text-xs text-muted">{status}</p>
            </div>
          )}

          {/* Finding count */}
          {findings.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-baseline justify-between">
                <span className="font-ui text-xs text-muted">Findings</span>
                <span className="font-mono text-sm font-medium text-accent">{findings.length}</span>
              </div>
              {findings.some(f => f.isDeepDive) && (
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-ui text-xs text-muted">Deep dives</span>
                  <span className="font-mono text-sm font-medium text-gold">
                    {findings.filter(f => f.isDeepDive).length}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <header className="mb-8 pb-6 border-b border-border animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-ink">
              Exploring your data
            </h1>
            <p className="font-ui text-sm text-muted mt-2 flex items-center gap-2">
              {!reportReady && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
              )}
              {status}
            </p>
          </header>

          <div className="flex flex-col">
            {findings.map((finding, i) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                sessionId={sessionId}
                index={i}
              />
            ))}
          </div>

          {/* Loading state */}
          {findings.length === 0 && !reportReady && (
            <div className="py-20 animate-fade-in">
              <div className="flex flex-col items-start gap-4">
                {/* Shimmer skeleton for findings */}
                <div className="w-full space-y-6">
                  <div className="h-5 w-3/4 rounded animate-shimmer" />
                  <div className="h-40 w-full rounded-[4px] animate-shimmer" style={{ animationDelay: "200ms" }} />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 rounded animate-shimmer" style={{ animationDelay: "400ms" }} />
                    <div className="h-6 w-16 rounded animate-shimmer" style={{ animationDelay: "500ms" }} />
                  </div>
                  <div className="h-4 w-2/3 rounded animate-shimmer" style={{ animationDelay: "600ms" }} />
                </div>
                <p className="font-body text-base text-muted mt-4">
                  The agent is analyzing your data. Findings will appear here as
                  they are discovered.
                </p>
              </div>
            </div>
          )}

          {/* Report ready CTA */}
          {reportReady && (
            <div className="mt-10 pt-8 border-t border-border animate-fade-in-up">
              <div className="flex flex-col items-start gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-medium text-accent">{findings.length}</span>
                  <span className="font-body text-lg text-muted">findings discovered in {formatTime(elapsedSeconds)}</span>
                </div>
                <p className="font-body text-base text-ink max-w-lg">
                  The agent has finished exploring your data and written a complete data story
                  with charts, statistical tests, and a narrative — ready to read.
                </p>
                <button
                  onClick={() => router.push(`/report/${sessionId}`)}
                  className="mt-2 font-ui text-sm font-medium text-paper bg-accent hover:bg-accent-hover px-8 py-3.5 rounded-[6px] transition-colors"
                >
                  Read the Data Story
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}
