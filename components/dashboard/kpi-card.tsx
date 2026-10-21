"use client";

import React from "react";
import {
  Users,
  PhoneCall,
  ThumbsUp,
  Percent,
  Clock,
  RotateCcw,
  UserCheck,
  UserX,
  PhoneMissed,
  AlertOctagon,
  ShieldAlert,
  CalendarCheck,
} from "lucide-react";
import type { EnquiryRecord, CallOutcomeRecord } from "@/lib/hsk-sheets-schema";
import { Lead } from "@/lib/google-sheets";

interface KpiCardsProps {
  enquiries?: EnquiryRecord[];
  outcomes?: CallOutcomeRecord[];
  leads?: Lead[];
  isLoading?: boolean;
  isUnavailable?: boolean;
}

export function KpiCards({
  enquiries = [],
  outcomes = [],
  leads = [],
  isLoading = false,
  isUnavailable = false,
}: KpiCardsProps) {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayTime = startOfDay.getTime();

  // 1. Total Enquiries
  const totalEnquiries = enquiries.length > 0 ? enquiries.length : leads.length;

  // 2. Fresh Waiting in Queue
  const freshWaiting = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.queue_class === "FRESH" &&
          (e.current_status === "NEW" || e.current_status === "QUEUED"),
      ).length
    : leads.filter((l) => l.callStatus === "Pending" && l.queueClass === "FRESH").length;

  // 3. Due Retries
  const dueRetries = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.current_status === "RETRY_SCHEDULED" &&
          e.next_retry_at &&
          new Date(e.next_retry_at).getTime() <= now,
      ).length
    : leads.filter(
        (l) =>
          l.callStatus === "Pending" &&
          l.nextRetryAt &&
          new Date(l.nextRetryAt).getTime() <= now,
      ).length;

  // 4. Calls Attempted Today
  const callsAttemptedToday = outcomes.length > 0
    ? outcomes.filter((o) => {
        const t = new Date(o.call_started_at || o.call_start_time || o.recorded_at).getTime();
        return t >= startOfDayTime;
      }).length
    : enquiries.filter((e) => {
        if (!e.last_call_at) return false;
        return new Date(e.last_call_at).getTime() >= startOfDayTime;
      }).length;

  // 5. Calls Completed
  const callsCompleted = outcomes.length > 0
    ? outcomes.length
    : enquiries.filter(
        (e) =>
          e.current_status === "QUALIFIED" ||
          e.current_status === "DISQUALIFIED" ||
          e.current_status === "NOT_ANSWERED" ||
          e.current_status === "DO_NOT_CALL" ||
          e.latest_outcome_id !== null,
      ).length;

  // 6. Answered Customers
  const answeredCustomers = outcomes.length > 0
    ? outcomes.filter(
        (o) =>
          (o.disposition || o.call_disposition) === "COMPLETED" ||
          (o.disposition || o.call_disposition) === "ANSWERED",
      ).length
    : enquiries.filter(
        (e) =>
          e.current_status === "QUALIFIED" ||
          e.current_status === "DISQUALIFIED" ||
          e.latest_disposition === "COMPLETED",
      ).length;

  // 7. Interested / Qualified Customers
  const interestedCustomers = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.current_status === "QUALIFIED" ||
          e.qualification_status === "QUALIFIED" ||
          e.qualification_status === "INTERESTED",
      ).length
    : leads.filter(
        (l) =>
          l.interested === true ||
          (l.interestStatus && l.interestStatus.toUpperCase() === "INTERESTED"),
      ).length;

  // 8. Not Interested Customers
  const notInterestedCustomers = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.current_status === "DISQUALIFIED" ||
          e.qualification_status === "NOT_INTERESTED",
      ).length
    : leads.filter(
        (l) =>
          l.interested === false ||
          (l.interestStatus && l.interestStatus.toUpperCase() === "NOT_INTERESTED"),
      ).length;

  // 9. Customers Not Reached after Max Attempts
  const notReachedCustomers = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.current_status === "NOT_ANSWERED" ||
          (e.customer_no_answer_count >= 3 && e.current_status !== "QUALIFIED"),
      ).length
    : leads.filter((l) => (l.customerNoAnswerCount || 0) >= 3).length;

  // 10. Technical Failures (Carrier/Sync)
  const technicalFailures = enquiries.length > 0
    ? enquiries.filter(
        (e) =>
          e.current_status === "FAILED_TECHNICAL" ||
          (e.technical_failures_count && e.technical_failures_count > 0),
      ).length
    : 0;

  // 11. Do-Not-Call (DND)
  const dndCustomers = enquiries.length > 0
    ? enquiries.filter((e) => e.current_status === "DO_NOT_CALL").length
    : 0;

  // 12. Qualification Rate with Explicit Denominator (Interested / Answered Customers)
  const qualificationDenominator = answeredCustomers > 0 ? answeredCustomers : callsCompleted;
  const qualificationRate =
    qualificationDenominator > 0
      ? Math.round((interestedCustomers / qualificationDenominator) * 100)
      : 0;

  const renderValue = (val: number | string) => {
    if (isUnavailable) return "—";
    if (isLoading) return "...";
    return val;
  };

  return (
    <div className="space-y-4">
      {/* ── Section A: Primary Operational Pulse (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Enquiries */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Total Enquiries
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {renderValue(totalEnquiries)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isUnavailable ? "Live sheet unavailable" : totalEnquiries === 0 ? "Ready for website intake" : "Persisted in Enquiries tab"}
            </p>
          </div>
        </div>

        {/* 2. Fresh Waiting in Queue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Fresh Waiting
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {renderValue(freshWaiting)}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Top priority (newest intake first)
            </p>
          </div>
        </div>

        {/* 3. Due Retries */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Due Retries
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {renderValue(dueRetries)}
            </div>
            <p className="text-[11px] text-blue-700 font-medium mt-1">
              2-min backoff due for calling
            </p>
          </div>
        </div>

        {/* 4. Qualification Rate (Explicit Denominator) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Qualification Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {isUnavailable ? "—" : `${qualificationRate}%`}
            </div>
            <p className="text-[11px] text-indigo-700 font-medium mt-1 truncate" title={`Formula: ${interestedCustomers} qualified / ${qualificationDenominator} answered customers`}>
              {qualificationDenominator > 0
                ? `${interestedCustomers} of ${qualificationDenominator} answered calls`
                : "Awaiting completed calls"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section B: Telephony & Call Funnel (4 Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Calls Attempted Today */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Attempted Today</span>
            <span className="text-lg font-bold text-slate-900">{renderValue(callsAttemptedToday)}</span>
          </div>
        </div>

        {/* Calls Completed */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Calls Completed</span>
            <span className="text-lg font-bold text-slate-900">{renderValue(callsCompleted)}</span>
          </div>
        </div>

        {/* Answered Customers */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-teal-700 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Answered Calls</span>
            <span className="text-lg font-bold text-slate-900">{renderValue(answeredCustomers)}</span>
          </div>
        </div>

        {/* Technical Failures (Carrier/Sync) */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-700 shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Technical Errors</span>
            <span className="text-lg font-bold text-slate-900">{renderValue(technicalFailures)}</span>
          </div>
        </div>
      </div>

      {/* ── Section C: Qualification & Terminal Outcomes (4 Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Interested / Qualified */}
        <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <ThumbsUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-emerald-800 uppercase tracking-wider">Qualified Leads</span>
            <span className="text-lg font-bold text-emerald-900">{renderValue(interestedCustomers)}</span>
          </div>
        </div>

        {/* Not Interested */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <UserX className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Not Interested</span>
            <span className="text-lg font-bold text-slate-900">{renderValue(notInterestedCustomers)}</span>
          </div>
        </div>

        {/* Not Reached after 3 attempts */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-rose-600 shrink-0">
            <PhoneMissed className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Max Retries Done</span>
            <span className="text-lg font-bold text-slate-900">{renderValue(notReachedCustomers)}</span>
          </div>
        </div>

        {/* Do-Not-Call (DND) */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Do-Not-Call (DND)</span>
            <span className="text-lg font-bold text-slate-900">{renderValue(dndCustomers)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
