"use client";

import type { TimelineStep } from "@/lib/types";

interface AgentTimelineProps {
  steps: TimelineStep[];
}

export default function AgentTimeline({ steps }: AgentTimelineProps) {
  return (
    <nav className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className="flex items-start gap-3 relative animate-slide-in-left"
          style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
        >
          {/* Vertical line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={`
                w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-colors duration-300
                ${step.status === "active" && !step.isDeepDive ? "bg-accent animate-pulse-dot" : ""}
                ${step.status === "active" && step.isDeepDive ? "bg-gold animate-deep-dive-glow" : ""}
                ${step.status === "complete" && !step.isDeepDive ? "bg-accent" : ""}
                ${step.status === "complete" && step.isDeepDive ? "bg-gold" : ""}
                ${step.status === "pending" ? "bg-border" : ""}
              `}
            />
            {i < steps.length - 1 && (
              <div
                className={`
                  w-0.5 flex-1 min-h-5 transition-colors duration-300
                  ${step.status === "complete" && !step.isDeepDive ? "bg-accent/30" : ""}
                  ${step.status === "complete" && step.isDeepDive ? "bg-gold/30" : ""}
                  ${step.status !== "complete" ? "bg-border" : ""}
                `}
              />
            )}
          </div>
          {/* Text */}
          <p
            className={`
              font-ui text-[13px] leading-snug pb-3.5
              ${step.status === "active" ? "text-ink font-medium" : ""}
              ${step.status === "complete" && !step.isDeepDive ? "text-muted" : ""}
              ${step.status === "complete" && step.isDeepDive ? "text-gold font-medium" : ""}
              ${step.status === "pending" ? "text-muted/50" : ""}
            `}
          >
            {step.isDeepDive && step.status === "active" && (
              <span className="block font-ui text-[10px] font-semibold uppercase tracking-[0.15em] text-gold mb-0.5">
                Deep Dive
              </span>
            )}
            {step.label}
            {step.status === "active" && (
              <span className="inline-block w-[3px] h-3.5 bg-accent ml-1 -mb-0.5 animate-cursor" />
            )}
          </p>
        </div>
      ))}
    </nav>
  );
}
