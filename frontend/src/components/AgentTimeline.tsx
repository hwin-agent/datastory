"use client";

import type { TimelineStep } from "@/lib/types";

interface AgentTimelineProps {
  steps: TimelineStep[];
}

export default function AgentTimeline({ steps }: AgentTimelineProps) {
  return (
    <nav className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-start gap-3 relative">
          {/* Vertical line */}
          <div className="flex flex-col items-center">
            <div
              className={`
                w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1
                ${step.status === "active" ? "bg-accent animate-pulse-dot" : ""}
                ${step.status === "complete" && !step.isDeepDive ? "bg-accent" : ""}
                ${step.status === "complete" && step.isDeepDive ? "bg-gold" : ""}
                ${step.status === "pending" ? "bg-border" : ""}
              `}
            />
            {i < steps.length - 1 && (
              <div
                className={`
                  w-0.5 flex-1 min-h-6
                  ${step.status === "complete" ? "bg-accent" : "bg-border"}
                `}
              />
            )}
          </div>
          {/* Text */}
          <p
            className={`
              font-ui text-sm leading-snug pb-4
              ${step.status === "active" ? "text-ink font-medium" : ""}
              ${step.status === "complete" ? "text-muted" : ""}
              ${step.status === "pending" ? "text-border" : ""}
            `}
          >
            {step.label}
          </p>
        </div>
      ))}
    </nav>
  );
}
