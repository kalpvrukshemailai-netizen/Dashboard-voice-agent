"use client";

import React from "react";
import {
  Clock,
  Radio,
  Lock,
  Unlock,
  AlertTriangle,
  Flame,
  RotateCcw,
  Archive,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnquiryRecord } from "@/lib/hsk-sheets-schema";

interface QueueSummaryCardProps {
  enquiries: EnquiryRecord[];
  isCallingWindowOpen: boolean;
  nextWindowOpensAt?: string | null;
  dialerLock?: {
    locked: boolean;
    session_id?: string | null;
    enquiry_id?: string | null;
    locked_at?: string | null;
  };
  onTriggerWorker?: () => void;
  isTriggering?: boolean;
}

export function QueueSummaryCard({
  enquiries = [],
  isCallingWindowOpen = true,
  nextWindowOpensAt,
  dialerLock,
  onTriggerWorker,
  isTriggering = false,
}: QueueSummaryCardProps) {
  const now = Date.now();

  // Fresh waiting (received within calling hours, queued)
  const freshCount = enquiries.filter(
    (e) =>
      e.queue_class === "FRESH" &&
      (e.current_status === "NEW" || e.current_status === "QUEUED")
  ).length;

  // Due retries (retry scheduled, timer elapsed)
  const dueRetryCount = enquiries.filter(
    (e) =>
      e.current_status === "RETRY_SCHEDULED" &&
      e.next_retry_at &&
      new Date(e.next_retry_at).getTime() <= now
  ).length;

  // Pending retries waiting for timer
  const pendingRetryCount = enquiries.filter(
    (e) =>
      e.current_status === "RETRY_SCHEDULED" &&
      e.next_retry_at &&
      new Date(e.next_retry_at).getTime() > now
  ).length;

  // Overnight backlog (received 10 PM - 9 AM)
  const backlogCount = enquiries.filter(
    (e) => e.queue_class === "BACKLOG" && (e.current_status === "NEW" || e.current_status === "QUEUED")
  ).length;

  const isLocked = dialerLock?.locked === true;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-2xs">
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-950 tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Queue Telemetry &amp; Concurrency Dispatcher
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic priority: 1. Fresh Intake (&lt;2 min) → 2. Due Retries → 3. Overnight Backlog
            </p>
          </div>
        </div>

        {/* Dialer Lock Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto border shadow-2xs",
            isLocked
              ? "bg-[#451a03] text-[#fef3c7] border-[#fde68a]"
              : "bg-[#04250e] text-[#dcfae5] border-[#bbf7d0]"
          )}
        >
          {isLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-mono text-xs">
                Lock Active: {dialerLock?.enquiry_id || "Calling"}
              </span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-xs">Dialer Concurrency Idle</span>
            </>
          )}
        </div>
      </div>

      {/* ── 3-Tier Queue Breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tier 1: FRESH */}
        <div className="p-4.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex items-start justify-between shadow-2xs">
          <div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1.5">
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Fresh Intake</span>
            </div>
            <div
              className="text-3xl font-extrabold text-slate-950 tabular-nums tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {freshCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Targeted &lt;2 min from web intake
            </p>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-[#bbf7d0]"
            style={{ background: "#dcfae5", color: "#04250e" }}
          >
            Priority 1
          </span>
        </div>

        {/* Tier 2: RETRY */}
        <div className="p-4.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex items-start justify-between shadow-2xs">
          <div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>2. Due Retries</span>
            </div>
            <div
              className="text-3xl font-extrabold text-slate-950 tabular-nums tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {dueRetryCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {pendingRetryCount > 0 ? `+${pendingRetryCount} waiting timer` : "2-min backoff due"}
            </p>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-[#bae6fd]"
            style={{ background: "#e0f2fe", color: "#0369a1" }}
          >
            Priority 2
          </span>
        </div>

        {/* Tier 3: BACKLOG */}
        <div className="p-4.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex items-start justify-between shadow-2xs">
          <div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1.5">
              <Archive className="w-3.5 h-3.5 text-slate-600" />
              <span>3. Overnight Backlog</span>
            </div>
            <div
              className="text-3xl font-extrabold text-slate-950 tabular-nums tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {backlogCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Processed 9 AM IST daily
            </p>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-200"
            style={{ background: "#f1f5f9", color: "#334155" }}
          >
            Priority 3
          </span>
        </div>
      </div>

      {/* ── Operational Footer: Calling Window & Fast Action ── */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Calling Hours: <strong className="text-slate-800">9:00 AM – 10:00 PM IST</strong>
            {!isCallingWindowOpen && nextWindowOpensAt && (
              <span className="text-amber-700 ml-1 font-mono text-[11px]">
                (Next window: {nextWindowOpensAt})
              </span>
            )}
          </span>
        </div>

        {onTriggerWorker && (
          <button
            onClick={onTriggerWorker}
            disabled={isTriggering}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors self-start sm:self-auto disabled:opacity-60 shadow-2xs"
          >
            <RefreshCw className={cn("w-3 h-3 text-emerald-400", isTriggering && "animate-spin")} />
            <span>{isTriggering ? "Evaluating Queue..." : "Run Queue Evaluation Tick"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
