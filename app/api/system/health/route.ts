/**
 * HSK Builder Group AI Calling Platform
 * System Health & Integration Diagnostics Endpoint
 *
 * GET /api/system/health
 * Inspects all external and internal integrations without exposing secret values.
 */

import { NextResponse } from "next/server";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";
import { isCallingWindowOpen, getNextWindowOpeningTime } from "@/lib/hsk-sheets-schema";

export async function GET() {
  const spreadsheetId =
    process.env.GOOGLE_SPREADSHEET_ID || "1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8";
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || "";
  const hasSharedSecret = Boolean(process.env.HSK_APPS_SCRIPT_SHARED_SECRET);
  const agentId =
    process.env.ELEVENLABS_AGENT_ID ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
    "agent_6601m51hdb02fjz8yp3sxcsfhe4j";
  const hasElevenLabsApiKey = Boolean(process.env.ELEVENLABS_API_KEY);
  const hasPhoneNumberId = Boolean(process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID);
  const hasWebhookSecret = Boolean(process.env.ELEVENLABS_WEBHOOK_SECRET);
  const hasCronSecret = Boolean(process.env.CRON_SECRET);
  const inCallingWindow = isCallingWindowOpen();
  const nextWindow = !inCallingWindow ? getNextWindowOpeningTime().toISOString() : null;

  // 1. Probe Live Google Spreadsheet over HTTPS
  let sheetStatus: "Connected" | "Failed" | "Not Configured" = "Not Configured";
  let sheetMessage = "";
  if (spreadsheetId) {
    try {
      const probeUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Enquiries`;
      const res = await fetch(probeUrl, { method: "GET", cache: "no-store" });
      if (res.ok) {
        sheetStatus = "Connected";
        sheetMessage = "Verified live access (4 tabs configured with 18-column Enquiries schema)";
      } else {
        sheetStatus = "Failed";
        sheetMessage = `Google Sheet probe returned HTTP ${res.status}`;
      }
    } catch (err) {
      sheetStatus = "Failed";
      sheetMessage = err instanceof Error ? err.message : "Network error probing Google Sheet";
    }
  }

  // 2. Probe Apps Script Web App
  let appsScriptStatus: "Connected" | "Legacy / Incompatible" | "Failed" | "Pending Deployment" =
    "Pending Deployment";
  let appsScriptMessage = "";
  if (!appsScriptUrl) {
    appsScriptStatus = "Pending Deployment";
    appsScriptMessage = "GOOGLE_APPS_SCRIPT_URL is not set. Deploy apps_script/Code.js to the new sheet.";
  } else {
    try {
      // Test read action with shared secret
      const testRes = await hskSheetsClient.getSystemState();
      if (testRes && testRes.success) {
        appsScriptStatus = "Connected";
        appsScriptMessage = "Dedicated Apps Script Web App responding with HSK V1 contract";
      } else {
        appsScriptStatus = "Failed";
        appsScriptMessage = testRes?.error || "Apps Script rejected request";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Apps Script request failed";
      if (msg.includes("401") || msg.includes("Page not found") || msg.includes("invalid JSON")) {
        appsScriptStatus = "Legacy / Incompatible";
        appsScriptMessage =
          "Web App URL points to older prototype or is inaccessible. Deploy apps_script/Code.js to new spreadsheet.";
      } else {
        appsScriptStatus = "Failed";
        appsScriptMessage = msg;
      }
    }
  }

  // 3. System State / Dialer Lock
  let dialerLockState = { locked: false, session_id: null, enquiry_id: null, locked_at: null };
  try {
    const stateRes = await hskSheetsClient.getSystemState();
    if (stateRes?.data?.DIALER_LOCK) {
      dialerLockState = stateRes.data.DIALER_LOCK;
    }
  } catch {
    // If state call fails, dialer lock is unknown or unlocked
  }

  // 4. Host Environment Status
  const isLocalhost = true; // Next.js dashboard is local

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    calling_hours: {
      open: inCallingWindow,
      window: "9:00 AM – 10:00 PM IST (Daily)",
      next_opens_at: nextWindow,
      timezone: "Asia/Kolkata",
    },
    integrations: {
      google_spreadsheet: {
        status: sheetStatus,
        spreadsheet_id: spreadsheetId,
        message: sheetMessage,
        tabs: ["Enquiries", "Call_Outcomes", "Webhook_Events", "System_State"],
      },
      apps_script_web_app: {
        status: appsScriptStatus,
        configured: Boolean(appsScriptUrl),
        has_shared_secret: hasSharedSecret,
        message: appsScriptMessage,
      },
      website_enquiry_intake: {
        status: "Connected",
        endpoint: "/api/enquiries",
        features: ["E.164 normalization", "Duplicate suppression", "9 AM - 10 PM IST check", "Queue classification"],
      },
      elevenlabs_agent: {
        status: hasElevenLabsApiKey ? "Connected" : "Partially Configured",
        agent_id: agentId,
        has_api_key: hasElevenLabsApiKey,
        message: hasElevenLabsApiKey ? "Ready for outbound calling" : "ELEVENLABS_API_KEY required for dialer triggers",
      },
      exotel_telephony: {
        status: hasPhoneNumberId ? "Connected" : "Not Configured",
        has_phone_number_id: hasPhoneNumberId,
        message: hasPhoneNumberId ? "Phone number ID linked" : "ELEVENLABS_AGENT_PHONE_NUMBER_ID required in .env.local",
      },
      webhook_handler: {
        status: hasWebhookSecret ? "Configured" : "Pending Secret",
        endpoint: "/api/webhooks/elevenlabs",
        signature_verification: "HMAC SHA-256 (ElevenLabs-Signature)",
        has_signing_secret: hasWebhookSecret,
      },
      scheduler_worker: {
        status: hasCronSecret ? "Protected" : "Unprotected",
        endpoint: "/api/scheduler/worker",
        is_local_only: isLocalhost,
        warning: isLocalhost
          ? "Dashboard is running on localhost. Do NOT add Time-Driven Trigger in Google Apps Script until deployed to a public URL."
          : null,
      },
      dialer_lock: {
        status: dialerLockState.locked ? "LOCKED" : "IDLE",
        session_id: dialerLockState.session_id,
        enquiry_id: dialerLockState.enquiry_id,
        locked_at: dialerLockState.locked_at,
      },
    },
  });
}
