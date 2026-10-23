"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  Phone,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  AlertOctagon,
  Copy,
  ExternalLink,
  MapPin,
  IndianRupee,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { EnquiryRecord, CallOutcomeRecord } from "@/lib/hsk-sheets-schema";
import { Lead } from "@/lib/google-sheets";
import { cn } from "@/lib/utils";

interface LeadDetailDrawerProps {
  lead?: Lead | null;
  enquiry?: EnquiryRecord | null;
  outcome?: CallOutcomeRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onCallLead?: (lead: any) => void;
}

export function LeadDetailDrawer({
  lead,
  enquiry,
  outcome,
  isOpen,
  onClose,
  onCallLead,
}: LeadDetailDrawerProps) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  // Derive consolidated fields
  const customerName = enquiry?.customer_name || lead?.name || "Customer";
  const phoneNumber = enquiry?.phone_number || lead?.phone || "";
  const enquiryId = enquiry?.enquiry_id || lead?.enquiryId || "ENQ-PENDING";
  const projectInterest = enquiry?.project_interest || lead?.propertyInterest || "HSK Solitaire 3B";
  const source = enquiry?.source || "Website";
  const utmCampaign = enquiry?.utm_campaign || "Direct / Organic";
  const customerNotes = enquiry?.customer_notes || lead?.notes || "No notes provided at submission.";
  const createdAt = enquiry?.created_at || (lead?.row ? "Synced from Google Sheet" : "Recently");

  // Lifecycle & AI State
  const queueClass = enquiry?.queue_class || lead?.queueClass || "FRESH";
  const currentStatus = enquiry?.current_status || (lead?.callStatus === "Completed" ? "QUALIFIED" : "QUEUED");
  const attemptSeq = enquiry?.attempt_sequence_count ?? lead?.attemptSequenceCount ?? 0;
  const custNoAnswer = enquiry?.customer_no_answer_count ?? lead?.customerNoAnswerCount ?? 0;
  const techFailures = enquiry?.technical_failures_count ?? 0;
  const lastCallAt = enquiry?.last_call_at || lead?.calledAt;
  const nextRetryAt = enquiry?.next_retry_at || lead?.nextRetryAt;
  const latestDisposition = enquiry?.latest_disposition || lead?.latestDisposition || outcome?.disposition || outcome?.call_disposition;
  const qualificationStatus = enquiry?.qualification_status || lead?.interestStatus || outcome?.qualification_status;
  const errorDetails = enquiry?.error_details || lead?.interestReason;

  const initials = getInitials(customerName);

  const handleCopyPhone = () => {
    if (phoneNumber) {
      navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className="w-screen max-w-lg bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-start justify-between bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-sm border border-slate-200 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm font-semibold text-slate-900 leading-tight truncate"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    {customerName}
                  </h3>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                    {enquiryId}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{projectInterest}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {/* CARD 1: Customer Intake Details */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 text-slate-900 font-bold text-xs"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Customer Submission Details</span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border border-[#bbf7d0]"
                  style={{ background: "#dcfae5", color: "#04250e" }}
                >
                  Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">Phone</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-medium text-slate-900 text-xs">{phoneNumber}</span>
                    <button
                      onClick={handleCopyPhone}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copy phone"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {copied && <span className="text-[10px] text-emerald-600 font-medium font-mono">Copied</span>}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">Property</span>
                  <span className="font-medium text-slate-800 block mt-0.5 truncate">{projectInterest}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">Intake Source</span>
                  <span className="text-slate-700 block mt-0.5">{source}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">Campaign</span>
                  <span className="text-slate-700 block mt-0.5 truncate">{utmCampaign}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Customer Notes</span>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 leading-relaxed text-[11.5px]">
                  {customerNotes}
                </div>
              </div>

              <div className="text-[10.5px] text-slate-400 flex items-center gap-1 pt-1 font-mono">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Submitted: {createdAt}</span>
              </div>
            </div>

            {/* CARD 2: AI Voice Agent Qualification Lifecycle */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 text-slate-900 font-bold text-xs"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <span>AI Voice Qualification Lifecycle</span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200"
                  style={{ background: "#f1f5f9", color: "#334155" }}
                >
                  Alex Real Estate AI
                </span>
              </div>

              {/* Status & Attempt Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                <div>
                  <span className="block text-[9.5px] font-mono text-slate-400 uppercase">Current Status</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">{currentStatus}</span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-mono text-slate-400 uppercase">Queue Priority</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">{queueClass}</span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-mono text-slate-400 uppercase">Attempts</span>
                  <span className="font-mono text-slate-700 block mt-0.5 tabular-nums">
                    {custNoAnswer} / 3 max
                  </span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-mono text-slate-400 uppercase">Technical Errors</span>
                  <span className="font-mono text-slate-700 block mt-0.5 tabular-nums">
                    {techFailures}
                  </span>
                </div>
              </div>

              {/* Last Call & Next Retry */}
              <div className="space-y-1 text-[11px] font-mono">
                {lastCallAt && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" /> Last Called:
                    </span>
                    <span>{new Date(lastCallAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                  </div>
                )}
                {nextRetryAt && (
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1 text-slate-400">
                      <RotateCcw className="w-3 h-3" /> Next Retry:
                    </span>
                    <span>{new Date(nextRetryAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                  </div>
                )}
              </div>

              {/* Extracted Criteria */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="block text-[10.5px] font-medium text-slate-700 uppercase font-mono tracking-wider">
                  Extracted Lead Criteria
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[9.5px] font-mono uppercase">Disposition</span>
                    <span className="font-medium text-slate-800">{latestDisposition || "Pending Dial"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[9.5px] font-mono uppercase">Qualification</span>
                    <span className="font-medium text-emerald-800">{qualificationStatus || "Unassessed"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[9.5px] font-mono uppercase">Budget Range</span>
                    <span className="font-medium text-slate-800">{outcome?.budget_range || lead?.budgetRange || "Not specified"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[9.5px] font-mono uppercase">Location</span>
                    <span className="font-medium text-slate-800">{outcome?.preferred_location || lead?.preferredLocation || "Not specified"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[9.5px] font-mono uppercase">Timeline</span>
                    <span className="font-medium text-slate-800">{outcome?.timeline || lead?.timeline || "Not specified"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[9.5px] font-mono uppercase">Next Step</span>
                    <span className="font-medium text-slate-800">{outcome?.next_step_type || lead?.nextStepType || "Pending Call"}</span>
                  </div>
                </div>

                {/* AI Transcript & Summary */}
                {(outcome?.transcript_summary || outcome?.qualification_summary) && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mt-2">
                    <span className="text-[10px] font-medium uppercase font-mono text-slate-600 block mb-1">
                      Conversation Summary
                    </span>
                    <p className="text-[11.5px] text-slate-800 leading-relaxed">
                      {outcome?.transcript_summary || outcome?.qualification_summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
