"use client";

import React, { useMemo } from "react";
import {
  Users,
  PhoneCall,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  HelpCircle,
  Filter,
  PieChart as PieIcon,
  BarChart2,
} from "lucide-react";
import { Lead } from "@/lib/google-sheets";

interface AnalyticsViewProps {
  leads: Lead[];
}

export function AnalyticsView({ leads }: AnalyticsViewProps) {
  const totalLeads     = leads.length;
  const completedCalls = leads.filter((l) => l.callStatus === "Completed").length;

  const interested = leads.filter(
    (l) => l.interested === true || (l.interestStatus && l.interestStatus.toUpperCase() === "INTERESTED"),
  ).length;

  const notInterested = leads.filter(
    (l) => l.interested === false || (l.interestStatus && l.interestStatus.toUpperCase() === "NOT INTERESTED"),
  ).length;

  const notReady = leads.filter((l) => {
    const s = (l.interestStatus || "").toUpperCase();
    return s === "NOT READY" || s === "FOLLOW UP" || s === "CALLBACK";
  }).length;

  const unknown = Math.max(0, completedCalls - (interested + notInterested + notReady));

  const interestIdentified = interested + notInterested + notReady;

  const funnelSteps = [
    { label: "Total Leads",         count: totalLeads,         percent: 100 },
    {
      label: "Calls Completed",
      count: completedCalls,
      percent: totalLeads > 0 ? Math.round((completedCalls / totalLeads) * 100) : 0,
    },
    {
      label: "Interest Identified",
      count: interestIdentified,
      percent: totalLeads > 0 ? Math.round((interestIdentified / totalLeads) * 100) : 0,
    },
    {
      label: "Interested Leads",
      count: interested,
      percent: totalLeads > 0 ? Math.round((interested / totalLeads) * 100) : 0,
    },
  ];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Pending: 0, Calling: 0, Completed: 0, Failed: 0 };
    leads.forEach((l) => {
      counts[l.callStatus] = (counts[l.callStatus] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const intentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const intent = (l.propertyInterest || "Unspecified").trim();
      counts[intent] = (counts[intent] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  // ─── KPI card data ─────────────────────────────────────────
  const kpiCards = [
    { label: "Total Leads",    value: totalLeads,      sub: "Loaded dataset",      icon: Users },
    { label: "Completed",      value: completedCalls,  sub: "Finished voice calls", icon: PhoneCall },
    {
      label: "Interested",
      value: interested,
      sub: completedCalls > 0 ? `${Math.round((interested / completedCalls) * 100)}% of calls` : "0% of calls",
      icon: ThumbsUp,
    },
    { label: "Not Interested", value: notInterested,   sub: "Disqualified / Passed", icon: ThumbsDown },
    { label: "Not Ready",      value: notReady,        sub: "Follow-up needed",      icon: AlertCircle },
    { label: "Unknown",        value: unknown,         sub: "Awaiting analysis",     icon: HelpCircle },
  ];

  return (
    <div className="space-y-6 min-w-0 w-full">

      {/* Page header */}
      <div className="min-w-0 w-full">
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate"
          style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
        >
          Analytics
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Qualification performance, funnel conversions, and intent breakdown.
        </p>
      </div>

      {/* KPI grid: 2 rows of 3 balanced cards on desktop */}
      <div className="analytics-kpi-grid">
        {kpiCards.map(({ label, value, sub, icon: Icon }, idx) => (
          <div
            key={idx}
            className="ds-card p-4.5 flex flex-col justify-between h-full min-w-0"
          >
            <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider leading-tight min-w-0 break-words"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "var(--text-muted)",
                  letterSpacing: "0.07em",
                }}
              >
                {label}
              </span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--brand-blue-subtle)" }}
              >
                <Icon style={{ width: 15, height: 15, color: "var(--brand-blue)" }} strokeWidth={1.75} />
              </div>
            </div>

            <div className="min-w-0">
              <div
                className="text-2xl sm:text-3xl leading-none mb-1.5 font-bold tabular-nums"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {value}
              </div>

              <p
                className="text-[11.5px] truncate"
                title={sub}
                style={{ fontFamily: "'Inter', sans-serif", color: "var(--text-muted)" }}
              >
                {sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Funnel + Status lower grid */}
      <div className="analytics-lower-grid">

        {/* Qualification Funnel */}
        <div className="ds-card p-6 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 min-w-0">
            <Filter className="w-4 h-4 shrink-0" style={{ color: "var(--brand-blue)" }} />
            <h3
              className="text-[15px] font-bold truncate"
              style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
            >
              Qualification Funnel
            </h3>
          </div>
          <p className="text-xs mb-6 text-slate-500">
            Conversion stages from raw leads to verified interested prospects.
          </p>

          <div className="space-y-5 min-w-0">
            {funnelSteps.map((step, idx) => (
              <div key={idx} className="space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-3 text-xs min-w-0">
                  <span className="font-semibold text-slate-700 truncate" title={step.label}>
                    {step.label}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                    <span className="font-bold text-slate-900">
                      {step.count}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({step.percent}%)
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, step.percent)}%`,
                      background: idx === funnelSteps.length - 1
                        ? "var(--ai-teal)"
                        : "var(--brand-blue)",
                      opacity: 1 - idx * 0.15,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Status Distribution */}
        <div className="ds-card p-6 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 min-w-0">
            <PieIcon className="w-4 h-4 shrink-0" style={{ color: "var(--brand-blue)" }} />
            <h3
              className="text-[15px] font-bold truncate"
              style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
            >
              Lead Status Distribution
            </h3>
          </div>
          <p className="text-xs mb-6 text-slate-500">
            Current operational state across all prospect records.
          </p>

          <div className="space-y-3 min-w-0">
            {[
              { label: "Completed", count: statusCounts.Completed || 0, dot: "var(--success-dot)" },
              { label: "Calling / In Progress", count: statusCounts.Calling || 0, dot: "var(--brand-blue)" },
              { label: "Pending", count: statusCounts.Pending || 0, dot: "var(--neutral-dot)" },
              { label: "Failed / Unreachable", count: statusCounts.Failed || 0, dot: "var(--error-dot)" },
            ].map((item, idx) => {
              const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-slate-100 bg-slate-50/60 min-w-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: item.dot }}
                    />
                    <span
                      className="text-xs font-semibold text-slate-700 truncate"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                    <span className="text-xs font-bold text-slate-900">
                      {item.count}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Property Intent Distribution */}
      <div className="ds-card p-6 min-w-0 w-full">
        <div className="flex items-center gap-2.5 mb-1.5 min-w-0">
          <BarChart2 className="w-4 h-4 shrink-0" style={{ color: "var(--brand-blue)" }} />
          <h3
            className="text-[15px] font-bold truncate"
            style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
          >
            Property Intent Distribution
          </h3>
        </div>
        <p className="text-xs mb-6 text-slate-500">
          Types of real estate requirements captured from prospects.
        </p>

        {intentCounts.length === 0 ? (
          <p className="text-xs text-slate-400">
            No intent data captured yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 min-w-0">
            {intentCounts.map(([intent, count], idx) => {
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between min-w-0"
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate"
                    title={intent}
                  >
                    {intent}
                  </div>
                  <div className="flex items-end justify-between mt-3 gap-2">
                    <span
                      className="text-2xl font-bold tabular-nums text-slate-900 font-display"
                    >
                      {count}
                    </span>
                    <span className="text-xs font-medium text-slate-400 mb-0.5 shrink-0">
                      {pct}% of leads
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
