"use client";

import React, { useState, useMemo } from "react";
import {
  PhoneCall,
  Eye,
  Building2,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  Sparkles,
  Flame,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Lead } from "@/lib/google-sheets";
import type { EnquiryRecord } from "@/lib/hsk-sheets-schema";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LeadTableProps {
  leads?: Lead[];
  enquiries?: EnquiryRecord[];
  selectedLead?: Lead | null;
  onSelectLead: (lead: any) => void;
  onCallLead?: (lead: any) => void;
  loading?: boolean;
  compact?: boolean;
  onViewAll?: () => void;
  isDemo?: boolean;
  onCreateTestEnquiry?: () => void;
}

export function LeadTable({
  leads = [],
  enquiries = [],
  selectedLead,
  onSelectLead,
  onCallLead,
  loading = false,
  compact = false,
  onViewAll,
  isDemo = false,
  onCreateTestEnquiry,
}: LeadTableProps) {
  // Pagination State for Full Table View
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = compact ? 6 : 10;

  // Normalize data items (support either EnquiryRecord or Lead)
  const items = useMemo(() => {
    if (enquiries && enquiries.length > 0) {
      return enquiries.map((enq) => ({
        id: enq.enquiry_id,
        name: enq.customer_name || "Customer",
        phone: enq.phone_number || "—",
        project: enq.project_interest || "HSK Solitaire 3B",
        source: enq.source || "Website",
        campaign: enq.utm_campaign || "Direct",
        notes: enq.customer_notes || "",
        queueClass: enq.queue_class || "FRESH",
        status: enq.current_status || "NEW",
        attempts: `${enq.customer_no_answer_count || 0}/3`,
        techAttempts: enq.technical_failures_count || 0,
        lastCall: enq.last_call_at,
        nextRetry: enq.next_retry_at,
        disposition: enq.latest_disposition || "—",
        qualification: enq.qualification_status || "—",
        outcomeId: enq.latest_outcome_id,
        createdAt: enq.created_at,
        error: enq.error_details,
        raw: enq,
      }));
    }

    return leads.map((l, idx) => ({
      id: l.enquiryId || `ENQ-${String(idx + 1).padStart(4, "0")}`,
      name: l.name,
      phone: l.phone,
      project: l.propertyInterest || "HSK Solitaire 3B",
      source: "Website",
      campaign: "Direct",
      notes: l.notes || "",
      queueClass: l.queueClass || "FRESH",
      status: l.callStatus === "Completed" ? "QUALIFIED" : l.callStatus === "Calling" ? "CALLING" : "QUEUED",
      attempts: `${l.customerNoAnswerCount || 0}/3`,
      techAttempts: 0,
      lastCall: l.calledAt,
      nextRetry: l.nextRetryAt,
      disposition: l.latestDisposition || (l.callStatus === "Completed" ? "COMPLETED" : "—"),
      qualification: l.interestStatus || "—",
      outcomeId: l.latestOutcomeId,
      createdAt: l.calledAt || "Recent",
      error: l.interestReason,
      raw: l,
    }));
  }, [enquiries, leads]);

  const totalPages = Math.ceil(items.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    if (compact) return items.slice(0, pageSize);
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize, compact]);

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
    if (s.includes("CALLING")) {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ background: "#e0f2fe", color: "#0369a1" }}
        >
          {status}
        </span>
      );
    }
    if (s.includes("RETRY") || s.includes("CALLBACK") || s.includes("WARNING")) {
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
        style={{ background: "#f1f5f9", color: "#334155" }}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden w-full">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-1/4 h-3.5 bg-slate-100 rounded" />
                <div className="w-1/6 h-2.5 bg-slate-100 rounded" />
              </div>
              <div className="w-20 h-4 bg-slate-100 rounded shrink-0" />
              <div className="w-24 h-4 bg-slate-100 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden w-full">
        {compact && (
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Recent Enquiries
              </h3>
              <p className="text-xs text-slate-500">Persisted in Google Sheets Enquiries tab.</p>
            </div>
          </div>
        )}
        <div className="p-12 text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-3 border border-slate-200">
            <FileSpreadsheet className="w-5 h-5 text-slate-700" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
            No enquiries recorded yet
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Inbound prospect submissions from your website will appear here in real time.
          </p>
          {onCreateTestEnquiry && (
            <button
              onClick={onCreateTestEnquiry}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Create Synthetic Test Enquiry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden w-full">
      {/* Compact View Header */}
      {compact && (
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Recent Inbound Enquiries
            </h3>
            <span className="text-[11px] font-mono text-slate-400">({items.length})</span>
            {isDemo && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Demo
              </span>
            )}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-[11px]">
              <th className="py-2.5 px-4 font-normal">Enquiry ID & Customer</th>
              <th className="py-2.5 px-3 font-normal">Project</th>
              <th className="py-2.5 px-3 font-normal">Queue Tier</th>
              <th className="py-2.5 px-3 font-normal">Status</th>
              <th className="py-2.5 px-3 font-normal text-center">Attempts</th>
              <th className="py-2.5 px-3 font-normal">Disposition</th>
              <th className="py-2.5 px-3 font-normal">Qualification</th>
              <th className="py-2.5 px-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.map((item) => {
              const initials = getInitials(item.name);
              const isSelected =
                selectedLead &&
                ((selectedLead as any).enquiry_id === item.id || (selectedLead as any).enquiryId === item.id);

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectLead(item.raw)}
                  className={cn(
                    "hover:bg-slate-50/80 transition-colors cursor-pointer group",
                    isSelected && "bg-slate-50"
                  )}
                >
                  {/* Enquiry ID & Customer */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-[11px] shrink-0 border border-slate-200">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 group-hover:text-slate-700 transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                          <span className="text-slate-500">{item.id}</span>
                          <span>•</span>
                          <span>{item.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Project Interest */}
                  <td className="py-3 px-3">
                    <span className="font-normal text-slate-700 truncate max-w-[130px] block" title={item.project}>
                      {item.project}
                    </span>
                  </td>

                  {/* Queue Class */}
                  <td className="py-3 px-3">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                      style={{
                        background:
                          item.queueClass === "FRESH"
                            ? "#dcfae5"
                            : item.queueClass === "RETRY"
                            ? "#e0f2fe"
                            : "#f1f5f9",
                        color:
                          item.queueClass === "FRESH"
                            ? "#04250e"
                            : item.queueClass === "RETRY"
                            ? "#0369a1"
                            : "#334155",
                      }}
                    >
                      {item.queueClass}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">{renderStatusPill(item.status)}</td>

                  {/* Attempts */}
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-slate-700 font-medium tabular-nums">
                      {item.attempts}
                    </span>
                    {item.techAttempts > 0 && (
                      <span className="text-[10px] text-amber-700 block font-mono">
                        +{item.techAttempts} err
                      </span>
                    )}
                  </td>

                  {/* Latest Disposition */}
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] text-slate-600">
                      {item.disposition}
                    </span>
                  </td>

                  {/* Qualification */}
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        item.qualification.includes("QUALIFIED") || item.qualification.includes("INTERESTED")
                          ? "text-emerald-700"
                          : "text-slate-600"
                      )}
                    >
                      {item.qualification}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectLead(item.raw)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {onCallLead && (
                        <button
                          onClick={() => onCallLead(item.raw)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Call now"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!compact && totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
