"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  PhoneCall,
  Clock,
  Settings,
  Building2,
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "overview" | "leads" | "campaigns" | "calls" | "queue" | "analytics" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  leadCount: number;
  outcomesCount?: number;
  agencyName?: string;
  isCallingWindowOpen?: boolean;
  connectionStatus?: "connected" | "error" | "mock";
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  leadCount,
  outcomesCount = 0,
  agencyName = "HSK Builder Group",
  isCallingWindowOpen = true,
  connectionStatus = "connected",
}: SidebarProps) {
  const navItems = [
    { id: "overview" as NavTab, label: "Overview", icon: LayoutDashboard },
    { id: "leads" as NavTab, label: "Enquiries", icon: Users, badge: leadCount > 0 ? leadCount : undefined },
    { id: "calls" as NavTab, label: "Call Outcomes", icon: PhoneCall, badge: outcomesCount > 0 ? outcomesCount : undefined },
    { id: "queue" as NavTab, label: "Queue Operations", icon: Radio },
    { id: "campaigns" as NavTab, label: "Project Portfolios", icon: Building2 },
    { id: "settings" as NavTab, label: "System Health", icon: Settings },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const content = (
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: "var(--sidebar-width, 252px)",
        background: "#0A1120",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.07)" }}
      >
        <div className="flex items-center gap-3">
          {/* HSK Emblem Mark */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, #0F9F8F 0%, #1E3A8A 100%)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <Building2 className="w-[19px] h-[19px] text-white" strokeWidth={2} />
          </div>
          {/* Brand text */}
          <div className="min-w-0">
            <h1
              className="text-[13.5px] font-extrabold leading-tight tracking-tight text-white truncate"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              HSK BUILDER GROUP
            </h1>
            <p className="text-[10px] font-medium leading-tight text-slate-400 truncate">
              AI Calling & Lead Platform
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg md:hidden transition-colors text-slate-400 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Workspace Card ── */}
      <div className="px-3 pt-3">
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(15, 159, 143, 0.2)" }}
          >
            <Radio className="w-3.5 h-3.5 text-teal-400" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="block text-[9px] font-semibold tracking-wider uppercase text-slate-400"
            >
              Workspace
            </span>
            <span
              className="block text-xs font-bold truncate text-slate-200"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {agencyName.toUpperCase()}
            </span>
          </div>
          {/* Online indicator */}
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              connectionStatus === "connected" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-amber-400",
            )}
            title={connectionStatus === "connected" ? "Google Sheet Sync Active" : "Diagnostic Check Needed"}
          />
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div
          className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"
        >
          Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
                isActive
                  ? "text-white bg-white/10 font-semibold shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
              style={{
                borderLeft: isActive ? "3px solid #0F9F8F" : "3px solid transparent",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className="shrink-0"
                  style={{
                    width: 17,
                    height: 17,
                    color: isActive ? "#2DD4BF" : "rgba(255,255,255,0.45)",
                  }}
                  strokeWidth={isActive ? 2.2 : 1.75}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10.5px] font-bold tabular-nums ml-1 shrink-0",
                    isActive
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-white/10 text-slate-300",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom: Calling Window & System Info ── */}
      <div
        className="p-3 space-y-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Calling Window Badge */}
        <div
          className="px-3 py-2 rounded-xl text-[11px] flex items-center gap-2"
          style={{
            background: isCallingWindowOpen ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
            border: isCallingWindowOpen ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(245, 158, 11, 0.2)",
          }}
        >
          <Clock
            className={cn("w-3.5 h-3.5 shrink-0", isCallingWindowOpen ? "text-emerald-400" : "text-amber-400")}
          />
          <div className="min-w-0 flex-1 leading-tight">
            <span
              className={cn(
                "font-semibold block",
                isCallingWindowOpen ? "text-emerald-300" : "text-amber-300",
              )}
            >
              {isCallingWindowOpen ? "Window Open" : "Window Closed"}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              9 AM – 10 PM IST
            </span>
          </div>
        </div>

        {/* System Settings Link */}
        <button
          onClick={() => handleSelect("settings")}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-medium transition-all",
            activeTab === "settings"
              ? "text-white bg-white/10 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
          )}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Diagnostics</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v1.1.0</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ background: "rgba(10, 17, 32, 0.75)" }}
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
