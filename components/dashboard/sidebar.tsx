"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  PhoneCall,
  BarChart3,
  Settings,
  AudioWaveform,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "overview" | "leads" | "campaigns" | "calls" | "analytics" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  leadCount: number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  leadCount,
}: SidebarProps) {
  const navItems = [
    { id: "overview" as NavTab, label: "Overview", icon: LayoutDashboard },
    { id: "leads" as NavTab, label: "Leads", icon: Users, badge: leadCount > 0 ? leadCount : undefined },
    { id: "campaigns" as NavTab, label: "Campaigns", icon: Megaphone },
    { id: "calls" as NavTab, label: "Calls", icon: PhoneCall },
    { id: "analytics" as NavTab, label: "Analytics", icon: BarChart3 },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const content = (
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: "var(--sidebar-width, 248px)",
        background: "var(--brand-navy)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3">
          {/* Brand icon mark */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--brand-blue)" }}
          >
            <AudioWaveform className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
          </div>
          {/* Brand text */}
          <div>
            <h1
              className="text-sm font-bold leading-tight tracking-tight text-white"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700 }}
            >
              AI Lead Caller
            </h1>
            <p className="text-[10.5px] font-medium leading-tight" style={{ color: "rgba(255,255,255,0.38)" }}>
              Real Estate Intelligence
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg md:hidden transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
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
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(56, 87, 232, 0.35)" }}
          >
            <Building2 className="w-3.5 h-3.5" style={{ color: "var(--brand-blue)" }} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <span
              className="block text-[9.5px] font-semibold tracking-wider uppercase"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              Workspace
            </span>
            <span
              className="block text-xs font-bold truncate text-white"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              BEPROMPTER
            </span>
          </div>
          {/* Online indicator */}
          <span
            className="w-1.5 h-1.5 rounded-full ml-auto shrink-0"
            title="Connected"
            style={{ background: "var(--ai-teal)" }}
          />
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div
          className="px-2 pb-2.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.28)", fontFamily: "'Inter', sans-serif" }}
        >
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
              style={{
                fontFamily: "'Inter', sans-serif",
                color: isActive ? "#fff" : "rgba(255,255,255,0.52)",
                background: isActive
                  ? "rgba(56, 87, 232, 0.22)"
                  : "transparent",
                borderLeft: isActive
                  ? "2px solid var(--brand-blue)"
                  : "2px solid transparent",
                transitionDuration: "150ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.82)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.52)";
                }
              }}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className="shrink-0"
                  style={{
                    width: 18,
                    height: 18,
                    color: isActive ? "var(--brand-blue)" : "rgba(255,255,255,0.38)",
                  }}
                  strokeWidth={1.75}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums"
                  style={{
                    background: isActive ? "var(--brand-blue)" : "rgba(255,255,255,0.12)",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom: Settings ── */}
      <div
        className="p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button
          onClick={() => handleSelect("settings")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: activeTab === "settings" ? "#fff" : "rgba(255,255,255,0.52)",
            background: activeTab === "settings" ? "rgba(56, 87, 232, 0.22)" : "transparent",
            borderLeft: activeTab === "settings" ? "2px solid var(--brand-blue)" : "2px solid transparent",
            transitionDuration: "150ms",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "settings") {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.82)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "settings") {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.52)";
            }
          }}
        >
          <Settings
            style={{
              width: 18,
              height: 18,
              color: activeTab === "settings" ? "var(--brand-blue)" : "rgba(255,255,255,0.38)",
            }}
            strokeWidth={1.75}
          />
          <span>Settings</span>
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
            style={{ background: "rgba(16, 27, 44, 0.6)" }}
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
