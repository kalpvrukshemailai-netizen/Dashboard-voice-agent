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
      return enquiries.map((enq, idx) => ({
        id: enq.enquiry_id,
        name: enq.customer_name,
        phone: enq.phone_number,
        project: enq.project_interest || "HSK Builder Group",
        source: enq.source || "Website",
        campaign: enq.utm_campaign || "—",
        notes: enq.customer_notes || "",
        queueClass: enq.queue_class,
        status: enq.current_status,
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
      project: l.propertyInterest || "HSK Builder Group",
      source: "Website",
      campaign: "—",
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

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs w-full">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
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
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs w-full">
        {compact && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Recent Enquiries
              </h3>
              <p className="text-xs text-slate-500">Persisted in Enquiries sheet tab.</p>
            </div>
          </div>
        )}
        <div className="p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center mb-3.5 border border-teal-100 shadow-2xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
            No enquiries in Google Sheet yet
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            The dedicated HSK Google Spreadsheet is connected. Inbound website submissions will automatically appear here in real time.
          </p>
          {onCreateTestEnquiry && (
            <button
              onClick={onCreateTestEnquiry}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-2xs"
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
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs w-full">
      {/* Compact Header */}
      {compact && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Recent Enquiries
            </h3>
            {isDemo && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                [DEMO SAMPLE]
              </span>
            )}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>View All ({items.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider font-mono">
              <th className="py-3 px-4">Enquiry ID & Customer</th>
              <th className="py-3 px-3">Project</th>
              <th className="py-3 px-3">Queue Tier</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-center">Attempts</th>
              <th className="py-3 px-3">Latest Disposition</th>
              <th className="py-3 px-3">Qualification</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.map((item) => {
              const initials = getInitials(item.name);
              const isSelected = selectedLead && ((selectedLead as any).enquiry_id === item.id || (selectedLead as any).enquiryId === item.id);

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectLead(item.raw)}
                  className={cn(
                    "hover:bg-slate-50/80 transition-colors cursor-pointer group",
                    isSelected && "bg-teal-50/40",
                  )}
                >
                  {/* Enquiry ID & Customer */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-200">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-600">{item.id}</span>
                          <span>•</span>
                          <span>{item.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Project Interest */}
                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-700 truncate max-w-[130px] block" title={item.project}>
                      {item.project}
                    </span>
                  </td>

                  {/* Queue Class */}
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold font-mono",
                        item.queueClass === "FRESH"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : item.queueClass === "RETRY"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : item.queueClass === "BACKLOG"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {item.queueClass === "FRESH" && <Flame className="w-3 h-3 text-emerald-600" />}
                      {item.queueClass === "RETRY" && <RotateCcw className="w-3 h-3 text-blue-600" />}
                      {item.queueClass}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10.5px] font-semibold",
                        item.status === "QUALIFIED"
                          ? "bg-emerald-100 text-emerald-900"
                          : item.status === "CALLING"
                          ? "bg-amber-100 text-amber-900 animate-pulse font-bold"
                          : item.status === "RETRY_SCHEDULED"
                          ? "bg-blue-100 text-blue-900"
                          : item.status === "NOT_ANSWERED"
                          ? "bg-rose-100 text-rose-900"
                          : item.status === "DO_NOT_CALL"
                          ? "bg-slate-200 text-slate-800 font-bold"
                          : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {item.status}
                    </span>
                  </td>

                  {/* Attempts (Customer / Tech) */}
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-slate-700 font-medium">
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

                  {/* AI Qualification */}
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "font-medium",
                        item.qualification === "QUALIFIED" || item.qualification === "INTERESTED"
                          ? "text-emerald-700 font-bold"
                          : item.qualification === "NOT_INTERESTED"
                          ? "text-slate-400"
                          : "text-slate-500",
                      )}
                    >
                      {item.qualification}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLead(item.raw);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer for Full Table */}
      {!compact && totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, items.length)} of {items.length} enquiries
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
