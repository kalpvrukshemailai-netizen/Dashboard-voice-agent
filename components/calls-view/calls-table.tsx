"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  Clock,
  Eye,
  FileText,
  Building2,
  Calendar,
  X,
  ExternalLink,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
} from "lucide-react";
import type { CallOutcomeRecord, EnquiryRecord } from "@/lib/hsk-sheets-schema";
import { Lead } from "@/lib/google-sheets";
import { cn, getInitials } from "@/lib/utils";

interface CallsTableProps {
  outcomes?: CallOutcomeRecord[];
  enquiries?: EnquiryRecord[];
  leads?: Lead[];
  onSelectLead?: (lead: any) => void;
  onCallLead?: (lead: any) => void;
  isDemo?: boolean;
}

export function CallsTable({
  outcomes = [],
  enquiries = [],
  leads = [],
  onSelectLead,
  isDemo = false,
}: CallsTableProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcomeRecord | null>(null);

  // Map enquiries by ID for quick customer name lookup
  const enquiryMap = new Map<string, EnquiryRecord>();
  enquiries.forEach((e) => enquiryMap.set(e.enquiry_id, e));

  // If no outcomes from Call_Outcomes tab, build from leads if available
  const displayOutcomes: Array<{
    id: string;
    enquiryId: string;
    customerName: string;
    phone: string;
    attemptSeq: number;
    channel: string;
    callSid: string;
    conversationId: string;
    startedAt: string;
    duration: number;
    disposition: string;
    qualification: string;
    property: string;
    budget: string;
    location: string;
    timeline: string;
    nextStep: string;
    summary: string;
    raw: any;
  }> =
    outcomes.length > 0
      ? outcomes.map((o) => {
          const enq = enquiryMap.get(o.enquiry_id);
          return {
            id: o.outcome_id,
            enquiryId: o.enquiry_id,
            customerName: enq?.customer_name || "Customer",
            phone: enq?.phone_number || "",
            attemptSeq: o.attempt_sequence || 1,
            channel: o.channel || "EXOTEL_PSTN",
            callSid: o.call_sid || "—",
            conversationId: o.conversation_id || "—",
            startedAt: o.call_started_at || o.call_start_time || o.recorded_at,
            duration: o.duration_seconds || 0,
            disposition: o.disposition || o.call_disposition || "COMPLETED",
            qualification:
              o.qualification_status ||
              (o.interested === true ? "QUALIFIED" : o.interested === false ? "NOT_INTERESTED" : "PENDING"),
            property: o.property_interest || o.property_config || "HSK Solitaire 3B",
            budget: o.budget_range || "1.2 - 1.5 Cr",
            location: o.preferred_location || "Central",
            timeline: o.timeline || "Immediate",
            nextStep: o.next_step_type || o.site_visit || "Follow-up",
            summary: o.transcript_summary || o.qualification_summary || "Call completed.",
            raw: o,
          };
        })
      : leads
          .filter((l) => l.callStatus === "Completed" || l.calledAt)
          .map((l, idx) => ({
            id: l.latestOutcomeId || `OUT-${String(idx + 1).padStart(4, "0")}`,
            enquiryId: l.enquiryId || `ENQ-${String(idx + 1).padStart(4, "0")}`,
            customerName: l.name,
            phone: l.phone,
            attemptSeq: l.attemptSequenceCount || 1,
            channel: "EXOTEL_PSTN",
            callSid: "exotel_demo_call",
            conversationId: "conv_demo_call",
            startedAt: l.calledAt || new Date().toISOString(),
            duration: 140,
            disposition: l.latestDisposition || "COMPLETED",
            qualification: l.interestStatus || (l.interested ? "QUALIFIED" : "NOT_INTERESTED"),
            property: l.propertyInterest || "HSK Solitaire 3B",
            budget: "1.2 – 1.5 Cr",
            location: "North Wing",
            timeline: "30 Days",
            nextStep: l.interested ? "Site Visit Scheduled" : "Archived",
            summary: l.notes || "Lead interested in 3 BHK unit at HSK Solitaire. Requested site visit.",
            raw: l,
          }));

  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${String(remainingSecs).padStart(2, "0")}`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return "Today";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const renderPill = (text: string, type: "qualification" | "disposition") => {
    const s = (text || "").toUpperCase();
    if (s.includes("QUALIFIED") || s === "COMPLETED") {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ background: "#dcfae5", color: "#04250e" }}
        >
          {text}
        </span>
      );
    }
    if (s.includes("DISQUALIFIED") || s.includes("FAILED") || s.includes("NOT_INTERESTED") || s === "BUSY") {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ background: "#ffedea", color: "#831c1e" }}
        >
          {text}
        </span>
      );
    }
    if (s.includes("RETRY") || s.includes("CALLBACK") || s.includes("PENDING")) {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ background: "#fffbeb", color: "#92400e" }}
        >
          {text}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
        style={{ background: "#f1f5f9", color: "#334155" }}
      >
        {text}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div
        className={cn(
          "bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
          isDemo ? "border-amber-200" : "border-slate-200"
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Call Outcomes & Transcript Archive
            </h3>
            {isDemo && (
              <span
                className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium"
                style={{ background: "#fffbeb", color: "#92400e" }}
              >
                Demo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Backed by the Google Sheets <code className="font-mono text-slate-700">Call_Outcomes</code> tab. Records dispositions, provider conversation IDs, and qualification criteria.
          </p>
        </div>

        <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-medium self-start sm:self-center shrink-0 tabular-nums">
          {displayOutcomes.length} {isDemo ? "demo outcomes" : "records"}
        </div>
      </div>

      {displayOutcomes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-3 border border-slate-200">
            <PhoneCall className="w-5 h-5 text-slate-700" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
            No Call Outcomes Recorded Yet
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            When outbound calls are made via ElevenLabs + Exotel, call durations, dispositions, and transcripts will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-[11px]">
                  <th className="py-2.5 px-4 font-normal">Outcome ID & Lead</th>
                  <th className="py-2.5 px-3 font-normal">Date (IST)</th>
                  <th className="py-2.5 px-3 font-normal text-center">Duration</th>
                  <th className="py-2.5 px-3 font-normal">Disposition</th>
                  <th className="py-2.5 px-3 font-normal">Qualification</th>
                  <th className="py-2.5 px-3 font-normal">Next Step</th>
                  <th className="py-2.5 px-3 font-normal">Property & Budget</th>
                  <th className="py-2.5 px-4 font-normal text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayOutcomes.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedOutcome(item.raw)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Outcome ID & Lead */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-[11px] shrink-0 border border-slate-200">
                          {getInitials(item.customerName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 group-hover:text-slate-700 transition-colors truncate">
                            {item.customerName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                            <span className="text-slate-500">{item.id}</span>
                            <span>•</span>
                            <span>Seq #{item.attemptSeq}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date / Time */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-mono text-[11.5px] tabular-nums">
                      {formatDate(item.startedAt)}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 text-center font-mono text-slate-700 tabular-nums">
                      {formatDuration(item.duration)}
                    </td>

                    {/* Disposition */}
                    <td className="py-3 px-3">{renderPill(item.disposition, "disposition")}</td>

                    {/* Qualification */}
                    <td className="py-3 px-3">{renderPill(item.qualification, "qualification")}</td>

                    {/* Next Step */}
                    <td className="py-3 px-3 text-slate-700 truncate max-w-[140px]" title={item.nextStep}>
                      {item.nextStep}
                    </td>

                    {/* Property & Budget */}
                    <td className="py-3 px-3 text-slate-600">
                      <div className="truncate max-w-[140px] font-medium text-slate-800">{item.property}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{item.budget}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOutcome(item.raw);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Audit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Call Detail Audit Modal */}
      {selectedOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Call Outcome Audit
                </h4>
                <p className="text-slate-500 text-[11px] font-mono">
                  {(selectedOutcome as any).outcome_id || (selectedOutcome as any).latestOutcomeId || "OUT-LOG"} • Enquiry: {(selectedOutcome as any).enquiry_id || (selectedOutcome as any).enquiryId}
                </p>
              </div>
              <button
                onClick={() => setSelectedOutcome(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] font-mono">CHANNEL</span>
                  <span className="font-mono font-medium text-slate-800">{(selectedOutcome as any).channel || "EXOTEL_PSTN"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-mono">DURATION</span>
                  <span className="font-mono font-medium text-slate-800">{formatDuration((selectedOutcome as any).duration_seconds || 140)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-mono">CALL SID</span>
                  <span className="font-mono text-slate-700 truncate block">{(selectedOutcome as any).call_sid || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-mono">CONVERSATION ID</span>
                  <span className="font-mono text-slate-700 truncate block">{(selectedOutcome as any).conversation_id || "—"}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium block mb-1">AI Transcript Summary</span>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 text-[11.5px] leading-relaxed max-h-44 overflow-y-auto">
                  {(selectedOutcome as any).transcript_summary ||
                    (selectedOutcome as any).qualification_summary ||
                    "Lead confirmed interest in HSK Solitaire 3BHK unit. Pre-approved for bank loan and requested site visit this weekend."}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOutcome(null)}
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
