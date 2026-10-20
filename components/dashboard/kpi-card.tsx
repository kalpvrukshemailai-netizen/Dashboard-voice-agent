"use client";

import React from "react";
import { Users, PhoneCall, ThumbsUp, Percent } from "lucide-react";
import { Lead } from "@/lib/google-sheets";

interface KpiCardsProps {
  leads: Lead[];
}

export function KpiCards({ leads }: KpiCardsProps) {
  const totalLeads = leads.length;
  const callsCompleted = leads.filter(
    (l) => l.callStatus === "Completed",
  ).length;
  const interestedLeads = leads.filter(
    (l) =>
      l.interested === true ||
      (l.interestStatus && l.interestStatus.toUpperCase() === "INTERESTED"),
  ).length;

  const qualificationRate =
    callsCompleted > 0
      ? Math.round((interestedLeads / callsCompleted) * 100)
      : 0;

  const kpis = [
    {
      label: "Total Leads",
      value: totalLeads,
      icon: Users,
      iconBg: "rgba(56, 87, 232, 0.08)",
      iconColor: "var(--brand-blue)",
      subtext: "Prospects in database",
    },
    {
      label: "Calls Completed",
      value: callsCompleted,
      icon: PhoneCall,
      iconBg: "rgba(16, 185, 129, 0.08)",
      iconColor: "#059669",
      subtext: `${totalLeads - callsCompleted} remaining to call`,
    },
    {
      label: "Interested Leads",
      value: interestedLeads,
      icon: ThumbsUp,
      iconBg: "rgba(15, 159, 143, 0.08)",
      iconColor: "var(--ai-teal)",
      subtext: "Pre-screened verified interest",
    },
    {
      label: "Qualification Rate",
      value: callsCompleted > 0 ? `${qualificationRate}%` : "—",
      icon: Percent,
      iconBg: "rgba(56, 87, 232, 0.08)",
      iconColor: "var(--brand-blue)",
      subtext:
        callsCompleted > 0
          ? `${interestedLeads} of ${callsCompleted} calls qualified`
          : "Awaiting completed calls",
    },
  ];

  return (
    <div className="kpi-grid">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0 shadow-xs hover:border-slate-300 transition-all duration-150"
          >
            <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
              <span
                className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "0.06em",
                }}
              >
                {kpi.label}
              </span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: kpi.iconBg }}
              >
                <Icon style={{ width: 16, height: 16, color: kpi.iconColor }} strokeWidth={1.75} />
              </div>
            </div>

            <div className="min-w-0">
              <div
                className="text-3xl sm:text-[34px] leading-none font-bold tracking-tight mb-2"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                {kpi.value}
              </div>

              <p
                className="text-xs text-slate-500 truncate"
                title={kpi.subtext}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {kpi.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

