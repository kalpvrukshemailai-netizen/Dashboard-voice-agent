"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Settings,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { NavTab } from "./sidebar";
import { cn } from "@/lib/utils";

interface TopbarProps {
  activeTab: NavTab;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDemoMode: boolean;
  connectionStatus?: "connected" | "error" | "mock";
  lastRefreshedAt?: Date | null;
  isCallingWindowOpen?: boolean;
}

const titles: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Command Center",
    subtitle: "Real-time enquiry intake, queue priority, and AI voice qualification performance.",
  },
  leads: {
    title: "Enquiry Management",
    subtitle: "Immutable prospect submissions, attempt counters, and AI qualification details.",
  },
  calls: {
    title: "Call History & Outcomes",
    subtitle: "Verifiable AI voice conversations, dispositions, transcripts, and scheduled next steps.",
  },
  queue: {
    title: "Queue & Dialer Operations",
    subtitle: "Calling hours enforcement (9 AM–10 PM IST), priority order, and active locks.",
  },
  campaigns: {
    title: "Project Portfolios",
    subtitle: "HSK Solitaire, HSK Park View, and HSK Commercial project campaigns.",
  },
  analytics: {
    title: "Qualification Analytics",
    subtitle: "Conversion funnels, prospect interest distribution, and call metrics.",
  },
  settings: {
    title: "System Health & Integrations",
    subtitle: "Diagnostic status of Google Sheets, ElevenLabs, Exotel, and Webhooks.",
  },
};

export function Topbar({
  activeTab,
  onOpenMobileMenu,
  onRefresh,
  isRefreshing,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  isDemoMode,
  connectionStatus = "connected",
  lastRefreshedAt,
  isCallingWindowOpen = true,
}: TopbarProps) {
  const current = titles[activeTab] || titles.overview;
  const [istTime, setIstTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date());
        setIstTime(timeStr);
      } catch {
        setIstTime(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 w-full min-w-0"
      style={{
        height: "64px",
        background: "var(--surface, #ffffff)",
        borderBottom: "1px solid var(--border, rgba(226, 232, 240, 0.8))",
      }}
    >
      {/* ── Left: Mobile trigger & Page title ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 rounded-xl md:hidden transition-colors shrink-0 text-slate-500 hover:text-slate-900"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title block */}
        <div className="min-w-0">
          <h2
            className="text-[15px] font-bold leading-tight truncate text-slate-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {current.title}
          </h2>
          <p
            className="text-[11.5px] font-normal hidden sm:block truncate max-w-sm text-slate-500"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* ── Center: Search for Enquiries ── */}
      {(activeTab === "overview" || activeTab === "leads" || activeTab === "calls") && (
        <div className="hidden lg:flex items-center flex-1 max-w-[260px] mx-4 min-w-0">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, phone, ID..."
              className="w-full pl-8 pr-3 py-1.5 text-[12.5px] rounded-xl outline-none bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      )}

      {/* ── Right: Clocks, Badges, and Actions ── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Real-time IST Clock */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200/80"
          title="Current Asia/Kolkata Time (Calling Window: 9:00 AM – 10:00 PM IST)"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{istTime || "IST"}</span>
        </div>

        {/* Calling Window Indicator */}
        <div
          className={cn(
            "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border",
            isCallingWindowOpen
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200",
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isCallingWindowOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
            )}
          />
          <span className="text-[11px] font-semibold">
            {isCallingWindowOpen ? "Window Open" : "Outside Hours"}
          </span>
        </div>

        {/* Integration State Button */}
        <button
          onClick={onOpenSettings}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11.5px] font-semibold transition-all border shadow-2xs",
            connectionStatus === "connected"
              ? "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
              : connectionStatus === "mock"
              ? "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100"
              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
          )}
          title="Inspect Google Sheets & External Connections"
        >
          {connectionStatus === "connected" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span className="hidden sm:inline">
            {connectionStatus === "connected"
              ? "Live Sheet"
              : connectionStatus === "mock"
              ? "Test Double"
              : "Setup Needed"}
          </span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ds-btn ds-btn-secondary h-8 px-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
          title={lastRefreshedAt ? `Last refreshed: ${lastRefreshedAt.toLocaleTimeString()}` : "Refresh"}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-teal-600")} />
          <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </header>
  );
}
