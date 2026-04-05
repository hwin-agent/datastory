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
  const [showComparison, setShowComparison] = useState(false);

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
  h1 { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 700; margin-bottom: 24px; line-height: 1.1; }
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
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="font-ui text-sm text-muted">Composing your data story...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-paper gap-4">
        <div className="w-12 h-12 rounded-[6px] bg-coral/10 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-coral">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="font-ui text-sm text-coral">{error || "Report not found"}</p>
        <button
          onClick={() => window.history.back()}
          className="font-ui text-xs text-accent hover:text-accent-hover transition-colors"
        >
          Go back
        </button>
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
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-paper/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="font-ui text-xs font-medium text-muted hover:text-ink transition-colors"
          >
            &larr; Back to Explorer
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`font-ui text-xs font-medium px-4 py-2 rounded-[4px] transition-all border ${
                showComparison
                  ? "bg-accent text-white border-accent"
                  : "text-accent border-accent/30 hover:border-accent hover:bg-accent/5"
              }`}
            >
              {showComparison ? "Close Comparison" : "Compare: Raw vs. Story"}
            </button>
            <button
              onClick={handleExportHTML}
              className="font-ui text-xs font-medium text-accent border border-accent/30 px-4 py-2 rounded-[4px] hover:border-accent hover:bg-accent/5 transition-all"
            >
              Export HTML
            </button>
          </div>
        </div>
      </div>

      {/* Comparison view */}
      {showComparison && (
        <div className="bg-surface border-b border-border animate-fade-in">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Raw data side */}
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-3">
                  Raw CSV Input
                </p>
                <div className="border border-border rounded-[4px] bg-white p-4 font-mono text-[11px] text-ink/60 leading-relaxed overflow-hidden max-h-64">
                  <div className="opacity-70">
                    <p className="text-muted font-semibold mb-2">tripduration,starttime,stoptime,start_station_id,...</p>
                    <p>634,2025-01-15 08:15:34,2025-01-15 08:26:08,519,...</p>
                    <p>1242,2025-01-15 09:02:11,2025-01-15 09:22:53,402,...</p>
                    <p>389,2025-01-15 07:45:22,2025-01-15 07:51:51,519,...</p>
                    <p>876,2025-01-15 12:30:45,2025-01-15 12:45:21,317,...</p>
                    <p>2103,2025-01-15 14:12:08,2025-01-15 14:47:11,285,...</p>
                    <p className="text-muted mt-2">... {report.profile?.rows?.toLocaleString() || "50,000"}+ more rows</p>
                  </div>
                </div>
              </div>
              {/* Report side */}
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-3">
                  Generated Data Story
                </p>
                <div className="border border-border rounded-[4px] bg-white p-4 overflow-hidden max-h-64">
                  <p className="font-display text-lg font-bold text-ink leading-tight mb-2">
                    {report.title}
                  </p>
                  <p className="font-body text-xs text-ink/70 leading-relaxed line-clamp-4">
                    {report.executive_summary}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="font-mono text-[10px] text-coral bg-coral/10 px-1.5 py-0.5 rounded">
                      {report.findings?.length || 0} findings
                    </span>
                    <span className="font-mono text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                      {report.sections?.length || 0} sections
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Stats summary */}
            <div className="mt-6 flex items-center gap-6 font-mono text-xs text-muted">
              <span>{report.profile?.rows?.toLocaleString() || "50,000"} rows analyzed</span>
              <span className="text-border">&middot;</span>
              <span>{report.findings?.length || 0} significant findings</span>
              <span className="text-border">&middot;</span>
              <span>{report.findings?.filter(f => !f.is_deep_dive).length || 0} hypotheses confirmed</span>
              <span className="text-border">&middot;</span>
              <span>{report.findings?.filter(f => f.is_deep_dive).length || 0} deep dives</span>
              <span className="text-border">&middot;</span>
              <span>1 publishable story</span>
            </div>
          </div>
        </div>
      )}

      {/* Main report article */}
      <div className="max-w-[720px] mx-auto px-6 py-16 animate-fade-in-up">
        <div id="report-content">
          {/* Title */}
          <h1 className="font-display text-[44px] md:text-[48px] font-bold text-ink leading-[1.1] mb-8">
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

          {/* Sections */}
          {report.sections.map((section, i) => {
            const chartUrl = section.chart_id
              ? findingCharts[section.chart_id] || null
              : report.findings?.[i]?.chart_url || null;

            const finding = report.findings?.[i];
            const isDeepDive = finding?.is_deep_dive;

            return (
              <section
                key={i}
                className={`mb-14 animate-fade-in-up ${isDeepDive ? "border-l-2 border-l-gold pl-6" : ""}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {isDeepDive && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                    <span className="font-ui text-[10px] font-semibold uppercase tracking-[0.15em] text-gold">
                      Autonomous Deep Dive
                    </span>
                  </div>
                )}

                <h2 className="font-display text-[28px] font-semibold text-ink mb-5">
                  {section.heading}
                </h2>

                {/* Statistical badges */}
                {finding && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-block font-mono text-xs text-coral bg-coral/10 px-2 py-0.5 rounded-[3px]">
                      {finding.test_type.replace("_", "-")}
                    </span>
                    <span className="inline-block font-mono text-xs text-coral bg-coral/10 px-2 py-0.5 rounded-[3px]">
                      {finding.p_value < 0.001
                        ? "p < 0.001"
                        : `p = ${finding.p_value.toFixed(3)}`}
                    </span>
                    {finding.effect_summary && (
                      <span className="inline-block font-mono text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-[3px]">
                        {finding.effect_summary}
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
                      {finding?.insight || section.heading}
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
            <p className="font-ui text-xs text-muted">
              Generated by DataStory &middot; Powered by GLM 5.1
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
