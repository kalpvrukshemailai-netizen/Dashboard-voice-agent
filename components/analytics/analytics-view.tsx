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
  TrendingUp,
} from "lucide-react";
import { Lead } from "@/lib/google-sheets";

interface AnalyticsViewProps {
  leads: Lead[];
}

export function AnalyticsView({ leads }: AnalyticsViewProps) {
  const totalLeads = leads.length;
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
    { label: "Total Leads Received", count: totalLeads, percent: 100 },
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
      label: "Qualified & Interested",
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

  // Executive KPI Cards (no bright circular bubble icons)
  const kpiCards = [
    {
      label: "Total Intake",
      value: totalLeads,
      sub: "Active database leads",
      accent: "border-slate-200",
    },
    {
      label: "Completed Calls",
      value: completedCalls,
      sub: totalLeads > 0 ? `${Math.round((completedCalls / totalLeads) * 100)}% contact rate` : "0% contact rate",
      accent: "border-slate-200",
    },
    {
      label: "Qualified Leads",
      value: interested,
      sub: completedCalls > 0 ? `${Math.round((interested / completedCalls) * 100)}% conversion yield` : "0% conversion",
      accent: "border-emerald-300/80 bg-emerald-50/20",
    },
    {
      label: "Follow-Up Pending",
      value: notReady,
      sub: "Callback or schedule request",
      accent: "border-amber-200/80 bg-amber-50/20",
    },
    {
      label: "Disqualified",
      value: notInterested,
      sub: "Passed or out of budget",
      accent: "border-slate-200",
    },
    {
      label: "Pending Analysis",
      value: unknown,
      sub: "Awaiting LLM webhook",
      accent: "border-slate-200",
    },
  ];

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conversion telemetry, intake funnel throughput, and prospect property intent distribution.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
          <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          <span>Real-time conversion sync</span>
        </div>
      </div>

      {/* KPI 6-Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl bg-white border ${kpi.accent} shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300`}
          >
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              {kpi.label}
            </div>
            <div className="my-2">
              <div
                className="text-2xl lg:text-3xl font-extrabold text-slate-950 tabular-nums tracking-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {kpi.value}
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {kpi.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Grid: Qualification Funnel + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Qualification Funnel (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h2
                  className="text-base font-bold text-slate-950"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Intake Qualification Funnel
                </h2>
                <p className="text-xs text-slate-500">
                  Step-by-step conversion from web lead to verified prospective buyer
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {funnelSteps.map((step, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{step.label}</span>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-bold text-slate-950 text-sm">{step.count}</span>
                    <span className="text-[11px] font-semibold text-slate-400">({step.percent}%)</span>
                  </div>
                </div>
                {/* Visual Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(4, step.percent)}%`,
                      backgroundColor:
                        idx === 0
                          ? "#334155"
                          : idx === 1
                          ? "#0e7490"
                          : idx === 2
                          ? "#0d9488"
                          : "#059669",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <span>Overall qualification conversion yield</span>
            <span className="font-extrabold text-emerald-800 tabular-nums">
              {totalLeads > 0 ? `${Math.round((interested / totalLeads) * 100)}% of total intake` : "0%"}
            </span>
          </div>
        </div>

        {/* Lead Status Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold text-slate-950"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Operational Status Mix
              </h2>
              <p className="text-xs text-slate-500">
                Current operational state across pipeline records
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                label: "Completed",
                count: statusCounts.Completed || 0,
                color: "bg-[#04250e] text-[#dcfae5] border-[#bbf7d0]",
                dot: "bg-emerald-500",
              },
              {
                label: "Calling / In-Flight",
                count: statusCounts.Calling || 0,
                color: "bg-[#082f49] text-[#e0f2fe] border-[#bae6fd]",
                dot: "bg-sky-500",
              },
              {
                label: "Pending in Queue",
                count: statusCounts.Pending || 0,
                color: "bg-[#292524] text-[#f5f5f4] border-slate-300",
                dot: "bg-slate-400",
              },
              {
                label: "Failed / Unreachable",
                count: statusCounts.Failed || 0,
                color: "bg-[#450a0a] text-[#fee2e2] border-[#fecaca]",
                dot: "bg-rose-500",
              },
            ].map((item, idx) => {
              const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-xs font-extrabold text-slate-900">{item.count}</span>
                    <span className="text-[11px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Property Intent Distribution */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold text-slate-950"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Property Intent & Configuration Demand
              </h2>
              <p className="text-xs text-slate-500">
                Segmented demand breakdown captured through automated voice discovery
              </p>
            </div>
          </div>
        </div>

        {intentCounts.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No intent data captured yet in active records.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-2">
            {intentCounts.map(([intent, count], idx) => {
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate" title={intent}>
                    {intent}
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span
                      className="text-2xl font-extrabold text-slate-950 tabular-nums"
                      style={{ fontFamily: "'Manrope', sans-serif" }}
                    >
                      {count}
                    </span>
                    <span className="text-xs font-semibold text-teal-700 tabular-nums">
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
