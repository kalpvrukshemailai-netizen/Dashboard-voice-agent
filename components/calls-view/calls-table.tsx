"use client";

import React from "react";
import { PhoneCall, Calendar, Clock, ArrowRight, UserCheck, ShieldCheck, Eye } from "lucide-react";
import { Lead } from "@/lib/google-sheets";
import { StatusBadge, InterestBadge } from "@/components/ui/badges";
import { getInitials } from "@/lib/utils";

interface CallsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onCallLead: (lead: Lead) => void;
  isDemo?: boolean;
}

export function CallsTable({ leads, onSelectLead, onCallLead, isDemo = false }: CallsTableProps) {
  // Leads that have a call recorded or callStatus Completed/Calling
  const callRecords = leads.filter(
    (l) => l.callStatus === "Completed" || l.callStatus === "Calling" || l.calledAt,
  );

  const formatDate = (iso?: string | null) => {
    if (!iso) return "Today";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Today";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className={`bg-white border rounded-2xl p-5 shadow-xs flex items-center justify-between ${
        isDemo ? "border-amber-200 bg-amber-50/40" : "border-slate-200/80"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">AI Voice Qualification Call Log</h3>
            {isDemo && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                Demo Sample
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDemo
              ? "Displaying sample prospect call outcomes. Live webhook records will appear here once connected."
              : "Synchronized with Google Sheet rows and ElevenLabs conversation webhook records."}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          isDemo ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
        }`}>
          {callRecords.length} {isDemo ? "demo calls" : "calls logged"}
        </div>
      </div>

      {callRecords.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <PhoneCall className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">No calls completed yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click &ldquo;Call&rdquo; on any prospect from the Leads tab to initiate an AI qualification conversation with Alex.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Lead</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Interest</th>
                  <th className="py-3 px-4">Intent</th>
                  <th className="py-3 px-4">Next Step</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {callRecords.map((lead) => (
                  <tr
                    key={lead.row}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {getInitials(lead.name)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{lead.name}</div>
                          <div className="text-[11px] text-slate-400">{lead.company || lead.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(lead.calledAt)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={lead.callStatus} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <InterestBadge status={lead.interestStatus} interested={lead.interested} />
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-[140px] truncate">
                      {lead.propertyInterest || "—"}
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-[140px] truncate">
                      {lead.nextStepType || "—"}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLead(lead);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
