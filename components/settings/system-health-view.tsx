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
        setError(json.error || "Health probe failed");
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
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium"
            style={{ background: "#dcfae5", color: "#04250e" }}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {status}
          </span>
        );
      case "Partially Configured":
      case "Pending Secret":
      case "Pending Deployment":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium"
            style={{ background: "#fffbeb", color: "#92400e" }}
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {status}
          </span>
        );
      case "Legacy / Incompatible":
      case "Failed":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium"
            style={{ background: "#ffedea", color: "#831c1e" }}
          >
            <XCircle className="w-3 h-3 text-rose-600" />
            {status}
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium"
            style={{ background: "#f1f5f9", color: "#334155" }}
          >
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0 w-full text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/60">
        <div>
          <h1
            className="text-[21px] font-semibold tracking-tight text-slate-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            System Health & Diagnostic Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of Google Sheets storage, voice agents, telephony providers, and webhook queues.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors self-start sm:self-center shadow-2xs"
        >
          <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          <span>{isLoading ? "Probing..." : "Run Probe"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Diagnostic Probe Failed</span>
            <span className="text-xs text-rose-800">{error}</span>
          </div>
        </div>
      )}

      {/* ── Diagnostic Cards ── */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. Google Spreadsheet */}
          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-[13px]">Google Spreadsheet</h3>
              </div>
              {getStatusBadge(data.integrations.google_spreadsheet.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Spreadsheet ID:</span>
                <span className="font-mono text-slate-800">
                  {data.integrations.google_spreadsheet.spreadsheet_id.slice(0, 14)}...
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
          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-[13px]">Google Apps Script Web App</h3>
              </div>
              {getStatusBadge(data.integrations.apps_script_web_app.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Shared Secret Auth:</span>
                <span className="font-medium text-slate-800">
                  {data.integrations.apps_script_web_app.has_shared_secret ? "Protected" : "Missing in .env.local"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {data.integrations.apps_script_web_app.message}
              </p>
            </div>
          </div>

          {/* 3. Website Intake API */}
          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-[13px]">Website Intake Pipeline</h3>
              </div>
              {getStatusBadge(data.integrations.website_enquiry_intake.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Endpoint:</span>
                <span className="font-mono text-slate-800">
                  {data.integrations.website_enquiry_intake.endpoint}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {data.integrations.website_enquiry_intake.features.map((f, i) => (
                  <span key={i} className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-700 font-mono">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. ElevenLabs Voice Agent */}
          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-[13px]">ElevenLabs Voice Agent</h3>
              </div>
              {getStatusBadge(data.integrations.elevenlabs_agent.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Agent ID:</span>
                <span className="font-mono text-slate-800">
                  {data.integrations.elevenlabs_agent.agent_id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">API Key:</span>
                <span className="font-medium text-slate-800">
                  {data.integrations.elevenlabs_agent.has_api_key ? "Configured" : "Missing from .env.local"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {data.integrations.elevenlabs_agent.message}
              </p>
            </div>
          </div>

          {/* 5. Exotel Telephony */}
          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-[13px]">Exotel Outbound Telephony</h3>
              </div>
              {getStatusBadge(data.integrations.exotel_telephony.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Caller ID:</span>
                <span className="font-medium text-slate-800">
                  {data.integrations.exotel_telephony.has_phone_number_id ? "Configured" : "Missing"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {data.integrations.exotel_telephony.message}
              </p>
            </div>
          </div>

          {/* 6. Webhook Signature Verification */}
          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-[13px]">Webhook Security</h3>
              </div>
              {getStatusBadge(data.integrations.webhook_handler.status)}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">HMAC-SHA256:</span>
                <span className="font-medium text-slate-800">
                  {data.integrations.webhook_handler.signature_verification}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Signing Secret:</span>
                <span className="font-mono text-slate-800">
                  {data.integrations.webhook_handler.has_signing_secret ? "Verified" : "Optional"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
