"use client";

import React, { useState } from "react";
import {
  Building2,
  Clock,
  Radio,
  Flame,
  RotateCcw,
  Archive,
  ShieldCheck,
  CheckCircle2,
  Users,
  ThumbsUp,
  MapPin,
  IndianRupee,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { EnquiryRecord } from "@/lib/hsk-sheets-schema";
import { Lead } from "@/lib/google-sheets";
import { cn } from "@/lib/utils";

interface CampaignViewProps {
  enquiries?: EnquiryRecord[];
  leads?: Lead[];
  onSelectLead?: (lead: any) => void;
  onCallLead?: (lead: any) => void;
}

interface ProjectCampaign {
  id: string;
  name: string;
  location: string;
  type: string;
  priceRange: string;
  description: string;
  matchPattern: string[];
}

const HSK_PROJECTS: ProjectCampaign[] = [
  {
    id: "solitaire",
    name: "HSK Solitaire",
    location: "Ambli - Bopal Road, Ahmedabad",
    type: "3 & 4 BHK Luxury High-Rise Residences",
    priceRange: "₹1.85 Cr – ₹3.25 Cr",
    description: "Exclusive lifestyle residences featuring panoramic sky decks and Italian marble finishes.",
    matchPattern: ["solitaire", "ambli", "bopal", "3 bhk", "4 bhk"],
  },
  {
    id: "park_view",
    name: "HSK Park View",
    location: "Shela, Ahmedabad",
    type: "Elite Gated Community Villas & Penthouses",
    priceRange: "₹3.50 Cr – ₹6.75 Cr",
    description: "Private gardens, personal splash pools, and low-density luxury villa enclave.",
    matchPattern: ["park view", "park", "shela", "villa", "penthouse"],
  },
  {
    id: "skyline",
    name: "HSK Commercial Skyline",
    location: "SG Highway Corporate Corridor",
    type: "Grade A Corporate Offices & High-Street Retail",
    priceRange: "₹1.20 Cr – ₹12.50 Cr",
    description: "Pre-leased and bare-shell corporate spaces designed for regional headquarters and flagship retail.",
    matchPattern: ["commercial", "skyline", "sg highway", "office", "retail"],
  },
  {
    id: "general_inbound",
    name: "General Web Inbound",
    location: "Ahmedabad Western Suburbs",
    type: "Inbound Real Estate Inquiries",
    priceRange: "Flexible Portfolio",
    description: "Multi-channel website and campaign intake awaiting property configuration matching.",
    matchPattern: ["general", "website", "hsk builder group"],
  },
];

export function CampaignView({ enquiries = [], leads = [], onSelectLead }: CampaignViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("solitaire");

  // Determine items list
  const allEnquiries = enquiries.length > 0 ? enquiries : (leads as any[]);

  // Calculate real breakdown per project
  const projectStats = HSK_PROJECTS.map((proj) => {
    const matched = allEnquiries.filter((enq) => {
      const projName = String(enq.project_interest || enq.propertyInterest || "").toLowerCase();
      const notes = String(enq.customer_notes || enq.notes || "").toLowerCase();
      return (
        proj.matchPattern.some((p) => projName.includes(p) || notes.includes(p)) ||
        (proj.id === "general_inbound" &&
          !HSK_PROJECTS.slice(0, 3).some((other) => other.matchPattern.some((p) => projName.includes(p))))
      );
    });

    const total = matched.length;
    const qualified = matched.filter(
      (e) =>
        e.current_status === "QUALIFIED" ||
        e.qualification_status === "QUALIFIED" ||
        e.qualification_status === "INTERESTED" ||
        e.interested === true
    ).length;
    const queued = matched.filter(
      (e) => e.current_status === "QUEUED" || e.current_status === "NEW" || e.callStatus === "Pending"
    ).length;

    return {
      ...proj,
      total,
      qualified,
      queued,
      conversionRate: total > 0 ? Math.round((qualified / total) * 100) : 0,
      leads: matched,
    };
  });

  const activeProject = projectStats.find((p) => p.id === selectedProjectId) || projectStats[0];

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/60">
        <div>
          <h1
            className="text-[21px] font-semibold tracking-tight text-slate-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Project Portfolios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real estate development projects and targeted AI calling campaign performance.
          </p>
        </div>
      </div>

      {/* Project Selector Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {projectStats.map((proj) => {
          const isSelected = proj.id === selectedProjectId;
          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className={cn(
                "p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between",
                isSelected
                  ? "bg-slate-900 text-white border-slate-800"
                  : "bg-white border-slate-200 text-slate-900 hover:border-slate-300"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={cn(
                      "text-[9.5px] font-mono uppercase tracking-wider font-medium",
                      isSelected ? "text-emerald-300" : "text-slate-400"
                    )}
                  >
                    PORTFOLIO
                  </span>
                  <div
                    className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                      isSelected ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                <h3
                  className={cn("text-[13.5px] font-semibold truncate", isSelected ? "text-white" : "text-slate-900")}
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {proj.name}
                </h3>
                <p
                  className={cn(
                    "text-[11px] truncate mt-0.5",
                    isSelected ? "text-slate-300" : "text-slate-500"
                  )}
                >
                  {proj.location}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/10 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className={cn("block text-[9.5px]", isSelected ? "text-slate-400" : "text-slate-400")}>
                    LEADS
                  </span>
                  <span className="font-semibold text-sm tabular-nums">{proj.total}</span>
                </div>
                <div>
                  <span className={cn("block text-[9.5px]", isSelected ? "text-slate-400" : "text-slate-400")}>
                    QUALIFIED
                  </span>
                  <span
                    className={cn("font-semibold text-sm tabular-nums", isSelected ? "text-emerald-400" : "text-emerald-700")}
                  >
                    {proj.qualified}
                  </span>
                </div>
                <div>
                  <span className={cn("block text-[9.5px]", isSelected ? "text-slate-400" : "text-slate-400")}>
                    YIELD
                  </span>
                  <span className="font-semibold text-sm tabular-nums">{proj.conversionRate}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Project Detail Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-mono font-medium"
              style={{ background: "#dcfae5", color: "#04250e" }}
            >
              ACTIVE CAMPAIGN
            </span>
            <h2
              className="text-lg font-bold text-slate-900 mt-1"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {activeProject.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{activeProject.type}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
              style={{ background: "#f1f5f9", color: "#0f172a" }}
            >
              {activeProject.priceRange}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
          {activeProject.description}
        </p>

        {/* Campaign Leads Preview */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Assigned Pipeline Leads ({activeProject.leads.length})
            </h4>
          </div>

          {activeProject.leads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No inbound leads currently tagged for this property. Test an intake from the Command Center.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-[11px]">
                    <th className="py-2.5 px-4 font-normal w-[40%]">Lead & Phone</th>
                    <th className="py-2.5 px-3 font-normal w-[30%]">Queue Status</th>
                    <th className="py-2.5 px-3 font-normal text-right w-[30%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeProject.leads.slice(0, 5).map((lead: any, i: number) => (
                    <tr
                      key={lead.enquiry_id || lead.enquiryId || i}
                      onClick={() => onSelectLead?.(lead)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 truncate">
                        <div className="font-medium text-slate-900 group-hover:text-slate-700 truncate">
                          {lead.customer_name || lead.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {lead.phone_number || lead.phone}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-medium"
                          style={{
                            background:
                              lead.current_status === "QUALIFIED" || lead.qualification_status === "QUALIFIED"
                                ? "#dcfae5"
                                : "#f1f5f9",
                            color:
                              lead.current_status === "QUALIFIED" || lead.qualification_status === "QUALIFIED"
                                ? "#04250e"
                                : "#334155",
                          }}
                        >
                          {lead.current_status || lead.callStatus || "QUEUED"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead?.(lead);
                          }}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
