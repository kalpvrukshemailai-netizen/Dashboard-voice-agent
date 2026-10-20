"use client";

import React from "react";
import {
  X,
  PhoneCall,
  Building2,
  Phone,
  FileText,
  Compass,
  IndianRupee,
  MapPin,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Clock,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { Lead } from "@/lib/google-sheets";
import { StatusBadge, InterestBadge } from "@/components/ui/badges";
import { getInitials } from "@/lib/utils";

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onCallLead: (lead: Lead) => void;
}

export function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  onCallLead,
}: LeadDetailDrawerProps) {
  if (!isOpen || !lead) return null;

  const initials = getInitials(lead.name);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className="w-screen max-w-md bg-white border-l border-slate-200/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center text-base border border-indigo-100">
                {initials}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {lead.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  {lead.company && (
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {lead.company}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {lead.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="p-4 bg-white border-b border-slate-100">
            <button
              onClick={() => onCallLead(lead)}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-xs hover:shadow-indigo-500/20 active:scale-[0.99]"
            >
              <PhoneCall className="w-4 h-4" />
              Call Lead (Alex AI)
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Lead Information */}
            <section>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Lead Information
              </h4>
              <div className="space-y-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 text-xs">
                {lead.notes && (
                  <div>
                    <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Lead Notes
                    </span>
                    <p className="text-slate-700 font-normal leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60">
                      {lead.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                      <Compass className="w-3 h-3 text-slate-400" />
                      Property Intent
                    </span>
                    <span className="font-semibold text-slate-800">
                      {lead.propertyInterest || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                      <IndianRupee className="w-3 h-3 text-slate-400" />
                      Budget
                    </span>
                    <span className="font-semibold text-slate-800">
                      {lead.budgetRange || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      Location
                    </span>
                    <span className="font-semibold text-slate-800">
                      {lead.preferredLocation || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Timeline
                    </span>
                    <span className="font-semibold text-slate-800">
                      {lead.timeline || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Qualification Result */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Qualification Result
                </h4>
                <InterestBadge
                  status={lead.interestStatus}
                  interested={lead.interested}
                />
              </div>

              <div className="space-y-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block mb-1">Interest Status</span>
                  <div className="font-semibold text-slate-800">
                    {lead.interestStatus || "Not Qualified Yet"}
                  </div>
                </div>

                {lead.interestReason && (
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Interest Reason</span>
                    <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60">
                      {lead.interestReason}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 font-medium block mb-1">Next Step</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    {lead.nextStepType || "Pending Initial Call"}
                  </div>
                </div>
              </div>
            </section>

            {/* Call Information */}
            <section>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Call Information
              </h4>
              <div className="space-y-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Call Status
                  </span>
                  <StatusBadge status={lead.callStatus} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Last Called
                  </span>
                  <span className="font-medium text-slate-700">
                    {lead.calledAt ? new Date(lead.calledAt).toLocaleString() : "Never"}
                  </span>
                </div>

                {lead.conversationId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      Conversation ID
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {lead.conversationId}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
