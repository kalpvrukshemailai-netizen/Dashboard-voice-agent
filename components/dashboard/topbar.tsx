"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  RefreshCw,
  Search,
  Settings,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Command,
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
    subtitle: "Real-time enquiry intake, queue priority, and AI voice qualification funnel.",
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
      className="flex items-center justify-between px-5 sm:px-7 sticky top-0 z-30 w-full min-w-0"
      style={{
        height: "58px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      {/* ── Left: Mobile Hamburger & Page Context ── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 -ml-1 rounded-lg md:hidden transition-colors shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="text-[14.5px] font-semibold text-slate-900 tracking-tight truncate"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {current.title}
            </h2>
            <span
              className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono tracking-wider font-medium text-slate-500"
              style={{ background: "#F1F5F9" }}
            >
              HSK
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden lg:block truncate max-w-sm">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* ── Center: Fast Global Search ── */}
      {(activeTab === "overview" || activeTab === "leads" || activeTab === "calls") && (
        <div className="hidden md:flex items-center flex-1 max-w-[280px] mx-4 min-w-0">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search leads, phone, unit..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg outline-none bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white transition-colors"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
              ⌘K
            </span>
          </div>
        </div>
      )}

      {/* ── Right: Clocks, Status Badges, and Sync Action ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time IST Clock */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-50 text-slate-700 border border-slate-200 tabular-nums"
          title="Current Asia/Kolkata Time (Calling Window: 9:00 AM – 10:00 PM IST)"
        >
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{istTime || "IST"}</span>
        </div>

        {/* Calling Window Indicator */}
        <div
          className={cn(
            "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border",
            isCallingWindowOpen
              ? "border-emerald-200"
              : "border-amber-200"
          )}
          style={{
            background: isCallingWindowOpen ? "#DCFAE5" : "#FFFBEB",
            color: isCallingWindowOpen ? "#04250E" : "#92400E",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isCallingWindowOpen ? "#16A34A" : "#D97706" }}
          />
          <span className="text-[10.5px]">
            {isCallingWindowOpen ? "Window Open" : "Outside Hours"}
          </span>
        </div>

        {/* Integration Status Button */}
        <button
          onClick={onOpenSettings}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border",
            connectionStatus === "connected"
              ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
          )}
          title="Inspect Google Sheets & External Connections"
        >
          <CheckCircle2
            className={cn(
              "w-3 h-3",
              connectionStatus === "connected" ? "text-emerald-600" : "text-amber-600"
            )}
          />
          <span className="hidden md:inline">
            {connectionStatus === "connected" ? "Live Sheet" : "Setup Needed"}
          </span>
        </button>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-7 px-2.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
          title={lastRefreshedAt ? `Last refreshed: ${lastRefreshedAt.toLocaleTimeString()}` : "Refresh"}
        >
          <RefreshCw className={cn("w-3 h-3 text-slate-500", isRefreshing && "animate-spin text-slate-900")} />
          <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Refresh"}</span>
        </button>
      </div>
    </header>
  );
}
