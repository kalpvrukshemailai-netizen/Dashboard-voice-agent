"use client";

import React from "react";
import { PhoneCall, Eye, Building2, MapPin, IndianRupee, Calendar, ArrowRight } from "lucide-react";
import { Lead } from "@/lib/google-sheets";
import { StatusBadge, InterestBadge } from "@/components/ui/badges";
import { getInitials } from "@/lib/utils";

interface LeadTableProps {
  leads: Lead[];
  selectedLead: Lead | null;
  onSelectLead: (lead: Lead) => void;
  onCallLead: (lead: Lead) => void;
  loading?: boolean;
  compact?: boolean;
  onViewAll?: () => void;
}

export function LeadTable({
  leads,
  selectedLead,
  onSelectLead,
  onCallLead,
  loading = false,
  compact = false,
  onViewAll,
}: LeadTableProps) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs min-w-0 w-full">
        {compact && (
          <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Recent Leads
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Prospects ready for qualification.
              </p>
            </div>
          </div>
        )}
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="w-1/4 h-3.5 bg-slate-100 rounded" />
                <div className="w-1/6 h-2.5 bg-slate-100 rounded" />
              </div>
              <div className="w-20 h-4 bg-slate-100 rounded shrink-0" />
              <div className="w-24 h-4 bg-slate-100 rounded shrink-0" />
              <div className="w-16 h-8 bg-slate-100 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs min-w-0 w-full">
        {compact && (
          <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Recent Leads
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Prospects ready for qualification.
              </p>
            </div>
          </div>
        )}
        <div className="p-10 text-center min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No leads found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {compact
              ? "No prospects currently queued for qualification."
              : "No prospects match your current search and filter settings. Try clearing your filters or loading leads from Google Sheets."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs min-w-0 w-full">
      {/* Integrated Card Header for Compact Mode */}
      {compact && (
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h3
              className="text-sm font-bold text-slate-900 truncate"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Recent Leads
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Prospects ready for qualification.
            </p>
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1 text-xs font-semibold shrink-0 transition-colors hover:opacity-80"
              style={{ color: "var(--brand-blue)" }}
            >
              View all leads
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block table-scroll-container">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            {compact ? (
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-[28%] min-w-[150px]">Lead</th>
                <th className="hidden xl:table-cell py-3 px-3 w-[16%] min-w-[90px]">Company</th>
                <th className="py-3 px-3 w-[22%] min-w-[110px]">Intent</th>
                <th className="hidden 2xl:table-cell py-3 px-3 w-[14%] min-w-[85px]">Budget</th>
                <th className="hidden min-[1366px]:table-cell py-3 px-3 w-[14%] min-w-[95px]">Location</th>
                <th className="py-3 px-3 w-[16%] min-w-[90px]">Status</th>
                <th className="py-3 px-4 text-right w-[14%] min-w-[85px]">Action</th>
              </tr>
            ) : (
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-[18%] min-w-[150px]">Lead</th>
                <th className="py-3 px-3 w-[12%] min-w-[100px]">Company</th>
                <th className="py-3 px-3 w-[13%] min-w-[110px]">Intent</th>
                <th className="py-3 px-3 w-[10%] min-w-[85px]">Budget</th>
                <th className="py-3 px-3 w-[11%] min-w-[95px]">Location</th>
                <th className="hidden 2xl:table-cell py-3 px-3 w-[9%] min-w-[85px]">Timeline</th>
                <th className="py-3 px-3 w-[10%] min-w-[85px]">Status</th>
                <th className="hidden xl:table-cell py-3 px-3 w-[10%] min-w-[90px]">Interest</th>
                <th className="hidden 2xl:table-cell py-3 px-3 w-[10%] min-w-[100px]">Next Step</th>
                <th className="py-3 px-4 text-right w-[11%] min-w-[80px]">Action</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {leads.map((lead) => {
              const isSelected = selectedLead?.row === lead.row;
              const initials = getInitials(lead.name);

              if (compact) {
                return (
                  <tr
                    key={lead.row}
                    onClick={() => onSelectLead(lead)}
                    className={`group cursor-pointer transition-colors duration-150 ${
                      isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Lead Cell */}
                    <td className="py-3 px-4 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: "rgba(56, 87, 232, 0.08)",
                            color: "var(--brand-blue)",
                            border: "1px solid rgba(56, 87, 232, 0.18)",
                          }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-[13px]"
                            title={lead.name}
                          >
                            {lead.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal truncate">
                            {lead.phone || "No phone"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="hidden xl:table-cell py-3 px-3 text-slate-600 font-medium min-w-0">
                      <div className="truncate text-xs" title={lead.company || ""}>
                        {lead.company || "—"}
                      </div>
                    </td>

                    {/* Intent */}
                    <td className="py-3 px-3 text-slate-800 font-medium min-w-0">
                      <div className="truncate text-xs" title={lead.propertyInterest || ""}>
                        {lead.propertyInterest || "—"}
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="hidden 2xl:table-cell py-3 px-3 text-slate-600 font-medium min-w-0">
                      <div className="truncate text-xs" title={lead.budgetRange || ""}>
                        {lead.budgetRange || "—"}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="hidden min-[1366px]:table-cell py-3 px-3 text-slate-600 min-w-0">
                      <div className="truncate text-xs" title={lead.preferredLocation || ""}>
                        {lead.preferredLocation || "—"}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap min-w-0">
                      <StatusBadge status={lead.callStatus} />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onCallLead(lead)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white font-semibold text-xs transition-colors shadow-2xs hover:opacity-90"
                          style={{ background: "var(--brand-blue)" }}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          Call
                        </button>
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              // Full Table Row (Leads Tab)
              return (
                <tr
                  key={lead.row}
                  onClick={() => onSelectLead(lead)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50/70"
                  }`}
                >
                  {/* Lead Cell */}
                  <td className="py-3 px-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-100">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-[13px]"
                          title={lead.name}
                        >
                          {lead.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal truncate">
                          {lead.phone || "No phone"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="py-3 px-3 text-slate-700 font-medium min-w-0">
                    <div className="truncate text-xs" title={lead.company || ""}>
                      {lead.company || "—"}
                    </div>
                  </td>

                  {/* Intent */}
                  <td className="py-3 px-3 text-slate-800 font-medium min-w-0">
                    <div className="truncate text-xs" title={lead.propertyInterest || ""}>
                      {lead.propertyInterest || "—"}
                    </div>
                  </td>

                  {/* Budget */}
                  <td className="py-3 px-3 text-slate-700 font-medium min-w-0">
                    <div className="truncate text-xs" title={lead.budgetRange || ""}>
                      {lead.budgetRange || "—"}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-3 text-slate-600 min-w-0">
                    <div className="truncate text-xs" title={lead.preferredLocation || ""}>
                      {lead.preferredLocation || "—"}
                    </div>
                  </td>

                  {/* Timeline */}
                  <td className="hidden 2xl:table-cell py-3 px-3 text-slate-600 min-w-0">
                    <div className="truncate text-xs" title={lead.timeline || ""}>
                      {lead.timeline || "—"}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap min-w-0">
                    <StatusBadge status={lead.callStatus} />
                  </td>

                  {/* Interest */}
                  <td className="hidden xl:table-cell py-3 px-3 whitespace-nowrap min-w-0">
                    <InterestBadge
                      status={lead.interestStatus}
                      interested={lead.interested}
                    />
                  </td>

                  {/* Next Step */}
                  <td className="hidden 2xl:table-cell py-3 px-3 text-slate-700 min-w-0">
                    <div className="truncate text-xs" title={lead.nextStepType || ""}>
                      {lead.nextStepType || "—"}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onCallLead(lead)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-semibold text-xs transition-colors shadow-2xs hover:opacity-90"
                        style={{ background: "var(--brand-blue)" }}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        Call
                      </button>
                      <button
                        onClick={() => onSelectLead(lead)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Cards View */}
      <div className="block lg:hidden divide-y divide-slate-100 min-w-0 w-full">
        {leads.map((lead) => {
          const initials = getInitials(lead.name);
          const isSelected = selectedLead?.row === lead.row;

          return (
            <div
              key={lead.row}
              onClick={() => onSelectLead(lead)}
              className={`p-4 transition-colors min-w-0 w-full ${isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50/70"}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-100">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={lead.name}>
                      {lead.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate" title={`${lead.company || ""} · ${lead.phone || ""}`}>
                      {lead.company ? `${lead.company} · ` : ""}{lead.phone || "No phone"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={lead.callStatus} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 my-2.5 text-xs text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 min-w-0">
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">Intent</span>
                  <span className="font-semibold text-slate-800 truncate block" title={lead.propertyInterest || "—"}>
                    {lead.propertyInterest || "—"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">Budget</span>
                  <span className="font-semibold text-slate-800 truncate block" title={lead.budgetRange || "—"}>
                    {lead.budgetRange || "—"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">Location</span>
                  <span className="truncate block" title={lead.preferredLocation || "—"}>
                    {lead.preferredLocation || "—"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Interest</span>
                  <div className="truncate">
                    <InterestBadge status={lead.interestStatus} interested={lead.interested} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2 min-w-0">
                <span
                  className="text-[11px] text-slate-400 truncate flex-1"
                  title={lead.nextStepType ? `Next: ${lead.nextStepType}` : "Pending call"}
                >
                  {lead.nextStepType ? `Next: ${lead.nextStepType}` : "Pending call"}
                </span>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onCallLead(lead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow-2xs hover:opacity-90 transition-opacity"
                    style={{ background: "var(--brand-blue)" }}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Call
                  </button>
                  <button
                    onClick={() => onSelectLead(lead)}
                    className="p-1.5 rounded-lg text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
