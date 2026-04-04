"use client";

import { useEffect, useState, use, useCallback } from "react";
import { getReport, API_URL } from "@/lib/api";
import type { Report } from "@/lib/types";

export default function ReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReport(sessionId)
      .then(setReport)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load report")
      )
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleExportHTML = useCallback(() => {
    const el = document.getElementById("report-content");
    if (!el) return;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${report?.title || "DataStory Report"}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Serif+4&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Source Serif 4', serif; max-width: 720px; margin: 0 auto; padding: 48px 24px; color: #1A1A2E; background: #FAF8F5; line-height: 1.7; font-size: 18px; }
  h1 { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 700; margin-bottom: 24px; }
  h2 { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 600; margin-top: 48px; }
  img { max-width: 100%; border: 1px solid #E8E4DF; border-radius: 4px; }
  .summary { font-size: 20px; color: #1A1A2E; border-left: 3px solid #0D7377; padding-left: 16px; margin: 24px 0 32px; }
  .methodology { color: #8A8578; font-size: 15px; }
  .stat-badge { display: inline-block; background: rgba(212,99,74,0.1); color: #D4634A; font-family: 'IBM Plex Mono', monospace; font-size: 13px; padding: 2px 8px; border-radius: 4px; margin-right: 8px; }
</style>
</head>
<body>
${el.innerHTML}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(report?.title || "report").replace(/[^a-zA-Z0-9]/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-paper">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-ui text-sm text-muted">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-paper">
        <p className="font-ui text-sm text-coral">{error || "Report not found"}</p>
      </div>
    );
  }

  // Map finding charts for inline display
  const findingCharts: Record<string, string> = {};
  if (report.findings) {
    report.findings.forEach((f, i) => {
      if (f.chart_url) {
        findingCharts[f.id] = f.chart_url;
        findingCharts[`finding_${i}`] = f.chart_url;
        findingCharts[`finding-${i}`] = f.chart_url;
      }
    });
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[720px] mx-auto px-6 py-16">
        {/* Top actions */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="font-ui text-xs font-medium text-muted hover:text-ink transition-colors"
          >
            ← Back to Explorer
          </button>
          <button
            onClick={handleExportHTML}
            className="font-ui text-xs font-medium text-accent border border-accent px-4 py-2 rounded-[4px] hover:bg-accent hover:text-white transition-colors"
          >
            Export as HTML
          </button>
        </div>

        <div id="report-content">
          {/* Title */}
          <h1 className="font-display text-[48px] font-bold text-ink leading-[1.1] mb-8">
            {report.title}
          </h1>

          {/* Executive Summary */}
          <div className="border-l-[3px] border-accent pl-5 mb-12">
            <p className="font-body text-xl text-ink leading-[1.7]">
              {report.executive_summary}
            </p>
          </div>

          {/* Stats bar */}
          {report.profile && (
            <div className="flex flex-wrap gap-6 mb-12 py-4 border-y border-border">
              <span className="font-mono text-xs text-muted">
                {report.profile.rows.toLocaleString()} rows analyzed
              </span>
              <span className="font-mono text-xs text-muted">
                {report.findings?.length || 0} findings
              </span>
              <span className="font-mono text-xs text-muted">
                {report.findings?.filter((f) => f.is_deep_dive).length || 0} deep dives
              </span>
            </div>
          )}

          {/* Sections (from GLM 5.1 narrative) */}
          {report.sections.map((section, i) => {
            // Try to find a matching chart for this section
            const chartUrl = section.chart_id
              ? findingCharts[section.chart_id] || null
              : report.findings?.[i]?.chart_url || null;

            return (
              <section key={i} className="mb-14">
                <h2 className="font-display text-[28px] font-semibold text-ink mb-5">
                  {section.heading}
                </h2>

                {/* Finding stat badges if available */}
                {report.findings?.[i] && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-block font-mono text-xs text-coral bg-coral/10 px-2 py-0.5 rounded-[3px]">
                      {report.findings[i].test_type.replace("_", "-")}
                    </span>
                    <span className="inline-block font-mono text-xs text-coral bg-coral/10 px-2 py-0.5 rounded-[3px]">
                      {report.findings[i].p_value < 0.001
                        ? "p < 0.001"
                        : `p = ${report.findings[i].p_value.toFixed(3)}`}
                    </span>
                    {report.findings[i].effect_summary && (
                      <span className="inline-block font-mono text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-[3px]">
                        {report.findings[i].effect_summary}
                      </span>
                    )}
                  </div>
                )}

                <div className="font-body text-lg text-ink leading-[1.7] whitespace-pre-line">
                  {section.body}
                </div>

                {chartUrl && (
                  <figure className="my-6">
                    <div className="border border-border rounded-[4px] overflow-hidden bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={chartUrl.startsWith("http") ? chartUrl : `${API_URL}${chartUrl}`}
                        alt={`Chart for ${section.heading}`}
                        className="w-full h-auto"
                      />
                    </div>
                    <figcaption className="font-ui text-xs italic text-muted mt-2">
                      {report.findings?.[i]?.insight || section.heading}
                    </figcaption>
                  </figure>
                )}
              </section>
            );
          })}

          {/* Methodology */}
          {report.methodology && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="font-display text-xl font-semibold text-muted mb-3">
                Methodology
              </h2>
              <p className="font-ui text-[15px] text-muted leading-relaxed whitespace-pre-line">
                {report.methodology}
              </p>
            </section>
          )}

          {/* Recommendations */}
          {report.recommendations && (
            <section className="mt-12">
              <h2 className="font-display text-[28px] font-semibold text-ink mb-4">
                Recommendations
              </h2>
              <div className="font-body text-lg text-ink leading-[1.7] whitespace-pre-line">
                {report.recommendations}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-border">
            <p className="font-ui text-xs text-muted text-center">
              Generated by DataStory — Powered by GLM 5.1
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
