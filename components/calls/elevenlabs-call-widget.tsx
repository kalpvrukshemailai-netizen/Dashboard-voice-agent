"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Lead } from "@/lib/google-sheets";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "agent-id"?: string;
        "dynamic-variables"?: string;
        variant?: string;
        dismissible?: string;
      };
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "agent-id"?: string;
        "dynamic-variables"?: string;
        variant?: string;
        dismissible?: string;
      };
    }
  }
}

interface ElevenLabsCallWidgetProps {
  lead: Lead;
  spreadsheetId?: string;
  tab?: string;
  agencyName?: string;
  onCallEnded?: () => void;
  onCallStarted?: () => void;
}

export function ElevenLabsCallWidget({
  lead,
  agencyName = "Beprompter",
  onCallEnded,
  onCallStarted,
}: ElevenLabsCallWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const convaiRef = useRef<HTMLElement | null>(null);
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_5101m3dfq488edv8aqf47w7ahvyk";

  // Construct dynamic variables strictly matching ElevenLabs conversation contract (Rule 4)
  // Note: internal sheet_row is used for post-call webhook row tracking, never spoken or displayed
  const dynamicVariables = useMemo(() => {
    return {
      agency_name: agencyName || "Beprompter",
      lead_name: lead.name,
      company_name: lead.company || agencyName || "Beprompter",
      lead_notes: lead.notes || "High priority real-estate prospect",
      sheet_row: String(lead.row),
    };
  }, [lead.name, lead.company, lead.notes, lead.row, agencyName]);

  const dynamicVariablesJson = useMemo(() => JSON.stringify(dynamicVariables), [dynamicVariables]);

  useEffect(() => {
    // Notify parent call has started mounting
    onCallStarted?.();

    const element = containerRef.current;
    if (!element) return;

    const handleCallEnd = () => {
      onCallEnded?.();
    };

    element.addEventListener("elevenlabs-convai:end", handleCallEnd);
    element.addEventListener("call-ended", handleCallEnd);

    return () => {
      element.removeEventListener("elevenlabs-convai:end", handleCallEnd);
      element.removeEventListener("call-ended", handleCallEnd);
    };
  }, [onCallEnded, onCallStarted]);

  useEffect(() => {
    if (convaiRef.current) {
      convaiRef.current.setAttribute("dynamic-variables", dynamicVariablesJson);
      try {
        (convaiRef.current as unknown as { dynamicVariables?: Record<string, unknown> }).dynamicVariables = dynamicVariables;
      } catch {
        // Ignore property assign error on custom element if not supported
      }
    }
  }, [dynamicVariables, dynamicVariablesJson]);

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-center justify-center p-4 bg-slate-50/60 rounded-2xl border border-slate-200/80 min-h-[380px]"
    >
      <elevenlabs-convai
        ref={convaiRef}
        key={`convai-${lead.row}-${encodeURIComponent(lead.name)}`}
        agent-id={agentId}
        variant="expanded"
        dismissible="false"
        dynamic-variables={dynamicVariablesJson}
        className="w-full flex justify-center"
      />
    </div>
  );
}
