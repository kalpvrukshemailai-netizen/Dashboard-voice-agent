"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  PhoneCall,
  PhoneOff,
  Sparkles,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Calendar,
  IndianRupee,
  Compass,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ElevenLabsCallWidget } from "./elevenlabs-call-widget";
import { Lead } from "@/lib/google-sheets";
import { StatusBadge, InterestBadge } from "@/components/ui/badges";

type ConversationLiveState =
  | "Connecting"
  | "Listening"
  | "Thinking"
  | "Speaking"
  | "Ending"
  | "Analyzing"
  | "Completed";

interface CallModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  tab: string;
  agencyName: string;
  onLeadUpdated: (lead: Lead) => void;
  refreshLeads: () => Promise<Lead[] | undefined>;
}

export function CallModal({
  lead,
  isOpen,
  onClose,
  spreadsheetId,
  tab,
  agencyName,
  onLeadUpdated,
  refreshLeads,
}: CallModalProps) {
  const [callState, setCallState] = useState<ConversationLiveState>("Connecting");
  const [duration, setDuration] = useState(0);
  const [analyzingSeconds, setAnalyzingSeconds] = useState(0);
  const [updatedLead, setUpdatedLead] = useState<Lead | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [isManualChecking, setIsManualChecking] = useState(false);

  // Safe timer and cycle tracking refs
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // Snapshot lead state prior to this specific call session (Rule 5)
  const preCallSnapshotRef = useRef<{
    callStatus: string;
    conversationId: string | null;
    calledAt: string | null;
    propertyInterest: string | null;
    budgetRange: string | null;
    interestStatus: string | null;
  } | null>(null);

  // Keep latest refs to avoid re-triggering polling effects when parent props update
  const leadRef = useRef(lead);
  leadRef.current = lead;
  const onLeadUpdatedRef = useRef(onLeadUpdated);
  onLeadUpdatedRef.current = onLeadUpdated;
  const refreshLeadsRef = useRef(refreshLeads);
  refreshLeadsRef.current = refreshLeads;

  // Cleanup helper to guarantee no orphan intervals
  const stopAllTimers = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Initialize or reset session when modal opens or active lead row changes (guarded by lead?.row)
  useEffect(() => {
    if (isOpen && lead) {
      // Clear any prior timers
      stopAllTimers();

      setCallState("Connecting");
      setDuration(0);
      setAnalyzingSeconds(0);
      setUpdatedLead(null);
      setPollTimedOut(false);
      pollCountRef.current = 0;
      hasCompletedRef.current = false;

      // Capture pre-call baseline for deduplication & verification
      preCallSnapshotRef.current = {
        callStatus: lead.callStatus,
        conversationId: lead.conversationId,
        calledAt: lead.calledAt,
        propertyInterest: lead.propertyInterest,
        budgetRange: lead.budgetRange,
        interestStatus: lead.interestStatus,
      };

      // Mark call started in backend
      fetch("/api/calls/mark-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_row: lead.row,
          sheetRow: lead.row,
          row: lead.row,
          spreadsheetId,
          tab,
        }),
      }).catch((e) => console.error("Could not mark call started:", e));

      // Transition to listening once connected
      const connectTimer = setTimeout(() => {
        setCallState((curr) => (curr === "Connecting" ? "Listening" : curr));
      }, 2500);

      // Duration counter
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      return () => {
        clearTimeout(connectTimer);
        stopAllTimers();
      };
    } else {
      stopAllTimers();
      hasCompletedRef.current = false;
    }
  }, [isOpen, lead?.row, spreadsheetId, tab, stopAllTimers]);

  // Component unmount safety
  useEffect(() => {
    return () => {
      stopAllTimers();
    };
  }, [stopAllTimers]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Controlled single-loop polling for post-call results (Rule 3 & Rule 5)
  const startPollingForResults = useCallback(() => {
    if (isPollingRef.current || hasCompletedRef.current) return;

    setCallState("Analyzing");
    setAnalyzingSeconds(0);
    setPollTimedOut(false);

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    isPollingRef.current = true;
    pollCountRef.current = 0;

    const poll = async () => {
      if (!isPollingRef.current || hasCompletedRef.current) return;

      pollCountRef.current += 1;
      setAnalyzingSeconds(pollCountRef.current * 3);

      const targetLead = leadRef.current;
      if (!targetLead) return;

      try {
        const freshLeads = await refreshLeadsRef.current();
        if (freshLeads && targetLead) {
          const currentInSheet = freshLeads.find((l) => l.row === targetLead.row);
          if (currentInSheet) {
            const pre = preCallSnapshotRef.current;
            const isCompletedOrFailed =
              currentInSheet.callStatus === "Completed" || currentInSheet.callStatus === "Failed";

            // Verify genuinely new conversation result (Rule 5)
            const hasNewConversationId = Boolean(
              currentInSheet.conversationId &&
                currentInSheet.conversationId !== pre?.conversationId,
            );
            const hasNewCalledAt = Boolean(
              currentInSheet.calledAt && currentInSheet.calledAt !== pre?.calledAt,
            );
            const hasStatusTransition = Boolean(
              pre?.callStatus !== "Completed" && currentInSheet.callStatus === "Completed",
            );
            const hasNewQualification = Boolean(
              (currentInSheet.propertyInterest &&
                currentInSheet.propertyInterest !== pre?.propertyInterest) ||
                (currentInSheet.budgetRange && currentInSheet.budgetRange !== pre?.budgetRange) ||
                (currentInSheet.interestStatus &&
                  currentInSheet.interestStatus !== pre?.interestStatus),
            );

            const isConfirmedNewResult =
              isCompletedOrFailed &&
              (hasNewConversationId ||
                hasNewCalledAt ||
                hasStatusTransition ||
                hasNewQualification);

            if (isConfirmedNewResult) {
              if (hasCompletedRef.current) return;
              hasCompletedRef.current = true;

              // Immediately halt polling
              if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
              }
              isPollingRef.current = false;

              setUpdatedLead(currentInSheet);
              onLeadUpdatedRef.current(currentInSheet);
              setCallState("Completed");
              return;
            }
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      // Max 60 seconds (20 iterations of 3 seconds)
      if (pollCountRef.current >= 20) {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        isPollingRef.current = false;
        // Do NOT fabricate results (Rule 5). Show waiting / timeout diagnostic state.
        setPollTimedOut(true);
      }
    };

    // First check after 2 seconds, then strictly every 3 seconds
    const firstCheck = setTimeout(() => {
      if (isPollingRef.current && !hasCompletedRef.current) {
        poll();
      }
    }, 2000);

    pollingTimerRef.current = setInterval(poll, 3000);

    return () => {
      clearTimeout(firstCheck);
    };
  }, []);

  const handleEndCall = () => {
    setCallState("Ending");
    setTimeout(() => {
      startPollingForResults();
    }, 800);
  };

  const handleManualCheck = async () => {
    setIsManualChecking(true);
    const targetLead = leadRef.current;
    try {
      const fresh = await refreshLeadsRef.current();
      if (fresh && targetLead) {
        const currentInSheet = fresh.find((l) => l.row === targetLead.row);
        if (currentInSheet) {
          const pre = preCallSnapshotRef.current;
          const isCompletedOrFailed =
            currentInSheet.callStatus === "Completed" || currentInSheet.callStatus === "Failed";
          const hasNewConversationId = Boolean(
            currentInSheet.conversationId &&
              currentInSheet.conversationId !== pre?.conversationId,
          );
          const hasNewCalledAt = Boolean(
            currentInSheet.calledAt && currentInSheet.calledAt !== pre?.calledAt,
          );
          const hasStatusTransition = Boolean(
            pre?.callStatus !== "Completed" && currentInSheet.callStatus === "Completed",
          );
          const hasNewQualification = Boolean(
            (currentInSheet.propertyInterest &&
              currentInSheet.propertyInterest !== pre?.propertyInterest) ||
              (currentInSheet.budgetRange && currentInSheet.budgetRange !== pre?.budgetRange) ||
              (currentInSheet.interestStatus &&
                currentInSheet.interestStatus !== pre?.interestStatus),
          );

          if (
            isCompletedOrFailed &&
            (hasNewConversationId || hasNewCalledAt || hasStatusTransition || hasNewQualification)
          ) {
            hasCompletedRef.current = true;
            setUpdatedLead(currentInSheet);
            onLeadUpdatedRef.current(currentInSheet);
            setCallState("Completed");
            setPollTimedOut(false);
          }
        }
      }
    } finally {
      setIsManualChecking(false);
    }
  };

  if (!isOpen || !lead) return null;

  const currentDisplayLead = updatedLead || lead;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-sm">
              <PhoneCall className="w-5 h-5 text-indigo-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  AI Qualification Call
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-500 font-medium">Alex · Real Estate Lead Specialist</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Calling {lead.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {callState !== "Completed" && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold tabular-nums text-slate-700">
                  {formatSeconds(duration)}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prospect Details Bar (internal sheet_row is intentionally omitted - Rule 4) */}
        <div className="px-6 py-3 bg-indigo-50/40 border-b border-indigo-100/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <div>
              <span className="text-slate-400 font-medium">Prospect:</span>{" "}
              <strong className="text-slate-800">{lead.name}</strong>
            </div>
            {lead.company && (
              <div>
                <span className="text-slate-400 font-medium">Company:</span>{" "}
                <strong className="text-slate-800">{lead.company}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-400 font-medium">Phone:</span>{" "}
              <strong className="text-slate-800">{lead.phone || "—"}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Live State:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-white border border-indigo-200 text-indigo-700 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              {callState}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">
          {callState !== "Analyzing" && callState !== "Completed" && (
            <div className="w-full flex flex-col items-center">
              {/* ElevenLabs Widget */}
              <div className="w-full max-w-lg mb-4">
                <ElevenLabsCallWidget
                  lead={lead}
                  agencyName={agencyName}
                  onCallEnded={handleEndCall}
                  onCallStarted={() => {
                    if (callState === "Connecting") setCallState("Listening");
                  }}
                />
              </div>

              {/* Status Indicator & Live Prompt Notes */}
              <div className="w-full max-w-lg bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 mb-2">
                <div className="flex items-center justify-between font-semibold text-slate-700 mb-1">
                  <span>Prospect Notes passed to Alex</span>
                  <span className="text-[11px] text-indigo-600 font-medium">Zero-Cost Browser Voice</span>
                </div>
                <p className="line-clamp-2 italic text-slate-500">
                  {lead.notes || "High priority real-estate prospect qualification call."}
                </p>
              </div>
            </div>
          )}

          {/* Analyzing State (Rule 2 & Rule 3) */}
          {callState === "Analyzing" && !pollTimedOut && (
            <div className="w-full max-w-md py-12 flex flex-col items-center text-center animate-in fade-in duration-300">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-10 h-10 animate-pulse text-indigo-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {analyzingSeconds > 12
                  ? "Waiting for qualification results..."
                  : "Analyzing conversation..."}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mb-6">
                {analyzingSeconds > 12
                  ? "Call concluded. ElevenLabs is processing audio transcript and posting qualification data to Google Sheets."
                  : "Alex is extracting property intent, budget, timeline, and updating Google Sheets via the post-call webhook."}
              </p>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 border border-slate-200">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Polling Google Sheet ({analyzingSeconds}s / 60s)</span>
              </div>
            </div>
          )}

          {/* Timed Out State (Rule 5: Never fabricate fake results) */}
          {callState === "Analyzing" && pollTimedOut && (
            <div className="w-full max-w-md py-10 flex flex-col items-center text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Waiting for qualification results...
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mb-6 leading-relaxed">
                The conversation ended, but qualification results have not yet appeared in Google Sheets for {lead.name}. The ElevenLabs webhook transcription may still be processing in the background.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleManualCheck}
                  disabled={isManualChecking}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualChecking ? "animate-spin" : ""}`} />
                  {isManualChecking ? "Checking Sheet..." : "Check Sheet Again"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Completed State */}
          {callState === "Completed" && (
            <div className="w-full py-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-emerald-950">
                      Qualification Complete
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      Google Sheet Synced
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Call outcomes and qualification fields have been recorded for {currentDisplayLead.name}.
                  </p>
                </div>
                <InterestBadge
                  status={currentDisplayLead.interestStatus}
                  interested={currentDisplayLead.interested}
                />
              </div>

              {/* Qualification Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    Property Intent
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {currentDisplayLead.propertyInterest || "Not specified"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    Budget Range
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {currentDisplayLead.budgetRange || "Not specified"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Preferred Location
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {currentDisplayLead.preferredLocation || "Not specified"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Timeline
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {currentDisplayLead.timeline || "Not specified"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs md:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                    Next Step
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {currentDisplayLead.nextStepType || "Follow-up Call"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 md:col-span-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    AI Qualification Reasoning
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentDisplayLead.interestReason ||
                      "Call completed and recorded in CRM."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {callState === "Completed" ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sheet row updated successfully
              </span>
            ) : callState === "Analyzing" && pollTimedOut ? (
              <span className="text-amber-700 font-medium">
                Google Sheet row has not updated yet. You can check again or close this dialog.
              </span>
            ) : callState === "Analyzing" ? (
              <span className="text-indigo-600 font-medium">
                {analyzingSeconds > 12
                  ? "Waiting for qualification results from ElevenLabs post-call webhook..."
                  : "Analyzing conversation and audio transcript..."}
              </span>
            ) : (
              <span>Alex is ready to qualify the prospect via browser audio.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {callState !== "Analyzing" && callState !== "Completed" && (
              <button
                onClick={handleEndCall}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                End Call
              </button>
            )}

            {callState === "Completed" && (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
