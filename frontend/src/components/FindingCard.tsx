"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";
import { API_URL } from "@/lib/api";

interface FindingCardProps {
  finding: Finding;
  sessionId: string;
  index?: number;
}

function formatPValue(p: number): string {
  if (p < 0.001) return "p < 0.001";
  if (p < 0.01) return "p < 0.01";
  return `p = ${p.toFixed(3)}`;
}

export default function FindingCard({ finding, index = 0 }: FindingCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <article
      className={`
        py-8 border-b border-border animate-fade-in-up
        ${finding.isDeepDive ? "border-l-2 border-l-gold pl-6 ml-0 bg-gold/[0.03]" : ""}
      `}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {finding.isDeepDive && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
          <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.15em] text-gold">
            Autonomous Deep Dive
          </span>
        </div>
      )}

      <h3 className="font-body text-lg leading-relaxed text-ink mb-4">
        {finding.hypothesis}
      </h3>

      {finding.chart_url && (
        <div
          className={`
            my-4 border border-border rounded-[4px] overflow-hidden bg-chart-bg
            transition-opacity duration-500
            ${imageLoaded ? "opacity-100" : "opacity-0"}
          `}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finding.chart_url.startsWith("http") ? finding.chart_url : `${API_URL}${finding.chart_url}`}
            alt={`Chart: ${finding.hypothesis}`}
            className="w-full h-auto"
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}

      {/* Shimmer placeholder while chart loads */}
      {finding.chart_url && !imageLoaded && (
        <div className="my-4 h-48 rounded-[4px] animate-shimmer" />
      )}

      <div className="flex flex-wrap items-center gap-2.5 mt-3">
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
