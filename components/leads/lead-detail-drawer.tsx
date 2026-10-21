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
} from "lucide-react";
import { StatusBadge, InterestBadge } from "@/components/ui/badges";
import { getInitials } from "@/lib/utils";
import type { EnquiryRecord, CallOutcomeRecord } from "@/lib/hsk-sheets-schema";
import { Lead } from "@/lib/google-sheets";

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
  const projectInterest = enquiry?.project_interest || lead?.propertyInterest || "HSK Builder Group";
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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className="w-screen max-w-lg bg-white border-l border-slate-200/90 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-base border border-teal-200 shrink-0 shadow-2xs">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 leading-tight truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {customerName}
                  </h3>
                  <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {enquiryId}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {projectInterest}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* ── CARD 1: Original Customer Intake (STRICTLY IMMUTABLE) ── */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Customer Submission (Immutable)</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Original Intake
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Phone (E.164)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-800 text-[12.5px]">{phoneNumber}</span>
                    <button
                      onClick={handleCopyPhone}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copy phone"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copied && <span className="text-[10px] text-teal-600 font-medium">Copied!</span>}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Selected Project</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 truncate">{projectInterest}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Intake Source</span>
                  <span className="text-slate-700 block mt-0.5">{source}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Campaign / UTM</span>
                  <span className="text-slate-700 block mt-0.5 truncate">{utmCampaign}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Customer Notes</span>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 leading-relaxed text-[11.5px]">
                  {customerNotes}
                </div>
              </div>

              <div className="text-[10.5px] text-slate-400 flex items-center gap-1 pt-1">
                <Calendar className="w-3 h-3" />
                <span>Submitted: {createdAt}</span>
              </div>
            </div>

            {/* ── CARD 2: AI Voice Agent Qualification Lifecycle ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>AI Voice Agent Qualification</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Alex Real Estate AI
                </span>
              </div>

              {/* Status & Attempt Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Current Status</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{currentStatus}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Queue Priority</span>
                  <span className="font-bold text-teal-800 block mt-0.5">{queueClass}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Customer Attempts</span>
                  <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                    {custNoAnswer} / 3 max
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Technical Errors</span>
                  <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                    {techFailures} (isolated)
                  </span>
                </div>
              </div>

              {/* Last Call & Next Retry */}
              <div className="space-y-1.5 text-[11.5px]">
                {lastCallAt && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" /> Last Called:
                    </span>
                    <span className="font-mono">{new Date(lastCallAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                  </div>
                )}
                {nextRetryAt && (
                  <div className="flex items-center justify-between text-blue-700 font-medium">
                    <span className="flex items-center gap-1 text-blue-500">
                      <RotateCcw className="w-3.5 h-3.5" /> Next Retry:
                    </span>
                    <span className="font-mono">{new Date(nextRetryAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                  </div>
                )}
              </div>

              {/* Extracted Voice Qualification Details */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider">
                  Extracted Lead Criteria
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 block text-[9.5px] font-semibold uppercase">Disposition</span>
                    <span className="font-bold text-slate-800">{latestDisposition || "Pending Dial"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 block text-[9.5px] font-semibold uppercase">Qualification</span>
                    <span className="font-bold text-emerald-800">{qualificationStatus || "Unassessed"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 block text-[9.5px] font-semibold uppercase">Budget Range</span>
                    <span className="font-medium text-slate-800">{outcome?.budget_range || lead?.budgetRange || "Not specified"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 block text-[9.5px] font-semibold uppercase">Location Preference</span>
                    <span className="font-medium text-slate-800">{outcome?.preferred_location || lead?.preferredLocation || "Not specified"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 block text-[9.5px] font-semibold uppercase">Purchase Timeline</span>
                    <span className="font-medium text-slate-800">{outcome?.timeline || lead?.timeline || "Not specified"}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 block text-[9.5px] font-semibold uppercase">Agreed Next Step</span>
                    <span className="font-medium text-teal-800 font-semibold">{outcome?.next_step_type || lead?.nextStepType || "Pending Call"}</span>
                  </div>
                </div>

                {/* AI Transcript & Summary */}
                {(outcome?.transcript_summary || outcome?.qualification_summary) && (
                  <div className="p-3 rounded-xl bg-teal-50/40 border border-teal-200/60 mt-2">
                    <span className="text-[10px] font-bold uppercase text-teal-900 block mb-1">
                      Conversation Summary
                    </span>
                    <p className="text-[11.5px] text-teal-950 leading-relaxed">
                      {outcome?.transcript_summary || outcome?.qualification_summary}
                    </p>
                  </div>
                )}

                {/* Error Details if any */}
                {errorDetails && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 mt-2">
                    <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[10.5px]">Operational Note / Error</span>
                      <span className="text-[11px] font-mono">{errorDetails}</span>
                    </div>
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
