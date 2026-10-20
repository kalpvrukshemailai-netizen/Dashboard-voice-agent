"use client";

import React from "react";
import { Clock, PhoneCall, Sparkles } from "lucide-react";
import { Lead } from "@/lib/google-sheets";
import { InterestBadge, StatusBadge } from "@/components/ui/badges";

interface RecentActivityProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export function RecentActivity({ leads, onSelectLead }: RecentActivityProps) {
  // Filter leads that have had a call initiated or completed
  const activityLeads = leads
    .filter((l) => l.callStatus === "Completed" || l.callStatus === "Calling" || l.calledAt)
    .sort((a, b) => {
      const timeA = a.calledAt ? new Date(a.calledAt).getTime() : 0;
      const timeB = b.calledAt ? new Date(b.calledAt).getTime() : 0;
      return timeB - timeA;
    });

  if (activityLeads.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center shadow-xs">
        <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-700">No call activity recorded yet</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Calls made with Alex will appear here in chronological order.
        </p>
      </div>
    );
  }

  const formatActivityTime = (isoString?: string | null) => {
    if (!isoString) return "Recent";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs w-full min-w-0">
      {/* Aligned Card Header */}
      <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h3
            className="text-sm font-bold text-slate-900 truncate"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Call Activity
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Latest qualification outcomes.
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
          {activityLeads.length} logged
        </span>
      </div>

      <div className="divide-y divide-slate-100 min-w-0">
        {activityLeads.slice(0, 6).map((lead) => {
          const time = formatActivityTime(lead.calledAt);
          const isCompleted = lead.callStatus === "Completed";
          const isInterested =
            lead.interested === true ||
            (lead.interestStatus && lead.interestStatus.toUpperCase() === "INTERESTED");

          return (
            <div
              key={lead.row}
              onClick={() => onSelectLead(lead)}
              className="px-5 py-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors space-y-1.5 text-xs min-w-0 group"
            >
              {/* Row 1: Status indicator + Lead name + Badge */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isInterested
                        ? "bg-[#0F9F8F] ring-4 ring-[#0F9F8F]/15"
                        : isCompleted
                        ? "bg-slate-400 ring-2 ring-slate-200"
                        : "bg-amber-500 ring-4 ring-amber-500/15 animate-pulse"
                    }`}
                  />
                  <span
                    className="font-bold text-slate-900 group-hover:text-[#3857E8] transition-colors truncate text-[13px]"
                    title={lead.name}
                  >
                    {lead.name}
                  </span>
                </div>
                <div className="shrink-0">
                  {lead.interestStatus ? (
                    <InterestBadge status={lead.interestStatus} interested={lead.interested} />
                  ) : (
                    <StatusBadge status={lead.callStatus} />
                  )}
                </div>
              </div>

              {/* Row 2: Outcome description + Timestamp */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 min-w-0">
                <span
                  className="truncate flex-1"
                  title={
                    (lead.propertyInterest || lead.company)
                      ? `${isCompleted ? (isInterested ? "Verified interested prospect" : "Qualification completed") : "Call in progress"} · ${lead.propertyInterest || lead.company}`
                      : undefined
                  }
                >
                  {isCompleted
                    ? isInterested
                      ? "Verified interested prospect"
                      : "Qualification completed"
                    : "Call in progress"}
                  {(lead.propertyInterest || lead.company) && ` · ${lead.propertyInterest || lead.company}`}
                </span>
                <span className="text-slate-400 shrink-0 font-normal text-[10.5px]">
                  {time}
                </span>
              </div>

              {/* Row 3: Next step if available */}
              {lead.nextStepType && (
                <div className="flex items-center gap-1.5 pt-0.5 min-w-0">
                  <span
                    className="text-[10.5px] font-semibold text-[#2D46C4] bg-blue-50/80 px-2 py-0.5 rounded-md truncate max-w-full border border-blue-100/60"
                    title={lead.nextStepType}
                  >
                    → {lead.nextStepType}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
