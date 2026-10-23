"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Clock,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PhoneCall,
  UserCheck,
  Building2,
  CalendarCheck,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  ShieldCheck,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import type { EnquiryRecord, CallOutcomeRecord } from "@/lib/hsk-sheets-schema";
import { Lead } from "@/lib/google-sheets";
import { cn } from "@/lib/utils";
import { NavTab } from "./sidebar";

interface OverviewViewProps {
  enquiries: EnquiryRecord[];
  outcomes: CallOutcomeRecord[];
  leads: Lead[];
  isLoading: boolean;
  isRefreshing: boolean;
  isExplicitDemo: boolean;
  connectionStatus: "connected" | "error" | "mock";
  isCallingWindowOpen: boolean;
  nextWindowOpensAt?: string | null;
  dialerLock: {
    locked: boolean;
    session_id?: string | null;
    enquiry_id?: string | null;
    locked_at?: string | null;
  };
  onTriggerWorker: () => void;
  isTriggeringWorker: boolean;
  onCreateSyntheticEnquiry: () => void;
  onSelectLead: (lead: any) => void;
  onNavigateTab: (tab: NavTab) => void;
}

type ViewMode = "split" | "enquiries" | "outcomes";

export function OverviewView({
  enquiries = [],
  outcomes = [],
  leads = [],
  isLoading = false,
  isRefreshing = false,
  isExplicitDemo = false,
  connectionStatus = "connected",
  isCallingWindowOpen = true,
  nextWindowOpensAt,
  dialerLock,
  onTriggerWorker,
  isTriggeringWorker = false,
  onCreateSyntheticEnquiry,
  onSelectLead,
  onNavigateTab,
}: OverviewViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [selectedAuditOutcome, setSelectedAuditOutcome] = useState<any | null>(null);

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayTime = startOfDay.getTime();

  // ── Core Arithmetic Data Reconciled Across Records ──
  const totalEnquiries = enquiries.length > 0 ? enquiries.length : leads.length;

  const freshWaiting = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.queue_class === "FRESH" &&
          (e.current_status === "NEW" || e.current_status === "QUEUED")
      ).length
    : leads.filter((l) => l.callStatus === "Pending" && l.queueClass === "FRESH").length;

  const dueRetries = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.current_status === "RETRY_SCHEDULED" &&
          e.next_retry_at &&
          new Date(e.next_retry_at).getTime() <= now
      ).length
    : leads.filter(
        (l) =>
          l.callStatus === "Pending" &&
          l.nextRetryAt &&
          new Date(l.nextRetryAt).getTime() <= now
      ).length;

  const callsAttemptedToday = outcomes.length > 0
    ? outcomes.filter((o) => {
        const t = new Date(o.call_started_at || o.call_start_time || o.recorded_at).getTime();
        return t >= startOfDayTime;
      }).length
    : enquiries.filter((e) => {
        if (!e.last_call_at) return false;
        return new Date(e.last_call_at).getTime() >= startOfDayTime;
      }).length;

  const callsCompleted = outcomes.length > 0
    ? outcomes.length
    : enquiries.filter(
        (e) =>
          e.current_status === "QUALIFIED" ||
          e.current_status === "DISQUALIFIED" ||
          e.current_status === "NOT_ANSWERED" ||
          e.current_status === "DO_NOT_CALL" ||
          e.latest_outcome_id !== null
      ).length;

  const answeredCustomers = outcomes.length > 0
    ? outcomes.filter(
        (o) =>
          (o.disposition || o.call_disposition) === "COMPLETED" ||
          (o.disposition || o.call_disposition) === "ANSWERED"
      ).length
    : enquiries.filter(
        (e) =>
          e.current_status === "QUALIFIED" ||
          e.current_status === "DISQUALIFIED" ||
          (e.customer_no_answer_count > 0 && e.attempt_sequence_count > e.customer_no_answer_count)
      ).length;

  const interestedCustomers = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.current_status === "QUALIFIED" ||
          e.qualification_status === "QUALIFIED" ||
          e.qualification_status === "INTERESTED"
      ).length
    : leads.filter(
        (l) =>
          l.interested === true ||
          (l.interestStatus && l.interestStatus.toUpperCase() === "QUALIFIED")
      ).length;

  const qualificationDenominator = answeredCustomers > 0 ? answeredCustomers : callsCompleted;
  const qualificationRate =
    qualificationDenominator > 0
      ? Math.round((interestedCustomers / qualificationDenominator) * 100)
      : 0;

  // Normalized Enquiries List
  const normalizedEnquiries = useMemo(() => {
    if (enquiries.length > 0) {
      return enquiries.map((e) => ({
        id: e.enquiry_id,
        name: e.customer_name || "Customer",
        phone: e.phone_number || "—",
        project: e.project_interest || "HSK Builder Group",
        queueClass: e.queue_class || "FRESH",
        status: e.current_status || "NEW",
        attempts: `${e.attempt_sequence_count || 0}/3`,
        latestDisposition: e.latest_disposition || "—",
        qualification: e.qualification_status || "—",
        raw: e,
      }));
    }
    return leads.map((l, idx) => ({
      id: l.enquiryId || `ENQ-DEMO-${idx + 1}`,
      name: l.name,
      phone: l.phone,
      project: l.propertyInterest || "HSK Solitaire 3B",
      queueClass: l.queueClass || "FRESH",
      status: l.callStatus === "Completed" ? (l.interested ? "QUALIFIED" : "DISQUALIFIED") : "QUEUED",
      attempts: `${l.attemptSequenceCount || 0}/3`,
      latestDisposition: l.callStatus === "Completed" ? "COMPLETED" : "—",
      qualification: l.interested ? "QUALIFIED" : l.interested === false ? "NOT_INTERESTED" : "—",
      raw: l,
    }));
  }, [enquiries, leads]);

  // Map outcomes with associated enquiries
  const enquiryMap = useMemo(() => {
    const map = new Map<string, EnquiryRecord>();
    enquiries.forEach((e) => map.set(e.enquiry_id, e));
    return map;
  }, [enquiries]);

  // Normalized Call Outcomes List
  const normalizedOutcomes = useMemo(() => {
    if (outcomes.length > 0) {
      return outcomes.map((o) => {
        const enq = enquiryMap.get(o.enquiry_id);
        const mins = Math.floor((o.duration_seconds || 0) / 60);
        const secs = (o.duration_seconds || 0) % 60;
        const durFormatted = `${mins}m ${String(secs).padStart(2, "0")}s`;

        let timeFormatted = "Recently";
        try {
          const d = new Date(o.call_started_at || o.call_start_time || o.recorded_at);
          timeFormatted = d.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        } catch {
          // fallback
        }

        return {
          id: o.outcome_id,
          enquiryId: o.enquiry_id,
          name: enq?.customer_name || "Prospect",
          phone: enq?.phone_number || "—",
          duration: durFormatted,
          time: timeFormatted,
          disposition: o.disposition || o.call_disposition || "COMPLETED",
          qualification:
            o.qualification_status ||
            (o.interested === true ? "QUALIFIED" : o.interested === false ? "NOT_INTERESTED" : "PENDING"),
          project: o.property_interest || o.property_config || enq?.project_interest || "HSK Solitaire",
          budget: o.budget_range || "—",
          nextStep: o.next_step_type || o.site_visit || "Follow-up",
          summary: o.transcript_summary || o.qualification_summary || "Call completed.",
          raw: o,
        };
      });
    }

    // Demo fallback outcomes
    return leads
      .filter((l) => l.callStatus === "Completed" || l.calledAt)
      .map((l, idx) => ({
        id: l.latestOutcomeId || `OUT-000${idx + 1}`,
        enquiryId: l.enquiryId || `ENQ-000${idx + 1}`,
        name: l.name,
        phone: l.phone,
        duration: "1m 45s",
        time: "Today 02:18 PM",
        disposition: "COMPLETED",
        qualification: l.interested ? "QUALIFIED" : "NOT_INTERESTED",
        project: l.propertyInterest || "HSK Solitaire",
        budget: "1.2 - 1.5 Cr",
        nextStep: l.interested ? "Site Visit Requested" : "Archived",
        summary: l.notes || "Qualification discussion completed with prospective buyer.",
        raw: l,
      }));
  }, [outcomes, enquiries, enquiryMap, leads]);

  const isLocked = dialerLock?.locked === true;

  // Render Pill helper based on taste-skill token guidelines
  const renderStatusPill = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s.includes("QUALIFIED") || s === "COMPLETED") {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ background: "#dcfae5", color: "#04250e" }}
        >
          {status}
        </span>
      );
    }
    if (s.includes("DISQUALIFIED") || s.includes("FAILED") || s === "NOT_INTERESTED") {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ background: "#ffedea", color: "#831c1e" }}
        >
          {status}
        </span>
      );
    }
    if (s.includes("RETRY") || s.includes("WARNING")) {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ background: "#fffbeb", color: "#92400e" }}
        >
          {status}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
        style={{ background: "#ebedee", color: "#353736" }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5 min-w-0 w-full animate-in fade-in duration-150">
      {/* ── 1. OPERATIONAL TITLE & COMMAND BAR (taste-skill Framed Sheet) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-1 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-[21px] font-semibold tracking-tight text-slate-900"
              style={{ fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" }}
            >
              Command Center
            </h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-mono font-medium tracking-wide"
              style={{ background: "#ebedee", color: "#353736" }}
            >
              HSK BUILDER GROUP
            </span>
          </div>
          <p className="text-[12.5px] text-slate-500 mt-0.5 font-normal">
            Real-time enquiry intake, queue priority order, and AI voice qualification funnel.
          </p>
        </div>

        {/* Primary Job Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onTriggerWorker}
            disabled={isTriggeringWorker}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs disabled:opacity-60"
            title="Evaluate priority queue and claim next fresh prospect or retry"
          >
            <RotateCcw className={cn("w-3.5 h-3.5 text-slate-500", isTriggeringWorker && "animate-spin")} />
            <span>{isTriggeringWorker ? "Evaluating..." : "Run Queue Tick"}</span>
          </button>

          <button
            onClick={onCreateSyntheticEnquiry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs"
            title="Inject test prospect to verify Google Sheet webhook & live queue intake"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Test Intake</span>
          </button>

          <button
            onClick={() => onNavigateTab("leads")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs"
          >
            <span>All Enquiries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2. ANTI-SLOP TYPE-DRIVEN KPI SUITE (taste-skill App Rule) ── */}
      {/* 4 Essential Operational Numbers with Tabular Figures & Clean Subtext */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Inbound Enquiries */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500">Total Enquiries</span>
            <span className="text-[11px] font-mono text-slate-400">Sheet tab: Enquiries</span>
          </div>
          <div className="my-1.5">
            <span
              className="text-[28px] font-normal tracking-tight text-slate-900 tabular-nums"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {isLoading ? "..." : totalEnquiries}
            </span>
          </div>
          <div className="text-[11.5px] text-slate-600 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-emerald-800">{freshWaiting} fresh</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">{dueRetries} due retries</span>
          </div>
        </div>

        {/* KPI 2: AI Calls Placed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500">AI Calls Attempted</span>
            <span className="text-[11px] font-mono text-slate-400">Exotel + 11Labs</span>
          </div>
          <div className="my-1.5">
            <span
              className="text-[28px] font-normal tracking-tight text-slate-900 tabular-nums"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {isLoading ? "..." : callsAttemptedToday}
            </span>
          </div>
          <div className="text-[11.5px] text-slate-600 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-900">{callsCompleted} total logged</span>
            <span className="text-slate-300">•</span>
            <span>{answeredCustomers} answered</span>
          </div>
        </div>

        {/* KPI 3: Qualification Yield */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500">Qualification Rate</span>
            <span className="text-[11px] font-mono text-slate-400">
              {interestedCustomers}/{qualificationDenominator} answered
            </span>
          </div>
          <div className="my-1.5">
            <span
              className="text-[28px] font-normal tracking-tight text-slate-900 tabular-nums"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {qualificationRate}%
            </span>
          </div>
          <div className="text-[11.5px] text-emerald-800 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
            <span>{interestedCustomers} qualified for site visit</span>
          </div>
        </div>

        {/* KPI 4: Queue Health & Calling Window */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500">Dialer Concurrency</span>
            <span className="text-[11px] font-mono text-slate-400">9 AM – 10 PM IST</span>
          </div>
          <div className="my-1.5 flex items-center gap-2">
            <span
              className="text-[28px] font-normal tracking-tight text-slate-900 tabular-nums"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {isLocked ? "1 Active" : "0 / 1 Idle"}
            </span>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-mono"
              style={{
                background: isCallingWindowOpen ? "#dcfae5" : "#fffbeb",
                color: isCallingWindowOpen ? "#04250e" : "#92400e",
              }}
            >
              {isCallingWindowOpen ? "Window Open" : "Outside Window"}
            </span>
          </div>
          <div className="text-[11.5px] text-slate-500 truncate">
            {isLocked
              ? `Processing ${dialerLock.enquiry_id || "call"}`
              : "Serial dialer ready for intake"}
          </div>
        </div>
      </div>

      {/* ── 3. OPERATIONAL ENGINE STRIP (Calling Window & Queue SLA) ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Deterministic Priority:</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[11.5px]">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
              1. Fresh (&lt;2 min)
            </span>
            <span>→</span>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
              2. Due Retries (2 min backoff)
            </span>
            <span>→</span>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
              3. Backlog
            </span>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1 self-start md:self-auto bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
          <button
            onClick={() => setViewMode("split")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              viewMode === "split"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Dual View
          </button>
          <button
            onClick={() => setViewMode("enquiries")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              viewMode === "enquiries"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Enquiries Queue ({normalizedEnquiries.length})
          </button>
          <button
            onClick={() => setViewMode("outcomes")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              viewMode === "outcomes"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Voice Outcomes ({normalizedOutcomes.length})
          </button>
        </div>
      </div>

      {/* ── 4. WORKSPACE TABLES (Calibrated for Zero Horizontal Scrollbar) ── */}
      <div
        className={cn(
          "grid gap-5 min-w-0 w-full",
          viewMode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        )}
      >
        {/* ── PANEL A: RECENT ENQUIRIES QUEUE ── */}
        {(viewMode === "split" || viewMode === "enquiries") && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden min-w-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[13.5px] font-semibold text-slate-900">
                  Recent Inbound Enquiries
                </h3>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                  {normalizedEnquiries.length} records
                </span>
                {isExplicitDemo && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-mono"
                    style={{ background: "#fffbeb", color: "#92400e" }}
                  >
                    Demo
                  </span>
                )}
              </div>

              <button
                onClick={() => onNavigateTab("leads")}
                className="text-[11.5px] text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zero Horizontal Scroll Table */}
            <div className="w-full">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-[11px]">
                    <th className="py-2.5 px-4 font-normal w-[36%]">Customer & ID</th>
                    <th className="py-2.5 px-3 font-normal w-[22%]">Project</th>
                    <th className="py-2.5 px-2 font-normal w-[18%]">Queue</th>
                    <th className="py-2.5 px-2 font-normal w-[16%]">Status</th>
                    <th className="py-2.5 px-3 text-right font-normal w-[8%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {normalizedEnquiries.slice(0, viewMode === "enquiries" ? 15 : 6).map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onSelectLead(item.raw)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Customer & ID */}
                      <td className="py-3 px-4 truncate">
                        <div className="font-medium text-slate-900 group-hover:text-slate-700 transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate flex items-center gap-1.5">
                          <span className="text-slate-500">{item.id}</span>
                          <span>•</span>
                          <span>{item.phone}</span>
                        </div>
                      </td>

                      {/* Project */}
                      <td className="py-3 px-3 truncate">
                        <span className="text-slate-700 font-normal truncate block" title={item.project}>
                          {item.project}
                        </span>
                      </td>

                      {/* Queue Class */}
                      <td className="py-3 px-2">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                          style={{
                            background:
                              item.queueClass === "FRESH"
                                ? "#dcfae5"
                                : item.queueClass === "RETRY"
                                ? "#e0f2fe"
                                : "#ebedee",
                            color:
                              item.queueClass === "FRESH"
                                ? "#04250e"
                                : item.queueClass === "RETRY"
                                ? "#0369a1"
                                : "#353736",
                          }}
                        >
                          {item.queueClass}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2">{renderStatusPill(item.status)}</td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(item.raw);
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 group-hover:text-slate-700 transition-colors"
                          title="View lead profile"
                        >
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {normalizedEnquiries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No enquiries recorded yet. Test an intake above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PANEL B: RECENT CALL OUTCOMES & VOICE ARCHIVE ── */}
        {(viewMode === "split" || viewMode === "outcomes") && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden min-w-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[13.5px] font-semibold text-slate-900">
                  AI Call Outcomes & Qualification
                </h3>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                  {normalizedOutcomes.length} logged
                </span>
              </div>

              <button
                onClick={() => onNavigateTab("calls")}
                className="text-[11.5px] text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zero Horizontal Scroll Table */}
            <div className="w-full">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-[11px]">
                    <th className="py-2.5 px-4 font-normal w-[36%]">Prospect & Call ID</th>
                    <th className="py-2.5 px-2 font-normal w-[18%]">Duration</th>
                    <th className="py-2.5 px-2 font-normal w-[20%]">Qualification</th>
                    <th className="py-2.5 px-2 font-normal w-[18%]">Next Step</th>
                    <th className="py-2.5 px-3 text-right font-normal w-[8%]">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {normalizedOutcomes.slice(0, viewMode === "outcomes" ? 15 : 6).map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedAuditOutcome(item.raw)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Prospect & Call ID */}
                      <td className="py-3 px-4 truncate">
                        <div className="font-medium text-slate-900 group-hover:text-slate-700 transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate flex items-center gap-1.5">
                          <span className="text-slate-500">{item.id}</span>
                          <span>•</span>
                          <span>{item.time}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-2 font-mono text-slate-700 text-[11.5px] tabular-nums">
                        {item.duration}
                      </td>

                      {/* Qualification */}
                      <td className="py-3 px-2">{renderStatusPill(item.qualification)}</td>

                      {/* Next Step */}
                      <td className="py-3 px-2 truncate">
                        <span className="text-slate-700 truncate block text-[11.5px]" title={item.nextStep}>
                          {item.nextStep}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAuditOutcome(item.raw);
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 group-hover:text-slate-700 transition-colors"
                          title="Inspect audio transcript & criteria"
                        >
                          <Eye className="w-3.5 h-3.5 ml-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {normalizedOutcomes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No calls recorded yet. Initiated outbound calls will appear here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. LIGHTWEIGHT AUDIT MODAL (Inspecting Call Outcome from Overview) ── */}
      {selectedAuditOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Call Outcome Audit
                </h4>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                  {(selectedAuditOutcome as any).outcome_id || "OUTCOME-RECORD"} • Enquiry: {(selectedAuditOutcome as any).enquiry_id || "ENQ-RECORD"}
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditOutcome(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-mono text-[10px]">DISPOSITION</span>
                  <span className="font-semibold text-slate-800">
                    {(selectedAuditOutcome as any).disposition || (selectedAuditOutcome as any).call_disposition || "COMPLETED"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[10px]">DURATION</span>
                  <span className="font-mono text-slate-800">
                    {(selectedAuditOutcome as any).duration_seconds
                      ? `${Math.floor((selectedAuditOutcome as any).duration_seconds / 60)}m ${(selectedAuditOutcome as any).duration_seconds % 60}s`
                      : "1m 45s"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[10px]">PROPERTY CONFIG</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {(selectedAuditOutcome as any).property_interest || (selectedAuditOutcome as any).property_config || "HSK Solitaire"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[10px]">BUDGET RANGE</span>
                  <span className="font-medium text-slate-800">
                    {(selectedAuditOutcome as any).budget_range || "1.2 - 1.5 Cr"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium block mb-1">AI Transcript Summary</span>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 text-[11.5px] leading-relaxed max-h-40 overflow-y-auto">
                  {(selectedAuditOutcome as any).transcript_summary ||
                    (selectedAuditOutcome as any).qualification_summary ||
                    "Lead confirmed interest in 3 BHK unit at HSK Solitaire. Requested site visit next Saturday afternoon. Pre-approved for bank loan."}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAuditOutcome(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
