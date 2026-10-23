"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  Clock,
  Settings,
  Building2,
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  ChevronRight,
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
    { id: "settings" as NavTab, label: "System Health", icon: Activity },
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
        background: "#070B12",
        borderRight: "1px solid rgba(255, 255, 255, 0.07)",
      }}
    >
      {/* ── Brand Header (Executive Luxury Architectural Mark) ── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
      >
        <div className="flex items-center gap-3">
          {/* Architectural Crest Monogram */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "#064E3B",
              border: "1px solid rgba(45, 212, 191, 0.25)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
            }}
          >
            <Building2 className="w-[18px] h-[18px] text-emerald-300" strokeWidth={2.2} />
          </div>

          {/* Brand Typography */}
          <div className="min-w-0">
            <h1
              className="text-[13px] font-bold leading-tight tracking-wider text-slate-100 uppercase truncate"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              HSK BUILDER GROUP
            </h1>
            <p className="text-[10px] font-medium leading-tight text-slate-400 tracking-wide truncate">
              Voice Intelligence Platform
            </p>
          </div>
        </div>

        {/* Mobile close trigger */}
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

      {/* ── Workspace Context Card ── */}
      <div className="px-3 pt-3 pb-1">
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "rgba(15, 118, 110, 0.25)" }}
          >
            <Radio className="w-3 h-3 text-emerald-400" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[8.5px] font-semibold tracking-widest uppercase text-slate-400 font-mono">
              ACTIVE WORKSPACE
            </span>
            <span
              className="block text-[11.5px] font-bold truncate text-slate-200"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {agencyName.toUpperCase()}
            </span>
          </div>
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              connectionStatus === "connected"
                ? "bg-emerald-400"
                : "bg-amber-400"
            )}
            title={connectionStatus === "connected" ? "Live Pipeline Synchronized" : "Diagnostic Attention Needed"}
          />
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-2 pt-1 pb-1.5 text-[9.5px] font-bold uppercase tracking-widest text-slate-400 font-mono">
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
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[12.5px] font-medium transition-colors text-left",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
                isActive
                  ? "text-white font-semibold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
              )}
              style={{
                background: isActive ? "rgba(255, 255, 255, 0.07)" : "transparent",
                borderLeft: isActive ? "3px solid #0F766E" : "3px solid transparent",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className="shrink-0 transition-colors"
                  style={{
                    width: 16,
                    height: 16,
                    color: isActive ? "#34D399" : "rgba(255, 255, 255, 0.45)",
                  }}
                  strokeWidth={isActive ? 2.2 : 1.75}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ml-1 shrink-0 font-medium",
                    isActive
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40"
                      : "bg-white/[0.06] text-slate-400"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom Operational Telemetry ── */}
      <div
        className="p-3 space-y-2"
        style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
      >
        {/* Calling Window Status */}
        <div
          className="px-3 py-2 rounded-xl text-[11px] flex items-center gap-2.5"
          style={{
            background: isCallingWindowOpen ? "rgba(16, 185, 129, 0.06)" : "rgba(245, 158, 11, 0.06)",
            border: isCallingWindowOpen ? "1px solid rgba(16, 185, 129, 0.18)" : "1px solid rgba(245, 158, 11, 0.18)",
          }}
        >
          <Clock
            className={cn("w-3.5 h-3.5 shrink-0", isCallingWindowOpen ? "text-emerald-400" : "text-amber-400")}
          />
          <div className="min-w-0 flex-1 leading-tight">
            <span
              className={cn(
                "font-semibold block text-[11px]",
                isCallingWindowOpen ? "text-emerald-300" : "text-amber-300"
              )}
            >
              {isCallingWindowOpen ? "Calling Window Active" : "Outside Calling Hours"}
            </span>
            <span className="text-[9.5px] text-slate-400 block font-mono">
              9:00 AM – 10:00 PM IST
            </span>
          </div>
        </div>

        {/* System Diagnostics Trigger */}
        <button
          onClick={() => handleSelect("settings")}
          className={cn(
            "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[11.5px] font-medium transition-colors",
            activeTab === "settings"
              ? "text-white bg-white/10 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
          )}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Diagnostics</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">v1.1.0</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0"
            style={{ background: "rgba(7, 11, 18, 0.8)" }}
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
