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
    type: "3 & 4 BHK Luxury High-Rise Apartments",
    priceRange: "₹1.85 Cr – ₹3.25 Cr",
    description: "Exclusive lifestyle residences with panoramic sky decks and Italian marble finishes.",
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
    description: "Pre-leased and bare-shell corporate spaces designed for MNC headquarters and flagship retail.",
    matchPattern: ["commercial", "skyline", "sg highway", "office", "retail"],
  },
  {
    id: "general_inbound",
    name: "General Web Inbound",
    location: "Ahmedabad Western Suburbs",
    type: "Inbound Real Estate Qualification Inquiries",
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
        (proj.id === "general_inbound" && !HSK_PROJECTS.slice(0, 3).some((other) => other.matchPattern.some((p) => projName.includes(p))))
      );
    });

    const total = matched.length;
    const qualified = matched.filter(
      (e) =>
        e.current_status === "QUALIFIED" ||
        e.qualification_status === "QUALIFIED" ||
        e.qualification_status === "INTERESTED" ||
        e.interested === true,
    ).length;
    const queued = matched.filter(
      (e) => e.current_status === "QUEUED" || e.current_status === "NEW" || e.callStatus === "Pending",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            HSK Project Portfolios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real estate development projects and targeted AI calling campaigns.
          </p>
        </div>
      </div>

      {/* Project Selector Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {projectStats.map((proj) => {
          const isSelected = proj.id === selectedProjectId;
          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className={cn(
                "p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-xs",
                isSelected
                  ? "bg-teal-900 text-white border-teal-800 shadow-md ring-2 ring-teal-500/30"
                  : "bg-white border-slate-200/90 text-slate-900 hover:border-slate-300",
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider font-mono",
                      isSelected ? "text-teal-300" : "text-slate-400",
                    )}
                  >
                    Project Campaign
                  </span>
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      isSelected ? "bg-teal-800 text-teal-200" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                <h3
                  className={cn(
                    "text-sm font-bold truncate",
                    isSelected ? "text-white" : "text-slate-900",
                  )}
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {proj.name}
                </h3>
                <p
                  className={cn(
                    "text-[11px] truncate mt-0.5",
                    isSelected ? "text-teal-200" : "text-slate-500",
                  )}
                >
                  {proj.location}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/20 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className={cn("block text-[10px]", isSelected ? "text-teal-300" : "text-slate-400")}>
                    Enquiries
                  </span>
                  <span className="font-bold text-base">{proj.total}</span>
                </div>
                <div>
                  <span className={cn("block text-[10px]", isSelected ? "text-teal-300" : "text-slate-400")}>
                    Qualified
                  </span>
                  <span className="font-bold text-base text-emerald-400">{proj.qualified}</span>
                </div>
                <div>
                  <span className={cn("block text-[10px]", isSelected ? "text-teal-300" : "text-slate-400")}>
                    Rate
                  </span>
                  <span className="font-bold text-base">{proj.conversionRate}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Project Detail Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 font-mono bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              Active Portfolio
            </span>
            <h2
              className="text-xl font-extrabold text-slate-900 mt-2"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {activeProject.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {activeProject.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-teal-900">
                <IndianRupee className="w-3.5 h-3.5 text-teal-600" />
                {activeProject.priceRange}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
              {activeProject.description}
            </p>
          </div>
        </div>

        {/* Enquiries for this Project */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Enquiries for {activeProject.name} ({activeProject.leads.length})
            </h4>
          </div>

          {activeProject.leads.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No prospect submissions logged for this project yet. Inbound enquiries specifying &quot;{activeProject.name}&quot; will automatically populate here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs">
              {activeProject.leads.slice(0, 5).map((enq: any, i: number) => (
                <div
                  key={i}
                  onClick={() => onSelectLead && onSelectLead(enq)}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-900">{enq.customer_name || enq.name}</span>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {enq.enquiry_id || enq.enquiryId} • {enq.phone_number || enq.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {enq.current_status || enq.callStatus || "QUEUED"}
                    </span>
                    <span className="block text-[10.5px] text-slate-400 mt-1">
                      {enq.created_at || "Recent"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
