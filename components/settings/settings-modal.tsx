"use client";

import React, { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Link,
  Bot,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { extractSheetId } from "@/lib/google-sheets";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetUrl: string;
  onSheetUrlChange: (url: string) => void;
  tab: string;
  onTabChange: (tab: string) => void;
  agencyName: string;
  onAgencyNameChange: (agency: string) => void;
  onTestConnection: () => Promise<void>;
  isTesting: boolean;
  connectionStatus: "idle" | "connected" | "error";
  connectionError?: string;
}

const REQUIRED_COLUMNS =
  "lead_name | phone | company_name | lead_notes | call_status | interested | interest_status | property_interest | budget_range | preferred_location | timeline | next_step_type | interest_reason | conversation_id | called_at";

export function SettingsModal({
  isOpen,
  onClose,
  sheetUrl,
  onSheetUrlChange,
  tab,
  onTabChange,
  agencyName,
  onAgencyNameChange,
  onTestConnection,
  isTesting,
  connectionStatus,
  connectionError,
}: SettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_5101m3dfq488edv8aqf47w7ahvyk";
  const appsScriptUrl = "https://script.google.com/macros/s/AKfycbyWXYyqohLgoZEAoalxAwAJLHD3wGlI0bEqVzF6GtY9G3ZLycoC65UnSg79KXEmnJ80/exec";

  if (!isOpen) return null;

  const handleCopyColumns = () => {
    navigator.clipboard.writeText(REQUIRED_COLUMNS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentSheetId = extractSheetId(sheetUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Workspace & Integration Settings
              </h2>
              <p className="text-xs text-slate-500">
                Connect your Google Sheet and verify voice webhook routing.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Google Sheet Connection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Google Sheets Integration</h3>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Google Sheet URL or Spreadsheet ID
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => onSheetUrlChange(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
              {currentSheetId && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Extracted ID: <code className="text-slate-600 font-bold">{currentSheetId}</code>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Sheet Tab Name
                </label>
                <input
                  type="text"
                  value={tab}
                  onChange={(e) => onTabChange(e.target.value)}
                  placeholder="Sheet1"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Agency Name
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => onAgencyNameChange(e.target.value)}
                  placeholder="Beprompter"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Connection Test Action */}
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={onTestConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>Test Sheet Connection</>
                )}
              </button>

              {connectionStatus === "connected" && (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Connection Verified! Leads loaded.
                </span>
              )}

              {connectionStatus === "error" && (
                <span className="flex items-center gap-1.5 text-rose-600 font-medium text-xs truncate max-w-xs" title={connectionError}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {connectionError || "Connection failed. Check permissions."}
                </span>
              )}
            </div>
          </div>

          {/* ElevenLabs Configuration */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">ElevenLabs Voice Agent</h3>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Agent Identifier:</span>
                <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-800 font-bold">
                  {agentId}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Agent Persona:</span>
                <span className="font-semibold text-slate-800">Alex · Real Estate Lead Specialist</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Voice Integration:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Zero-Cost Browser Voice
                </span>
              </div>
            </div>
          </div>

          {/* Webhook Endpoint */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Post-Call Transcription Webhook</h3>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Apps Script Endpoint URL (configured in ElevenLabs)
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 break-all select-all">
                {appsScriptUrl}
              </div>
            </div>
          </div>

          {/* Required Sheet Schema Reference */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Google Sheet Header Columns</span>
              <button
                onClick={handleCopyColumns}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Columns"}
              </button>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 leading-relaxed overflow-x-auto">
              {REQUIRED_COLUMNS}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
