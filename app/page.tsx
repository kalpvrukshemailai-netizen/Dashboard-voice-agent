"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  RefreshCw,
  Play,
  ArrowRight,
  ExternalLink,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Sidebar, NavTab } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { KpiCards } from "@/components/dashboard/kpi-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadFilters, FilterState } from "@/components/leads/lead-filters";
import { LeadDetailDrawer } from "@/components/leads/lead-detail-drawer";
import { CallModal } from "@/components/calls/call-modal";
import { CampaignView } from "@/components/campaigns/campaign-view";
import { CallsTable } from "@/components/calls-view/calls-table";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useToast } from "@/components/ui/toast";
import {
  Lead,
  FALLBACK_DEMO_LEADS,
  extractSheetId,
} from "@/lib/google-sheets";

export default function DashboardPage() {
  const { toast } = useToast();

  // Navigation & Modal States
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings / Connection State
  const [sheetUrl, setSheetUrl] = useState("");
  const [tab, setTab] = useState("Sheet1");
  const [agencyName, setAgencyName] = useState("HSK Builder Group");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connected" | "error">("idle");
  const [connectionError, setConnectionError] = useState("");

  // Data States
  const [leads, setLeads] = useState<Lead[]>(FALLBACK_DEMO_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(FALLBACK_DEMO_LEADS[0] || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "All",
    interest: "All",
    intent: "All",
    timeline: "All",
  });

  // Load saved settings from localStorage if available
  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem("ai_caller_sheet_url");
      const savedTab = localStorage.getItem("ai_caller_sheet_tab");
      const savedAgency = localStorage.getItem("ai_caller_agency");
      if (savedUrl) setSheetUrl(savedUrl);
      if (savedTab) setTab(savedTab);
      if (savedAgency) setAgencyName(savedAgency);

      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as NavTab;
      if (tabParam && ["overview", "leads", "campaigns", "calls", "analytics", "settings"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const spreadsheetId = useMemo(() => extractSheetId(sheetUrl), [sheetUrl]);

  // Fetch leads from backend
  const fetchLeads = useCallback(
    async (targetSpreadsheetId?: string, silent = false): Promise<Lead[] | undefined> => {
      const idToUse = targetSpreadsheetId ?? spreadsheetId;
      if (!silent) setIsRefreshing(true);

      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spreadsheetId: idToUse,
            tab,
          }),
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.leads)) {
          setLeads(data.leads);
          setIsDemoMode(Boolean(data.isDemo));
          setConnectionWarning(data.warning || null);

          // Functional updater to avoid dependency loop on selectedLead
          setSelectedLead((currentSelected) => {
            if (currentSelected) {
              const updated = data.leads.find((l: Lead) => l.row === currentSelected.row);
              return updated || currentSelected;
            }
            return data.leads[0] || null;
          });

          if (!silent) {
            if (data.isDemo) {
              toast("Showing demo real-estate prospects. Connect a Google Sheet to sync live.", "info");
            } else {
              toast(`Synced ${data.leads.length} leads from Google Sheet.`, "success");
            }
          }
          return data.leads as Lead[];
        } else {
          throw new Error(data.error || "Failed to load leads");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error connecting to Google Sheets";
        setConnectionWarning(msg);
        if (!silent) {
          toast(msg, "error");
        }
        return undefined;
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [spreadsheetId, tab, toast],
  );

  // Initial fetch on mount or when sheet configuration changes
  useEffect(() => {
    fetchLeads(undefined, true);
  }, [spreadsheetId, tab]);


  // Handle Testing Sheet Connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus("idle");
    setConnectionError("");

    try {
      if (!spreadsheetId) {
        throw new Error("Please enter a valid Google Sheet URL or ID.");
      }

      const freshLeads = await fetchLeads(spreadsheetId, false);
      if (freshLeads && freshLeads.length > 0) {
        setConnectionStatus("connected");
        setIsDemoMode(false);
        try {
          localStorage.setItem("ai_caller_sheet_url", sheetUrl);
          localStorage.setItem("ai_caller_sheet_tab", tab);
          localStorage.setItem("ai_caller_agency", agencyName);
        } catch {
          // Ignore storage error
        }
      } else {
        throw new Error("Connected but no valid lead rows found with name and phone.");
      }
    } catch (err) {
      setConnectionStatus("error");
      const msg = err instanceof Error ? err.message : "Failed to connect to Google Sheet";
      setConnectionError(msg);
      toast(msg, "error");
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Lead selection & call triggers
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleCallLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(false);
    setIsCallModalOpen(true);
  };

  const notifiedConversationsRef = useRef<Set<string>>(new Set());

  const handleLeadUpdatedFromCall = useCallback(
    (updated: Lead) => {
      // Deduplicate using conversationId or timestamp + row (Rule 2)
      const dedupeKey = updated.conversationId
        ? `conv_${updated.conversationId}`
        : `row_${updated.row}_${updated.calledAt || "completed"}`;

      if (notifiedConversationsRef.current.has(dedupeKey)) {
        return;
      }
      notifiedConversationsRef.current.add(dedupeKey);

      setLeads((prev) => prev.map((l) => (l.row === updated.row ? updated : l)));
      setSelectedLead((prev) => (prev?.row === updated.row ? updated : prev));
      toast(`Qualification results received for ${updated.name}`, "success");
    },
    [toast],
  );

  const refreshLeadsSilent = useCallback(() => {
    return fetchLeads(undefined, true);
  }, [fetchLeads]);

  // Filtering leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesPhone = lead.phone.toLowerCase().includes(q);
        const matchesCompany = lead.company.toLowerCase().includes(q);
        const matchesLocation = (lead.preferredLocation || "").toLowerCase().includes(q);
        const matchesNotes = lead.notes.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCompany && !matchesLocation && !matchesNotes) {
          return false;
        }
      }

      // Status
      if (filters.status !== "All") {
        if (lead.callStatus.toLowerCase() !== filters.status.toLowerCase()) {
          return false;
        }
      }

      // Interest
      if (filters.interest !== "All") {
        const leadInt = (lead.interestStatus || "").toUpperCase();
        const filterInt = filters.interest.toUpperCase();
        if (filterInt === "UNKNOWN") {
          if (lead.interestStatus) return false;
        } else if (!leadInt.includes(filterInt)) {
          return false;
        }
      }

      // Intent
      if (filters.intent !== "All") {
        const intent = (lead.propertyInterest || "").toUpperCase();
        if (!intent.includes(filters.intent.toUpperCase())) {
          return false;
        }
      }

      // Timeline
      if (filters.timeline !== "All") {
        const tl = (lead.timeline || "").toUpperCase();
        if (!tl.includes(filters.timeline.toUpperCase())) {
          return false;
        }
      }

      return true;
    });
  }, [leads, filters]);

  return (
    <div
      className="flex h-screen overflow-hidden w-full"
      style={{ background: "var(--app-background)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        leadCount={leads.length}
        agencyName={agencyName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 w-full">
        {/* Top Header Bar */}
        <Topbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onRefresh={() => fetchLeads()}
          isRefreshing={isRefreshing}
          onOpenSettings={() => setIsSettingsOpen(true)}
          searchQuery={filters.search}
          onSearchChange={(q) => setFilters((prev) => ({ ...prev, search: q }))}
          isDemoMode={isDemoMode}
        />

        {/* Dynamic Route Body */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-[1400px] mx-auto space-y-6 min-w-0"
          style={{ padding: "28px var(--content-px, 32px)" }}
        >
          {/* Global Demo Mode Warning Banner across all views */}
          {isDemoMode && (
            <div
              className="rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0 w-full shadow-xs"
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.28)",
              }}
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0"
                  style={{ background: "rgba(245, 158, 11, 0.18)", color: "#B45309" }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-extrabold text-amber-950 text-xs tracking-wide">
                      DEMO MODE ACTIVE — DEMONSTRATION DATASET
                    </span>
                    <span className="text-amber-400 hidden sm:inline">•</span>
                    <span className="text-[12px] text-amber-900 font-medium">
                      Showing sample HSK Builder Group prospects. Live customer enquiries and call outcomes are NOT fabricated.
                    </span>
                  </div>
                  {connectionWarning && (
                    <p className="text-[11.5px] text-amber-800 mt-1 font-mono break-all">
                      Integration Status: {connectionWarning} (Google Sheet Apps Script requires V1 Code.js update)
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="ds-btn ds-btn-secondary shrink-0 text-xs font-semibold self-start sm:self-center h-8 px-3"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Sheet Settings
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6 min-w-0 w-full">
              {/* Section A: Header Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0 w-full">
                <div className="min-w-0">
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                    style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}
                  >
                    Real Estate Lead Intelligence
                  </h1>
                  <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Your AI qualification workspace at a glance.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    onClick={() => fetchLeads()}
                    disabled={isRefreshing}
                    className="ds-btn ds-btn-secondary"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </button>

                  <button
                    onClick={() => setActiveTab("campaigns")}
                    className="ds-btn ds-btn-primary"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Campaign
                  </button>
                </div>
              </div>

              {/* Section B: Live Data Connection Status (Only when live) */}
              {!isDemoMode && (
                <div
                  className="rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0 w-full"
                  style={{
                    background: "rgba(15, 159, 143, 0.04)",
                    border: "1px solid rgba(15, 159, 143, 0.18)",
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(15, 159, 143, 0.12)", color: "#0F9F8F" }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-slate-800 text-xs">
                        Live Google Sheet Connected
                      </span>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-[12px] text-slate-500">
                        Synchronized with your real-estate spreadsheet ({tab}).
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="ds-btn ds-btn-secondary shrink-0 text-xs font-semibold self-start sm:self-center h-8 px-3"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Sheet Settings
                  </button>
                </div>
              )}

              {/* Section C: Dynamic KPI Cards */}
              <KpiCards leads={leads} />

              {/* Section D & E: Main Operational Area (Recent Leads + Call Activity) */}
              <div className="overview-grid">
                <div className="min-w-0 w-full">
                  <LeadTable
                    leads={leads.slice(0, 6)}
                    selectedLead={selectedLead}
                    onSelectLead={handleSelectLead}
                    onCallLead={handleCallLead}
                    loading={isLoading}
                    compact={true}
                    onViewAll={() => setActiveTab("leads")}
                    isDemo={isDemoMode}
                  />
                </div>

                <div className="min-w-0 w-full">
                  <RecentActivity
                    leads={leads}
                    onSelectLead={handleSelectLead}
                  />
                </div>
              </div>
            </div>
          )}

          {/* LEADS TAB */}
          {activeTab === "leads" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Leads
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage and qualify your real-estate prospects.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab("campaigns")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Campaign
                </button>
              </div>

              {/* Lead Filters Toolbar */}
              <LeadFilters
                filters={filters}
                onChange={setFilters}
                onClear={() =>
                  setFilters({
                    search: "",
                    status: "All",
                    interest: "All",
                    intent: "All",
                    timeline: "All",
                  })
                }
                totalCount={leads.length}
                filteredCount={filteredLeads.length}
              />

              {/* Full Leads Table */}
              <LeadTable
                leads={filteredLeads}
                selectedLead={selectedLead}
                onSelectLead={handleSelectLead}
                onCallLead={handleCallLead}
                loading={isLoading}
                isDemo={isDemoMode}
              />
            </div>
          )}

          {/* CAMPAIGNS TAB */}
          {activeTab === "campaigns" && (
            <CampaignView
              leads={leads}
              onCallLead={handleCallLead}
              onSelectLead={handleSelectLead}
            />
          )}

          {/* CALLS TAB */}
          {activeTab === "calls" && (
            <CallsTable
              leads={leads}
              onSelectLead={handleSelectLead}
              onCallLead={handleCallLead}
              isDemo={isDemoMode}
            />
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <AnalyticsView leads={leads} />
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="max-w-2xl bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Workspace Settings</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure Google Sheet source of truth and voice webhook parameters.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Google Sheet URL or Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Tab Name
                    </label>
                    <input
                      type="text"
                      value={tab}
                      onChange={(e) => setTab(e.target.value)}
                      placeholder="Sheet1"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Agency Name
                    </label>
                    <input
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="Beprompter"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                  >
                    {isTestingConnection ? "Testing Connection..." : "Test Sheet Connection"}
                  </button>

                  {connectionStatus === "connected" && (
                    <span className="text-emerald-700 font-semibold text-xs">
                      Connection Verified! Leads loaded.
                    </span>
                  )}
                  {connectionStatus === "error" && (
                    <span className="text-rose-600 font-medium text-xs">
                      {connectionError}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Slide-Over Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCallLead={handleCallLead}
      />

      {/* Large Premium Call Experience Modal */}
      <CallModal
        lead={selectedLead}
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        spreadsheetId={spreadsheetId}
        tab={tab}
        agencyName={agencyName}
        onLeadUpdated={handleLeadUpdatedFromCall}
        refreshLeads={refreshLeadsSilent}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sheetUrl={sheetUrl}
        onSheetUrlChange={setSheetUrl}
        tab={tab}
        onTabChange={setTab}
        agencyName={agencyName}
        onAgencyNameChange={setAgencyName}
        onTestConnection={handleTestConnection}
        isTesting={isTestingConnection}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
      />
    </div>
  );
}
