"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  Globe,
  Radio,
  Phone,
  Webhook,
  Clock,
  Lock,
  Unlock,
  ExternalLink,
  Copy,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemHealthData {
  timestamp: string;
  calling_hours: {
    open: boolean;
    window: string;
    next_opens_at: string | null;
    timezone: string;
  };
  integrations: {
    google_spreadsheet: {
      status: string;
      spreadsheet_id: string;
      message: string;
      tabs: string[];
    };
    apps_script_web_app: {
      status: string;
      configured: boolean;
      has_shared_secret: boolean;
      message: string;
    };
    website_enquiry_intake: {
      status: string;
      endpoint: string;
      features: string[];
    };
    elevenlabs_agent: {
      status: string;
      agent_id: string;
      has_api_key: boolean;
      message: string;
    };
    exotel_telephony: {
      status: string;
      has_phone_number_id: boolean;
      message: string;
    };
    webhook_handler: {
      status: string;
      endpoint: string;
      signature_verification: string;
      has_signing_secret: boolean;
    };
    scheduler_worker: {
      status: string;
      endpoint: string;
      is_local_only: boolean;
      warning: string | null;
    };
    dialer_lock: {
      status: string;
      session_id: string | null;
      enquiry_id: string | null;
      locked_at: string | null;
    };
  };
}

export function SystemHealthView() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/health");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || "Health check failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to probe system diagnostics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Connected":
      case "Configured":
      case "Protected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {status}
          </span>
        );
      case "Partially Configured":
      case "Pending Secret":
      case "Pending Deployment":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {status}
          </span>
        );
      case "Legacy / Incompatible":
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0 w-full text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            System Diagnostics & Integration Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status of persistent storage, voice agent, telephony, and webhook infrastructure.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors self-start sm:self-center shadow-xs"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          <span>Run Diagnostic Check</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Diagnostic Probe Failed</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ── Diagnostic Cards ── */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Google Spreadsheet */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-[13px]">Google Spreadsheet</h3>
              </div>
              {getStatusBadge(data.integrations.google_spreadsheet.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Spreadsheet ID:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {data.integrations.google_spreadsheet.spreadsheet_id.slice(0, 10)}...
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Verified Tabs:</span>
                <span className="font-medium text-slate-800">
                  {data.integrations.google_spreadsheet.tabs.join(", ")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {data.integrations.google_spreadsheet.message}
              </p>
            </div>
          </div>

          {/* 2. Apps Script Web App */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-[13px]">Google Apps Script Web App</h3>
              </div>
              {getStatusBadge(data.integrations.apps_script_web_app.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Shared Secret Auth:</span>
                <span className="font-semibold text-slate-800">
                  {data.integrations.apps_script_web_app.has_shared_secret ? "Configured (Protected)" : "Missing in .env.local"}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                {data.integrations.apps_script_web_app.message}
              </p>
            </div>
          </div>

          {/* 3. Website Intake API */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-[13px]">Website Enquiry Intake</h3>
              </div>
              {getStatusBadge(data.integrations.website_enquiry_intake.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Endpoint:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {data.integrations.website_enquiry_intake.endpoint}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {data.integrations.website_enquiry_intake.features.map((f, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10.5px] text-slate-700 font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. ElevenLabs Voice Agent */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-700" />
                <h3 className="font-bold text-slate-900 text-[13px]">ElevenLabs Voice Agent</h3>
              </div>
              {getStatusBadge(data.integrations.elevenlabs_agent.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Agent ID:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {data.integrations.elevenlabs_agent.agent_id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">API Key Configured:</span>
                <span className="font-semibold text-slate-800">
                  {data.integrations.elevenlabs_agent.has_api_key ? "Yes (Protected)" : "Missing from .env.local"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {data.integrations.elevenlabs_agent.message}
              </p>
            </div>
          </div>

          {/* 5. Exotel Telephony */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-[13px]">Exotel Outbound Telephony</h3>
              </div>
              {getStatusBadge(data.integrations.exotel_telephony.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phone Number ID:</span>
                <span className="font-semibold text-slate-800">
                  {data.integrations.exotel_telephony.has_phone_number_id ? "Configured" : "Missing from .env.local"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {data.integrations.exotel_telephony.message}
              </p>
            </div>
          </div>

          {/* 6. Webhook Signature Verification */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-slate-900 text-[13px]">ElevenLabs Webhook Verifier</h3>
              </div>
              {getStatusBadge(data.integrations.webhook_handler.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Endpoint:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {data.integrations.webhook_handler.endpoint}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Verification Scheme:</span>
                <span className="font-semibold text-slate-800">
                  {data.integrations.webhook_handler.signature_verification}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Signing Secret:</span>
                <span className="font-semibold text-slate-800">
                  {data.integrations.webhook_handler.has_signing_secret ? "Configured (Protected)" : "Missing from .env.local"}
                </span>
              </div>
            </div>
          </div>

          {/* 7. Scheduler Worker */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-[13px]">Scheduler Worker & Concurrency Lock</h3>
              </div>
              <div className="flex items-center gap-2">
                {data.integrations.dialer_lock.status === "LOCKED" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Lock className="w-3 h-3 text-amber-600" /> In-Flight Call Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <Unlock className="w-3 h-3 text-emerald-600" /> Dialer Idle
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Calling Window:</span>
                <span className="font-semibold text-slate-800">
                  {data.calling_hours.window} ({data.calling_hours.open ? "Currently OPEN" : "Currently CLOSED"})
                </span>
              </div>
              {data.integrations.scheduler_worker.warning && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 mt-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] leading-relaxed">
                    {data.integrations.scheduler_worker.warning}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Deployment Checklist Guide ── */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2 text-teal-400">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Dedicated Google Apps Script Deployment Checklist
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Follow these specific steps to link the dedicated HSK Google Spreadsheet to Google Apps Script and Next.js:
        </p>

        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 font-mono">
          <li className="leading-relaxed">
            Open the new spreadsheet: <a href="https://docs.google.com/spreadsheets/d/1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8/edit?usp=sharing" target="_blank" rel="noreferrer" className="text-teal-400 underline inline-flex items-center gap-1">1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8 <ExternalLink className="w-3 h-3" /></a>
          </li>
          <li className="leading-relaxed">
            Navigate to <strong>Extensions &gt; Apps Script</strong>.
          </li>
          <li className="leading-relaxed">
            Replace the contents of <code className="text-teal-300">Code.gs</code> with <code className="text-teal-300">apps_script/Code.js</code> from this repository.
          </li>
          <li className="leading-relaxed">
            In <strong>Project Settings (gear icon) &gt; Script Properties</strong>, set:
            <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-slate-400">
              <li><code className="text-slate-200">GOOGLE_SPREADSHEET_ID</code> = <code className="text-slate-200">1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8</code></li>
              <li><code className="text-slate-200">HSK_SHARED_SECRET</code> = (matches HSK_APPS_SCRIPT_SHARED_SECRET in .env.local)</li>
              <li><code className="text-slate-200">CRON_SECRET</code> = (matches CRON_SECRET in .env.local)</li>
              <li><code className="text-slate-200">NEXTJS_WORKER_URL</code> = (leave empty until dashboard is publicly deployed; do NOT use localhost)</li>
            </ul>
          </li>
          <li className="leading-relaxed">
            Click <strong>Deploy &gt; New deployment</strong> &gt; Type: <strong>Web app</strong> &gt; Execute as: <strong>Me</strong> &gt; Access: <strong>Anyone</strong>.
          </li>
          <li className="leading-relaxed">
            Paste the resulting Web App URL into <code className="text-teal-300">GOOGLE_APPS_SCRIPT_URL</code> in <code className="text-teal-300">.env.local</code>.
          </li>
        </ol>
      </div>
    </div>
  );
}
