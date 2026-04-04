"use client";

import type { Finding } from "@/lib/types";
import { API_URL } from "@/lib/api";

interface FindingCardProps {
  finding: Finding;
  sessionId: string;
}

function formatPValue(p: number): string {
  if (p < 0.001) return "p < 0.001";
  if (p < 0.01) return `p < 0.01`;
  return `p = ${p.toFixed(3)}`;
}

export default function FindingCard({ finding }: FindingCardProps) {
  return (
    <article
      className={`
        py-8 border-b border-border
        ${finding.isDeepDive ? "border-l-2 border-l-gold pl-6 ml-0" : ""}
      `}
    >
      {finding.isDeepDive && (
        <span className="inline-block font-ui text-[11px] font-medium uppercase tracking-wider text-gold mb-2">
          Deep Dive
        </span>
      )}

      <h3 className="font-body text-lg leading-relaxed text-ink mb-4">
        {finding.hypothesis}
      </h3>

      {finding.chart_url && (
        <div className="my-4 border border-border rounded-[4px] overflow-hidden bg-chart-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finding.chart_url.startsWith("http") ? finding.chart_url : `${API_URL}${finding.chart_url}`}
            alt={`Chart for: ${finding.hypothesis}`}
            className="w-full h-auto"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-3">
        {finding.test_type && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[4px] bg-surface border border-border">
            <span className="font-mono text-xs text-muted font-medium">
              {finding.test_type.replace("_", "-")}
            </span>
          </span>
        )}
        {finding.p_value !== undefined && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[4px] bg-coral/10 border border-coral/20">
            <span className="font-mono text-xs text-coral font-medium">
              {formatPValue(finding.p_value)}
            </span>
          </span>
        )}
        {finding.effect_summary && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[4px] bg-accent/10 border border-accent/20">
            <span className="font-mono text-xs text-accent font-medium">
              {finding.effect_summary}
            </span>
          </span>
        )}
      </div>

      {finding.insight && (
        <p className="font-body text-base text-ink/70 mt-4 leading-relaxed italic">
          {finding.insight}
        </p>
      )}
    </article>
  );
}
