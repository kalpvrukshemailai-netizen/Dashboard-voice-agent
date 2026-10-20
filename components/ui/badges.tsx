import React from "react";
import { cn } from "@/lib/utils";
import { CallStatus } from "@/lib/google-sheets";

interface StatusBadgeProps {
  status: CallStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = String(status).toLowerCase();

  if (s === "completed") {
    return (
      <span
        className={cn("ds-badge ds-badge-success", className)}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success-dot)" }} />
        Completed
      </span>
    );
  }

  if (s === "calling" || s === "in_progress") {
    return (
      <span
        className={cn("ds-badge ds-badge-teal", className)}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: "var(--ai-teal)" }} />
        Calling
      </span>
    );
  }

  if (s === "failed") {
    return (
      <span
        className={cn("ds-badge ds-badge-error", className)}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--error-dot)" }} />
        Failed
      </span>
    );
  }

  // Pending
  return (
    <span
      className={cn("ds-badge ds-badge-neutral", className)}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--neutral-dot)" }} />
      Pending
    </span>
  );
}

interface InterestBadgeProps {
  status?: string | null;
  interested?: boolean | null;
  className?: string;
}

export function InterestBadge({ status, interested, className }: InterestBadgeProps) {
  const norm = (status || "").trim().toUpperCase();

  if (norm === "INTERESTED" || interested === true) {
    return (
      <span className={cn("ds-badge ds-badge-success", className)}>
        Interested
      </span>
    );
  }

  if (norm === "NOT INTERESTED" || interested === false) {
    return (
      <span className={cn("ds-badge ds-badge-neutral", className)}>
        Not Interested
      </span>
    );
  }

  if (norm === "NOT READY" || norm === "FOLLOW UP" || norm === "CALLBACK") {
    return (
      <span className={cn("ds-badge ds-badge-warning", className)}>
        Not Ready
      </span>
    );
  }

  return (
    <span className={cn("ds-badge", className)} style={{ background: "var(--neutral-bg)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
      {norm || "Unknown"}
    </span>
  );
}
