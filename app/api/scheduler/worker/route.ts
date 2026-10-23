/**
 * HSK Builder Group AI Calling Platform
 * Protected Queue Worker & Scheduled Runner
 *
 * Endpoint: POST /api/scheduler/worker (and GET for health/trigger)
 * - Protected by Bearer Token (CRON_SECRET / SCHEDULER_SECRET)
 * - Updates scheduler heartbeat
 * - Enforces calling window (9 AM - 10 PM IST)
 * - Safe active-call recovery (no auto-unlock)
 * - Atomically claims next priority enquiry
 * - Initiates outbound call via ElevenLabs Exotel integration
 */

import { NextResponse } from "next/server";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";
import { isCallingWindowOpen, generateOutcomeId } from "@/lib/hsk-sheets-schema";
import { initiateExotelOutboundCall } from "@/lib/elevenlabs-exotel-dialer";
import { verifyWorkerAuthorization } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    // 1. Enforce Server-Side Authorization (Bearer token or same-origin dashboard trigger)
    const authHeader = req.headers.get("authorization");
    const referer = req.headers.get("referer") || "";
    const host = req.headers.get("host") || "";
    const isSameOrigin = (host && referer.includes(host)) || req.headers.get("sec-fetch-site") === "same-origin";

    if (!verifyWorkerAuthorization(authHeader) && !isSameOrigin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing or invalid worker authorization" },
        { status: 401 },
      );
    }

    const nowIso = new Date().toISOString();

    // 2. Calling Hours Gate
    const isOpen = isCallingWindowOpen();
    if (!isOpen) {
      return NextResponse.json({
        success: true,
        action: "SKIPPED",
        reason: "OUTSIDE_CALLING_HOURS",
        message: "Calling window is 9:00 AM - 10:00 PM IST",
        timestamp: nowIso,
      });
    }

    // 3. Monitor Prolonged Locks (Strict Safety: Never auto-release active call!)
    await hskSheetsClient.reconcileStaleLocks();

    // 4. Atomically Claim Next Priority Enquiry
    const claimRes = await hskSheetsClient.claimNextEnquiry();
    if (!claimRes.claimed) {
      return NextResponse.json({
        success: true,
        action: "IDLE",
        reason: claimRes.reason || "NO_WORK",
        message: claimRes.message || "No eligible enquiries in queue",
        timestamp: nowIso,
      });
    }

    const { enquiry, session_id } = claimRes;

    // 5. Initiate Outbound Call via ElevenLabs Exotel Adapter
    const dialRes = await initiateExotelOutboundCall({
      enquiry_id: enquiry.enquiry_id,
      phone_number: enquiry.phone_number,
      customer_name: enquiry.customer_name,
      project_interest: enquiry.project_interest,
    });

    if (dialRes.success) {
      return NextResponse.json({
        success: true,
        action: "CALL_INITIATED",
        enquiry_id: enquiry.enquiry_id,
        session_id,
        conversation_id: dialRes.conversation_id,
        call_sid: dialRes.call_sid,
        is_simulated: dialRes.is_simulated || false,
      });
    }

    // 6. Ambiguous Outbound Timeout: Quarantine without redialing
    if (dialRes.quarantined_for_reconciliation) {
      return NextResponse.json({
        success: false,
        action: "QUARANTINED_TIMEOUT",
        enquiry_id: enquiry.enquiry_id,
        error: dialRes.error,
      });
    }

    // 7. Technical failure: record outcome with configurable retry policy
    const outcomeId = generateOutcomeId(enquiry.enquiry_id, enquiry.attempt_sequence || 1);
    await hskSheetsClient.recordOutcome({
      outcome_id: outcomeId,
      enquiry_id: enquiry.enquiry_id,
      attempt_sequence: enquiry.attempt_sequence || 1,
      call_disposition: "FAILED_TECH",
      qualification_summary: dialRes.error || "Carrier call initiation failed",
    });

    return NextResponse.json({
      success: false,
      action: "INITIATION_FAILED",
      enquiry_id: enquiry.enquiry_id,
      error: dialRes.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
