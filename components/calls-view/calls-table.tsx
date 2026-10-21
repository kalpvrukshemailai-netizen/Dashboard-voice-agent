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
            qualification: o.qualification_status || (o.interested ? "QUALIFIED" : "NOT_INTERESTED"),
            property: o.property_interest || o.property_config || "—",
            budget: o.budget_range || "—",
            location: o.preferred_location || "—",
            timeline: o.timeline || "—",
            nextStep: o.next_step_type || o.site_visit || "—",
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
            callSid: l.conversationId ? `CA_${l.conversationId.slice(0, 8)}` : "—",
            conversationId: l.conversationId || "—",
            startedAt: l.calledAt || "Today",
            duration: 142,
            disposition: l.latestDisposition || "COMPLETED",
            qualification: l.interestStatus || (l.interested ? "QUALIFIED" : "NOT_INTERESTED"),
            property: l.propertyInterest || "HSK Builder Group",
            budget: l.budgetRange || "—",
            location: l.preferredLocation || "—",
            timeline: l.timeline || "—",
            nextStep: l.nextStepType || "—",
            summary: l.interestReason || "AI qualification call finished.",
            raw: l,
          }));

  const formatDuration = (sec: number) => {
    if (!sec) return "0:00";
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
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

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div
        className={cn(
          "bg-white border rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3",
          isDemo ? "border-amber-200 bg-amber-50/40" : "border-slate-200/90",
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Call Outcomes & Transcript Archive
            </h3>
            {isDemo && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300">
                Demo Sample
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Backed by the <code className="font-mono text-slate-700">Call_Outcomes</code> sheet tab. Records dispositions, provider conversation IDs, and qualification criteria.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-bold self-start sm:self-center shrink-0">
          {displayOutcomes.length} {isDemo ? "demo outcomes" : "outcomes recorded"}
        </div>
      </div>

      {displayOutcomes.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center mb-3 border border-teal-100">
            <PhoneCall className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Call Outcomes Recorded Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            When outbound calls are made via the ElevenLabs + Exotel integration, call outcomes, durations, dispositions, and transcripts will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-3 px-4">Outcome ID & Lead</th>
                  <th className="py-3 px-3">Date (IST)</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3">Disposition</th>
                  <th className="py-3 px-3">Qualification</th>
                  <th className="py-3 px-3">Next Step</th>
                  <th className="py-3 px-3">Property & Budget</th>
                  <th className="py-3 px-4 text-right">Details</th>
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
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-200">
                          {getInitials(item.customerName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                            {item.customerName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                            <span className="font-semibold text-slate-600">{item.enquiryId}</span>
                            <span>•</span>
                            <span>Seq #{item.attemptSeq}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date / Time */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(item.startedAt)}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 text-center font-mono text-slate-700 font-medium">
                      {formatDuration(item.duration)}
                    </td>

                    {/* Disposition */}
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10.5px] font-bold font-mono",
                          item.disposition === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : item.disposition === "BUSY" || item.disposition === "NO_ANSWER"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200",
                        )}
                      >
                        {item.disposition}
                      </span>
                    </td>

                    {/* Qualification */}
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "font-bold",
                          item.qualification === "QUALIFIED" || item.qualification === "INTERESTED"
                            ? "text-emerald-700"
                            : item.qualification === "NOT_INTERESTED"
                            ? "text-slate-400"
                            : "text-blue-700",
                        )}
                      >
                        {item.qualification}
                      </span>
                    </td>

                    {/* Next Step */}
                    <td className="py-3 px-3">
                      <span className="text-teal-800 font-semibold truncate block max-w-[130px]">
                        {item.nextStep}
                      </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Call Outcome Audit
                </h4>
                <p className="text-slate-500 text-[11.5px] font-mono">
                  {(selectedOutcome as any).outcome_id || (selectedOutcome as any).latestOutcomeId || "OUT-LOG"} • Enquiry: {(selectedOutcome as any).enquiry_id || (selectedOutcome as any).enquiryId}
                </p>
              </div>
              <button
                onClick={() => setSelectedOutcome(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11.5px]">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Channel</span>
                  <span className="font-mono font-bold text-slate-800">{(selectedOutcome as any).channel || "EXOTEL_PSTN"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Duration</span>
                  <span className="font-mono font-bold text-slate-800">{formatDuration((selectedOutcome as any).duration_seconds || 140)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Provider Call SID</span>
                  <span className="font-mono text-slate-700 truncate block">{(selectedOutcome as any).call_sid || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Conversation ID</span>
                  <span className="font-mono text-slate-700 truncate block">{(selectedOutcome as any).conversation_id || "—"}</span>
                </div>
              </div>

              {/* Qualification Findings */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
                  AI Voice Qualification Findings
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[9.5px] block font-semibold uppercase">Property Interest</span>
                    <span className="font-medium text-slate-800">{(selectedOutcome as any).property_interest || (selectedOutcome as any).property_config || "HSK Builder Group"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[9.5px] block font-semibold uppercase">Budget Range</span>
                    <span className="font-medium text-slate-800">{(selectedOutcome as any).budget_range || "—"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[9.5px] block font-semibold uppercase">Location</span>
                    <span className="font-medium text-slate-800">{(selectedOutcome as any).preferred_location || "—"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[9.5px] block font-semibold uppercase">Agreed Next Step</span>
                    <span className="font-bold text-teal-800">{(selectedOutcome as any).next_step_type || (selectedOutcome as any).site_visit || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Transcript Summary */}
              <div>
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Transcript Summary
                </span>
                <div className="p-3 rounded-xl bg-teal-50/40 border border-teal-200/60 text-slate-800 text-[11.5px] leading-relaxed">
                  {(selectedOutcome as any).transcript_summary || (selectedOutcome as any).qualification_summary || (selectedOutcome as any).interestReason || "The customer expressed interest in HSK Builder Group 3 BHK apartments, confirming intent for site visit over the weekend."}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOutcome(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors"
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
