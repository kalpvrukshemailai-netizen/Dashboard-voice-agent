"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Play,
  ArrowRight,
  ExternalLink,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Radio,
  Clock,
  ShieldAlert,
  Flame,
  RotateCcw,
  Building2,
} from "lucide-react";
import { Sidebar, NavTab } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { KpiCards } from "@/components/dashboard/kpi-card";
import { QueueSummaryCard } from "@/components/dashboard/queue-summary-card";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadFilters, FilterState } from "@/components/leads/lead-filters";
import { LeadDetailDrawer } from "@/components/leads/lead-detail-drawer";
import { CallModal } from "@/components/calls/call-modal";
import { CampaignView } from "@/components/campaigns/campaign-view";
import { CallsTable } from "@/components/calls-view/calls-table";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { SystemHealthView } from "@/components/settings/system-health-view";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useToast } from "@/components/ui/toast";
import type { EnquiryRecord, CallOutcomeRecord } from "@/lib/hsk-sheets-schema";
import { Lead, FALLBACK_DEMO_LEADS } from "@/lib/google-sheets";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { toast } = useToast();

  // Navigation & Drawer States
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings / Environment State
  const [spreadsheetId, setSpreadsheetId] = useState("1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8");
  const [agencyName, setAgencyName] = useState("HSK Builder Group");
  const [isExplicitDemo, setIsExplicitDemo] = useState(false);

  // Data States
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [outcomes, setOutcomes] = useState<CallOutcomeRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Status & Health
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTriggeringWorker, setIsTriggeringWorker] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "error" | "mock">("connected");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Calling Hours & Dialer Lock
  const [isCallingWindowOpen, setIsCallingWindowOpen] = useState(true);
  const [nextWindowOpensAt, setNextWindowOpensAt] = useState<string | null>(null);
  const [dialerLock, setDialerLock] = useState<{
    locked: boolean;
    session_id?: string | null;
    enquiry_id?: string | null;
    locked_at?: string | null;
  }>({ locked: false });

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "All",
    interest: "All",
    intent: "All",
    timeline: "All",
  });

  // Fetch all live dashboard data
  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setErrorState(null);

    try {
      // 0. Auto-sync any completed ElevenLabs calls into Google Sheets
      await fetch("/api/calls/sync", { method: "POST" }).catch(() => null);

      // 1. Fetch Enquiries
      const enqPromise = fetch(isExplicitDemo ? "/api/leads?demo=true" : "/api/enquiries", {
        method: "GET",
        cache: "no-store",
      });

      // 2. Fetch Call Outcomes
      const callsPromise = fetch("/api/calls", {
        method: "GET",
        cache: "no-store",
      });

      // 3. Fetch System State
      const statePromise = fetch("/api/system/state", {
        method: "GET",
        cache: "no-store",
      });

      const [enqRes, callsRes, stateRes] = await Promise.allSettled([
        enqPromise,
        callsPromise,
        statePromise,
      ]);

      // Process Enquiries Response
      if (enqRes.status === "fulfilled" && enqRes.value.ok) {
        const enqData = await enqRes.value.json();
        if (enqData.success && Array.isArray(enqData.enquiries)) {
          setEnquiries(enqData.enquiries);
          setLeads(mapEnquiriesToLeads(enqData.enquiries));
          setConnectionStatus("connected");
          setConnectionError(null);
        } else if (enqData.success && Array.isArray(enqData.leads)) {
          // Fallback demo endpoint response
          setLeads(enqData.leads);
          setConnectionStatus(enqData.isDemo ? "mock" : "connected");
        } else {
          handleEnquiryError(enqData.error || "Failed to load enquiries");
        }
      } else {
        const statusText = enqRes.status === "fulfilled" ? `HTTP ${enqRes.value.status}` : "Network Error";
        handleEnquiryError(`Unable to reach Google Apps Script Web App (${statusText})`);
      }

      // Process Calls Response
      if (callsRes.status === "fulfilled" && callsRes.value.ok) {
        const callData = await callsRes.value.json();
        if (callData.success && Array.isArray(callData.outcomes)) {
          setOutcomes(callData.outcomes);
        }
      }

      // Process State Response
      if (stateRes.status === "fulfilled" && stateRes.value.ok) {
        const stateData = await stateRes.value.json();
        if (stateData.success) {
          setIsCallingWindowOpen(Boolean(stateData.calling_window_open));
          setNextWindowOpensAt(stateData.next_calling_window_opens_at || null);
          if (stateData.system_state?.DIALER_LOCK) {
            setDialerLock(stateData.system_state.DIALER_LOCK);
          }
        }
      }

      setLastRefreshedAt(new Date());
    } catch (err) {
      handleEnquiryError(err instanceof Error ? err.message : "Error connecting to backend");
    } finally {
      setIsLoading(false);
      if (!silent) setIsRefreshing(false);
    }
  }, [isExplicitDemo]);

  function setErrorState(err: string | null) {
    setConnectionError(err);
  }

  function handleEnquiryError(msg: string) {
    setConnectionStatus("error");
    setConnectionError(msg);
    setEnquiries([]);
    setLeads([]);
  }

  function mapEnquiriesToLeads(enqs: EnquiryRecord[]): Lead[] {
    return enqs.map((enq, idx) => ({
      row: idx + 2,
      name: enq.customer_name,
      phone: enq.phone_number,
      company: "HSK Prospect",
      notes: enq.customer_notes || "",
      callStatus: enq.current_status === "CALLING" ? "Calling" : enq.current_status === "QUALIFIED" ? "Completed" : "Pending",
      interested: enq.qualification_status === "QUALIFIED" ? true : enq.qualification_status === "NOT_INTERESTED" ? false : null,
      interestStatus: enq.qualification_status || null,
      propertyInterest: enq.project_interest || "HSK Builder Group",
      budgetRange: null,
      preferredLocation: null,
      timeline: null,
      nextStepType: enq.current_status === "QUALIFIED" ? "Schedule Site Visit" : null,
      interestReason: enq.error_details || null,
      conversationId: enq.active_session_id || enq.latest_outcome_id || null,
      calledAt: enq.last_call_at || null,
      enquiryId: enq.enquiry_id,
      queueClass: enq.queue_class,
      attemptSequenceCount: enq.attempt_sequence_count,
      customerNoAnswerCount: enq.customer_no_answer_count,
      nextRetryAt: enq.next_retry_at,
      latestOutcomeId: enq.latest_outcome_id,
      latestDisposition: enq.latest_disposition,
    }));
  }

  // Initial load and periodic 15-second live sync
  useEffect(() => {
    loadDashboardData(true);
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Safe Synthetic Test Enquiry Submission (Pipeline Verification)
  const handleCreateSyntheticEnquiry = async () => {
    try {
      toast("Submitting synthetic test enquiry...", "info");
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "Vikram Patel",
          phone_number: "+919876543210",
          project_interest: "HSK Solitaire 3 BHK",
          source: "Dashboard Verification Test",
          utm_campaign: "pipeline_test",
          customer_notes: "Synthetic test enquiry to verify HSK Google Sheets intake pipeline.",
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast(`Enquiry ${json.enquiry_id} created successfully! Added to ${json.queue_class} queue.`, "success");
        loadDashboardData(false);
      } else {
        toast(json.error || "Failed to create synthetic enquiry", "error");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Intake request failed", "error");
    }
  };

  // Safe Operator Trigger: Queue Worker Tick
  const handleTriggerWorker = async () => {
    setIsTriggeringWorker(true);
    try {
      const res = await fetch("/api/scheduler/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        if (json.action === "SKIPPED") {
          toast(`Worker skipped: ${json.reason} (Calling hours: 9 AM - 10 PM IST)`, "info");
        } else if (json.action === "CLAIMED") {
          toast(`Worker claimed ${json.enquiry_id} for dialer processing.`, "success");
        } else {
          toast(json.message || "Queue tick evaluated successfully.", "info");
        }
        loadDashboardData(true);
      } else {
        toast(json.error || "Worker authorization rejected", "error");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Worker tick failed", "error");
    } finally {
      setIsTriggeringWorker(false);
    }
  };

  // Selection
  const handleSelectLead = (item: any) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  // Filtering for Enquiries tab
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enq) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesName = enq.customer_name.toLowerCase().includes(q);
        const matchesPhone = enq.phone_number.toLowerCase().includes(q);
        const matchesId = enq.enquiry_id.toLowerCase().includes(q);
        const matchesProject = (enq.project_interest || "").toLowerCase().includes(q);
        const matchesNotes = (enq.customer_notes || "").toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId && !matchesProject && !matchesNotes) {
          return false;
        }
      }

      if (filters.status !== "All") {
        if (enq.current_status.toLowerCase() !== filters.status.toLowerCase()) {
          return false;
        }
      }

      if (filters.interest !== "All") {
        const qStat = (enq.qualification_status || "").toUpperCase();
        if (filters.interest === "QUALIFIED" && !qStat.includes("QUALIFIED") && !qStat.includes("INTERESTED")) return false;
        if (filters.interest === "NOT_INTERESTED" && !qStat.includes("NOT_INTERESTED")) return false;
      }

      return true;
    });
  }, [enquiries, filters]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.notes.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [leads, filters]);

  return (
    <div
      className="flex h-screen overflow-hidden w-full select-none"
      style={{
        background: "#F8FAFC",
        color: "#0F172A",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Left Sidebar Navigation ── */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        leadCount={enquiries.length > 0 ? enquiries.length : leads.length}
        outcomesCount={outcomes.length}
        agencyName={agencyName}
        isCallingWindowOpen={isCallingWindowOpen}
        connectionStatus={connectionStatus}
      />

      {/* ── Main Workspace Content ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 w-full">
        {/* Top Header Bar */}
        <Topbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onRefresh={() => loadDashboardData(false)}
          isRefreshing={isRefreshing}
          onOpenSettings={() => setActiveTab("settings")}
          searchQuery={filters.search}
          onSearchChange={(q) => setFilters((prev) => ({ ...prev, search: q }))}
          isDemoMode={isExplicitDemo}
          connectionStatus={connectionStatus}
          lastRefreshedAt={lastRefreshedAt}
          isCallingWindowOpen={isCallingWindowOpen}
        />

        {/* Dynamic Route Body */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-[1440px] mx-auto space-y-6 min-w-0"
          style={{ padding: "24px 28px" }}
        >
          {/* ── CONNECTION ERROR / INTEGRATION ACTION BANNER ── */}
          {connectionStatus === "error" && (
            <div className="rounded-2xl p-5 border border-amber-300 bg-amber-50/70 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-950 text-sm tracking-wide">
                      Dedicated Apps Script Web App Deployment Required
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 text-[10px] font-bold font-mono">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    The spreadsheet <code className="font-mono font-bold">{spreadsheetId}</code> was verified live, but the Google Apps Script Web App is either unlinked or using the legacy single-sheet prototype.
                  </p>
                  <p className="text-[11.5px] text-amber-800 mt-1 font-mono">
                    Diagnostic: {connectionError}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
                <button
                  onClick={() => setActiveTab("settings")}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-2xs"
                >
                  View Deployment Guide
                </button>
                <button
                  onClick={() => {
                    setIsExplicitDemo(!isExplicitDemo);
                    loadDashboardData(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs transition-colors"
                >
                  {isExplicitDemo ? "Exit Demo Preview" : "Explore Demo Preview"}
                </button>
              </div>
            </div>
          )}

          {/* ── EXPLICIT DEMO PREVIEW BANNER ── */}
          {isExplicitDemo && (
            <div className="rounded-xl px-4 py-2.5 bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>PREVIEW MODE ACTIVE:</strong> Showing demonstration prospect samples for visual verification. Live customer calls are not initiated.
                </span>
              </div>
              <button
                onClick={() => {
                  setIsExplicitDemo(false);
                  loadDashboardData(false);
                }}
                className="font-bold underline text-blue-700 hover:text-blue-900 shrink-0"
              >
                Switch to Live Sheet
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: OVERVIEW (Command Center)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6 min-w-0 w-full">
              {/* Header Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    HSK Command Center
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Live operational metrics, active queue states, and AI voice qualification funnel.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    onClick={handleCreateSyntheticEnquiry}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Test Synthetic Intake</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("leads")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs"
                  >
                    <span>Manage Enquiries</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 12-Metric Comprehensive KPI Suite */}
              <KpiCards
                enquiries={enquiries}
                outcomes={outcomes}
                leads={leads}
                isLoading={isLoading}
                isUnavailable={connectionStatus === "error" && !isExplicitDemo}
              />

              {/* Queue Summary & Dialer Concurrency Card */}
              <QueueSummaryCard
                enquiries={enquiries}
                isCallingWindowOpen={isCallingWindowOpen}
                nextWindowOpensAt={nextWindowOpensAt}
                dialerLock={dialerLock}
                onTriggerWorker={handleTriggerWorker}
                isTriggering={isTriggeringWorker}
              />

              {/* 2-Column Grid: Recent Enquiries & Recent Outcomes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                {/* Left: Recent Enquiries */}
                <div className="min-w-0">
                  <LeadTable
                    enquiries={enquiries.slice(0, 5)}
                    leads={leads.slice(0, 5)}
                    selectedLead={selectedItem}
                    onSelectLead={handleSelectLead}
                    compact={true}
                    onViewAll={() => setActiveTab("leads")}
                    isDemo={isExplicitDemo}
                    onCreateTestEnquiry={handleCreateSyntheticEnquiry}
                  />
                </div>

                {/* Right: Recent Call Outcomes */}
                <div className="min-w-0">
                  <CallsTable
                    outcomes={outcomes.slice(0, 5)}
                    enquiries={enquiries}
                    leads={leads.slice(0, 5)}
                    onSelectLead={handleSelectLead}
                    isDemo={isExplicitDemo}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: ENQUIRIES (Lead Management)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "leads" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1
                    className="text-2xl font-extrabold text-slate-900 tracking-tight"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    Enquiry Management
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Immutable prospect submissions, attempt counters, and AI qualification details.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateSyntheticEnquiry}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>New Test Intake</span>
                  </button>
                </div>
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
                totalCount={enquiries.length > 0 ? enquiries.length : leads.length}
                filteredCount={enquiries.length > 0 ? filteredEnquiries.length : filteredLeads.length}
              />

              {/* Full Enquiries Table */}
              <LeadTable
                enquiries={filteredEnquiries}
                leads={filteredLeads}
                selectedLead={selectedItem}
                onSelectLead={handleSelectLead}
                loading={isLoading}
                compact={false}
                isDemo={isExplicitDemo}
                onCreateTestEnquiry={handleCreateSyntheticEnquiry}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: CALL OUTCOMES (Call History)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "calls" && (
            <CallsTable
              outcomes={outcomes}
              enquiries={enquiries}
              leads={leads}
              onSelectLead={handleSelectLead}
              isDemo={isExplicitDemo}
            />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: QUEUE OPERATIONS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "queue" && (
            <div className="space-y-6">
              <div>
                <h1
                  className="text-2xl font-extrabold text-slate-900 tracking-tight"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Queue & Dialer Operations
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enforces business rules: 9 AM–10 PM IST calling hours, fresh enquiry priority, and concurrency locks.
                </p>
              </div>

              <QueueSummaryCard
                enquiries={enquiries}
                isCallingWindowOpen={isCallingWindowOpen}
                nextWindowOpensAt={nextWindowOpensAt}
                dialerLock={dialerLock}
                onTriggerWorker={handleTriggerWorker}
                isTriggering={isTriggeringWorker}
              />

              {/* Queue Priority Rules Specification Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-teal-800 font-bold uppercase tracking-wider text-[11px]">
                    <Flame className="w-4 h-4 text-emerald-600" />
                    <span>Priority 1 — Newest Fresh Intake</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    Enquiries submitted via the website during calling hours (9 AM – 10 PM IST) are targeted for an outbound call within 2 minutes. The most recently received fresh enquiry (<code className="font-mono text-slate-700">created_at DESC</code>) is dialed ahead of waiting retries.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-blue-800 font-bold uppercase tracking-wider text-[11px]">
                    <RotateCcw className="w-4 h-4 text-blue-600" />
                    <span>Priority 2 — 2-Minute Retries</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    Unanswered or busy calls schedule an automated retry exactly 2 minutes later. A maximum of 3 customer attempts are permitted total. After 3 customer no-answers, the enquiry is marked <code className="font-mono text-slate-700">NOT_ANSWERED</code>.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 font-bold uppercase tracking-wider text-[11px]">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Priority 3 — Overnight Backlog</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    Enquiries arriving between 10:00 PM and 9:00 AM IST are tagged <code className="font-mono text-slate-700">BACKLOG</code>. When calling hours open at 9:00 AM IST, backlog enquiries are processed in chronological order (<code className="font-mono text-slate-700">created_at ASC</code>) whenever the agent is free.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold uppercase tracking-wider text-[11px]">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>DND & Technical Safety</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    If a prospect requests Do-Not-Call (DND), the enquiry is immediately marked <code className="font-mono text-slate-700">DO_NOT_CALL</code> and all automated calls cease forever. Carrier/telephony errors are isolated in a separate technical counter and never auto-retried blindly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: PROJECT PORTFOLIOS (Campaigns)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "campaigns" && (
            <CampaignView
              enquiries={enquiries}
              leads={leads}
              onSelectLead={handleSelectLead}
            />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: ANALYTICS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "analytics" && (
            <AnalyticsView leads={leads} />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 7: SYSTEM HEALTH & INTEGRATIONS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <SystemHealthView />
          )}
        </main>
      </div>

      {/* Slide-Over Enquiry Detail Drawer */}
      <LeadDetailDrawer
        enquiry={selectedItem && selectedItem.enquiry_id ? selectedItem : null}
        lead={selectedItem && !selectedItem.enquiry_id ? selectedItem : null}
        outcome={outcomes.find((o) => o.enquiry_id === (selectedItem?.enquiry_id || selectedItem?.enquiryId))}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Settings Modal (Secondary config) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sheetUrl={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
        onSheetUrlChange={() => {}}
        tab="Enquiries"
        onTabChange={() => {}}
        agencyName={agencyName}
        onAgencyNameChange={setAgencyName}
        onTestConnection={() => loadDashboardData(false)}
        isTesting={isRefreshing}
        connectionStatus={connectionStatus === "connected" ? "connected" : connectionStatus === "error" ? "error" : "idle"}
        connectionError={connectionError || ""}
      />
    </div>
  );
}
