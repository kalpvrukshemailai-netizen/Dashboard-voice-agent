"use client";

import React, { useState } from "react";
import {
  Megaphone,
  Play,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { Lead } from "@/lib/google-sheets";
import { StatusBadge, InterestBadge } from "@/components/ui/badges";
import { getInitials } from "@/lib/utils";

interface CampaignViewProps {
  leads: Lead[];
  onCallLead: (lead: Lead) => void;
  onSelectLead: (lead: Lead) => void;
}

export function CampaignView({ leads, onCallLead, onSelectLead }: CampaignViewProps) {
  const [operatorIndex] = useState(0);

  const total           = leads.length;
  const completed       = leads.filter((l) => l.callStatus === "Completed").length;
  const interested      = leads.filter(
    (l) => l.interested === true || (l.interestStatus && l.interestStatus.toUpperCase() === "INTERESTED"),
  ).length;
  const remaining       = total - completed;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pendingLeads = leads.filter((l) => l.callStatus === "Pending" || l.callStatus === "Calling");
  const currentLead  = pendingLeads[operatorIndex] || pendingLeads[0] || leads[0];

  return (
    <div className="space-y-6 min-w-0 w-full">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 w-full">
        <div className="min-w-0">
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate"
            style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
          >
            Campaigns
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Targeted outbound calling batches and agent queues.
          </p>
        </div>

        {currentLead && (
          <button
            onClick={() => onCallLead(currentLead)}
            className="ds-btn ds-btn-primary shrink-0 self-start sm:self-center"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Campaign Queue
          </button>
        )}
      </div>

      {/* Campaign Overview Card */}
      <div className="ds-card p-6 min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--brand-blue-subtle)" }}
            >
              <Megaphone className="w-5 h-5" style={{ color: "var(--brand-blue)" }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="text-[10.5px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--text-muted)" }}
              >
                Active Outbound Campaign
              </span>
              <h2
                className="text-[16.5px] font-bold mt-0.5 truncate"
                style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
              >
                Ahmedabad High-Intent Real Estate Leads
              </h2>
              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                Automated qualification with Alex AI across residential and commercial prospects.
              </p>
            </div>
          </div>
        </div>

        {/* Progress section */}
        <div className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Qualification Progress
            </span>
            <span
              className="text-xs font-bold tabular-nums"
              style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
            >
              {progressPercent}% completed
            </span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%`, background: "var(--brand-blue)" }}
            />
          </div>

          {/* Three balanced stats cards */}
          <div className="campaign-stats-grid">
            {[
              { label: "Completed Calls", value: completed, sub: `of ${total} total` },
              {
                label: "Interested",
                value: interested,
                sub: completed > 0 ? `${Math.round((interested / completed) * 100)}% conversion` : "0% conversion",
              },
              { label: "Remaining", value: remaining, sub: "Awaiting screening" },
            ].map(({ label, value, sub }, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between h-full min-w-0"
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </span>
                <div
                  className="text-2xl font-bold mt-1.5 tabular-nums"
                  style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
                >
                  {value}
                </div>
                <span className="text-xs mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
                  {sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sequential Operator Guide */}
      <div className="ds-card p-6 min-w-0 w-full space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--brand-blue)" }} />
            <span
              className="text-[10.5px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Sequential Operator Mode
            </span>
          </div>
          <h3
            className="text-[15px] font-bold"
            style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
          >
            Next Prospect in Queue
          </h3>
          <p className="text-xs mt-1 max-w-xl" style={{ color: "var(--text-secondary)" }}>
            Calls are guided sequentially one prospect at a time. Once the conversation ends and the Google Sheet updates, you advance to the next prospect.
          </p>
        </div>

        {currentLead ? (
          <div className="p-4.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div
                className="w-10 h-10 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-100 text-indigo-700 bg-indigo-50"
              >
                {getInitials(currentLead.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <h4
                    className="text-[14px] font-bold truncate text-slate-900"
                    title={currentLead.name}
                  >
                    {currentLead.name}
                  </h4>
                  <StatusBadge status={currentLead.callStatus} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  <strong className="text-slate-700">{currentLead.company || "Independent Buyer"}</strong> · {currentLead.phone || "No phone"}
                </div>
                {currentLead.notes && (
                  <p className="text-xs text-slate-500 mt-1.5 max-w-lg line-clamp-2">
                    {currentLead.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
              <button
                onClick={() => onSelectLead(currentLead)}
                className="ds-btn ds-btn-secondary"
              >
                Inspect Notes
              </button>
              <button
                onClick={() => onCallLead(currentLead)}
                className="ds-btn ds-btn-primary"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Call Lead Now
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500">
              All leads in this campaign have completed their qualification calls.
            </p>
          </div>
        )}
      </div>

      {/* Full Campaign Roster */}
      <div className="ds-card overflow-hidden min-w-0 w-full" style={{ padding: 0 }}>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3
            className="text-[13px] font-bold"
            style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
          >
            Full Campaign Roster
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {leads.map((lead, idx) => (
            <div
              key={lead.row}
              onClick={() => onSelectLead(lead)}
              className="px-5 py-3.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-slate-50/70 min-w-0 gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="w-6 text-[11px] font-mono font-medium tabular-nums text-slate-400 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-bold text-slate-900 truncate" title={lead.name}>
                    {lead.name}
                  </span>
                  <span className="text-xs text-slate-400 ml-2 truncate">
                    {lead.company || lead.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={lead.callStatus} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCallLead(lead);
                  }}
                  className="ds-btn-icon"
                  title="Call this lead"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
