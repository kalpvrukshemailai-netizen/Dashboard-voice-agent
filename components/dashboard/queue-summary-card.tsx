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
      (e.current_status === "NEW" || e.current_status === "QUEUED"),
  ).length;

  // Due retries (retry scheduled, timer elapsed)
  const dueRetryCount = enquiries.filter(
    (e) =>
      e.current_status === "RETRY_SCHEDULED" &&
      e.next_retry_at &&
      new Date(e.next_retry_at).getTime() <= now,
  ).length;

  // Pending retries waiting for timer
  const pendingRetryCount = enquiries.filter(
    (e) =>
      e.current_status === "RETRY_SCHEDULED" &&
      e.next_retry_at &&
      new Date(e.next_retry_at).getTime() > now,
  ).length;

  // Overnight backlog (received 10 PM - 9 AM)
  const backlogCount = enquiries.filter(
    (e) => e.queue_class === "BACKLOG" && (e.current_status === "NEW" || e.current_status === "QUEUED"),
  ).length;

  const isLocked = dialerLock?.locked === true;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Queue Status & Dialer Concurrency
            </h3>
            <p className="text-[11.5px] text-slate-500">
              Deterministic priority: Newest Fresh → Due Retries (2-min) → Overnight Backlog
            </p>
          </div>
        </div>

        {/* Dialer Lock Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold self-start sm:self-auto",
            isLocked
              ? "bg-amber-50 text-amber-900 border border-amber-300"
              : "bg-emerald-50 text-emerald-900 border border-emerald-300",
          )}
        >
          {isLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Call in Progress ({dialerLock?.enquiry_id || dialerLock?.session_id || "Active"})</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dialer Idle (Concurrency Lock Available)</span>
            </>
          )}
        </div>
      </div>

      {/* ── 3-Tier Queue Breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tier 1: FRESH */}
        <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Fresh Intake</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-950 font-mono">
              {freshCount}
            </div>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Targeted within 2m
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Priority 1
          </span>
        </div>

        {/* Tier 2: RETRY */}
        <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/30 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold uppercase tracking-wider mb-1">
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Due Retries</span>
            </div>
            <div className="text-2xl font-extrabold text-blue-950 font-mono">
              {dueRetryCount}
            </div>
            <p className="text-[11px] text-blue-700 mt-0.5">
              {pendingRetryCount > 0 ? `+${pendingRetryCount} pending delay` : "Max 3 customer attempts"}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            Priority 2
          </span>
        </div>

        {/* Tier 3: BACKLOG */}
        <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/30 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Overnight Backlog</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-950 font-mono">
              {backlogCount}
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Processed 9 AM IST (oldest first)
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Priority 3
          </span>
        </div>
      </div>

      {/* ── Operational Footer: Calling Window & Fast Action ── */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>
            Calling Hours: <strong className="text-slate-800">9:00 AM – 10:00 PM IST</strong> (Daily)
            {!isCallingWindowOpen && nextWindowOpensAt && (
              <span className="text-amber-700 ml-1 font-medium">
                — Closed, opens at {new Date(nextWindowOpensAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
              </span>
            )}
          </span>
        </div>

        {onTriggerWorker && (
          <button
            onClick={onTriggerWorker}
            disabled={isTriggering}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isTriggering && "animate-spin")} />
            <span>{isTriggering ? "Processing Queue..." : "Trigger Queue Tick"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
