"use client";

import React from "react";
import {
  Menu,
  RefreshCw,
  Bell,
  Search,
  FileSpreadsheet,
  Settings,
} from "lucide-react";
import { NavTab } from "./sidebar";

interface TopbarProps {
  activeTab: NavTab;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDemoMode: boolean;
}

const titles: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "AI-powered lead qualification and calling workspace.",
  },
  leads: {
    title: "Leads",
    subtitle: "Manage and qualify your real-estate prospects.",
  },
  campaigns: {
    title: "Campaigns",
    subtitle: "Targeted outbound calling batches and sequential agent queue.",
  },
  calls: {
    title: "Call History",
    subtitle: "Real-time records and transcripts of AI prospect conversations.",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Qualification performance, funnel conversions, and intent distribution.",
  },
  settings: {
    title: "Settings",
    subtitle: "Google Sheets connection, ElevenLabs agent, and webhook configuration.",
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
}: TopbarProps) {
  const current = titles[activeTab] || titles.overview;

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 w-full min-w-0"
      style={{
        height: "var(--topbar-height, 68px)",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* ── Left: Mobile trigger & Page title ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 rounded-xl md:hidden transition-colors shrink-0"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title block */}
        <div className="min-w-0">
          <h2
            className="text-[15px] font-semibold leading-tight truncate"
            style={{
              fontFamily: "'Manrope', sans-serif",
              color: "var(--text-primary)",
              fontWeight: 700,
            }}
          >
            {current.title}
          </h2>
          <p
            className="text-[11.5px] font-normal hidden sm:block truncate max-w-xs"
            style={{ color: "var(--text-muted)", fontFamily: "'Inter', sans-serif" }}
          >
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* ── Center: Search ── */}
      <div className="hidden lg:flex items-center flex-1 max-w-[280px] mx-6 min-w-0">
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ width: 14, height: 14, color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-xl outline-none transition-all"
            style={{
              fontFamily: "'Inter', sans-serif",
              background: "var(--app-background)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-blue)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56,87,232,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Source badge */}
        <button
          onClick={onOpenSettings}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11.5px] font-semibold transition-colors"
          title="Click to configure Google Sheet connection"
          style={{
            fontFamily: "'Inter', sans-serif",
            border: "1px solid var(--border)",
            color: isDemoMode ? "var(--warning-text)" : "var(--success-text)",
            background: isDemoMode ? "var(--warning-bg)" : "var(--success-bg)",
            borderColor: isDemoMode ? "var(--warning-border)" : "var(--success-border)",
          }}
        >
          <FileSpreadsheet style={{ width: 13, height: 13 }} />
          {isDemoMode ? "Demo Mode" : "Sheet Connected"}
        </button>

        <div className="ds-sep hidden sm:block" />

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ds-btn-icon"
          title="Refresh leads from Google Sheet"
        >
          <RefreshCw
            style={{
              width: 15,
              height: 15,
              color: isRefreshing ? "var(--brand-blue)" : undefined,
            }}
            className={isRefreshing ? "animate-spin" : ""}
          />
        </button>

        {/* Notifications */}
        <button
          className="ds-btn-icon relative"
          title="Notifications"
        >
          <Bell style={{ width: 15, height: 15 }} />
          <span
            className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full"
            style={{ background: "var(--brand-blue)" }}
          />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="ds-btn-icon"
          title="Settings"
        >
          <Settings style={{ width: 15, height: 15 }} />
        </button>

        <div className="ds-sep" />

        {/* Workspace avatar */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg text-white font-bold text-[11px] flex items-center justify-center shrink-0"
            style={{
              background: "var(--brand-navy)",
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            BP
          </div>
          <span
            className="text-[13px] font-semibold hidden md:inline"
            style={{ color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}
          >
            Beprompter
          </span>
        </div>
      </div>
    </header>
  );
}
