/**
 * HSK Builder Group AI Calling Platform
 * ElevenLabs Webhook Handler
 *
 * Endpoint: POST /api/webhooks/elevenlabs
 * Handles post_call_transcription and call_initiation_failure webhooks,
 * verifies HMAC signatures, logs durable events to Webhook_Events tab,
 * records idempotent outcomes in Call_Outcomes, and updates Enquiries tab.
 */

import { NextResponse } from "next/server";
import { verifyElevenLabsWebhookSignature } from "@/lib/elevenlabs-webhook-verifier";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";
import { generateOutcomeId, CallDisposition } from "@/lib/hsk-sheets-schema";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("ElevenLabs-Signature") || req.headers.get("elevenlabs-signature");

    // 1. Signature Verification
    const verification = verifyElevenLabsWebhookSignature(rawBody, signatureHeader);
    if (!verification.isValid) {
      return NextResponse.json(
        { success: false, error: verification.error || "Invalid webhook signature" },
        { status: 401 },
      );
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventType = String(payload.type || payload.event_type || "unknown");
    const conversationId = String(payload.conversation_id || payload.data?.conversation_id || "").trim();
    const callSid = String(payload.call_sid || payload.data?.call_sid || payload.callSid || "").trim();

    // 2. Correlate Enquiry ID
    const dynamicVars =
      payload.conversation_initiation_client_data?.dynamic_variables ||
      payload.data?.conversation_initiation_client_data?.dynamic_variables ||
      payload.dynamic_variables ||
      {};

    let enquiryId = String(dynamicVars.enquiry_id || payload.enquiry_id || "").trim();

    // Deduplication idempotency key
    const idempotencyKey = `EVT-${conversationId || Date.now()}-${eventType}`;
    const eventId = idempotencyKey;

    // 3. Durable Event Log in Webhook_Events tab BEFORE processing
    const isCorrelated = Boolean(enquiryId);
    const initialStatus = isCorrelated ? "RECEIVED" : "QUARANTINED";

    const logResult = await hskSheetsClient.recordWebhookEvent({
      event_id: eventId,
      provider: "ELEVENLABS",
      event_type: eventType,
      idempotency_key: idempotencyKey,
      enquiry_id: enquiryId || null,
      conversation_id: conversationId || null,
      call_sid: callSid || null,
      processing_status: initialStatus,
      error_details: isCorrelated ? null : "Could not correlate webhook to enquiry_id. Quarantined for safety.",
      raw_payload: payload,
    });

    if (logResult.duplicate) {
      return NextResponse.json({
        success: true,
        duplicate_ignored: true,
        message: "Webhook event previously processed",
        event_id: eventId,
      });
    }

    // If quarantined due to lack of correlation, do not update customer rows
    if (!isCorrelated) {
      return NextResponse.json({
        success: true,
        quarantined: true,
        message: "Webhook logged in Webhook_Events but quarantined: missing enquiry_id",
        event_id: eventId,
      });
    }

    // Retrieve Enquiry to verify it exists and get attempt sequence
    const enquiriesRes = await hskSheetsClient.getEnquiries();
    const enquiry = enquiriesRes.enquiries?.find((e: any) => e.enquiry_id === enquiryId);

    if (!enquiry) {
      // Quarantine event if enquiry ID does not exist in spreadsheet
      await hskSheetsClient.recordWebhookEvent({
        event_id: `${eventId}-err`,
        provider: "ELEVENLABS",
        event_type: eventType,
        idempotency_key: `${idempotencyKey}-not-found`,
        enquiry_id: enquiryId,
        processing_status: "QUARANTINED",
        error_details: `Enquiry ${enquiryId} not found in database`,
        raw_payload: payload,
      });

      return NextResponse.json({
        success: true,
        quarantined: true,
        message: `Enquiry ${enquiryId} not found. Event quarantined.`,
      });
    }

    const attemptSequence = enquiry.attempt_sequence_count || 1;
    const outcomeId = generateOutcomeId(enquiryId, attemptSequence);

    // 4. Branch based on Event Type
    let disposition: CallDisposition = "UNKNOWN";
    let interested: boolean | null = null;
    let dndRequested = false;
    let summary: string | null = null;
    let durationSeconds = 0;
    let recordingUrl: string | null = null;

    if (eventType === "call_initiation_failure") {
      disposition = "FAILED_TECH";
      summary = payload.error || payload.detail?.message || "Outbound call initiation failed at carrier gateway";
    } else if (eventType === "post_call_transcription" || eventType === "conversation_ended") {
      const callData = payload.data || payload;
      durationSeconds = Number(callData.call_duration_secs || callData.duration_seconds || 0);
      recordingUrl = callData.recording_url || null;

      // Extract analysis / criteria results if present
      const analysis = callData.analysis || {};
      const transcript = callData.transcript || [];

      // Check for user requesting DND
      const fullText = Array.isArray(transcript)
        ? transcript.map((t: any) => t.message || t.text || "").join(" ").toLowerCase()
        : String(callData.transcript_summary || "").toLowerCase();

      if (
        fullText.includes("do not call") ||
        fullText.includes("dont call") ||
        fullText.includes("remove my number") ||
        fullText.includes("stop calling")
      ) {
        dndRequested = true;
      }

      // Disposition determination
      const terminationReason = String(callData.termination_reason || callData.status || "").toLowerCase();
      if (
        terminationReason.includes("no_answer") ||
        terminationReason.includes("no-answer") ||
        terminationReason.includes("unanswered")
      ) {
        disposition = "NO_ANSWER";
      } else if (terminationReason.includes("busy")) {
        disposition = "BUSY";
      } else if (terminationReason.includes("failed") || terminationReason.includes("error")) {
        disposition = "FAILED_TECH";
      } else {
        disposition = "ANSWERED";
        if (analysis.evaluation_criteria_results) {
          const evalRes = analysis.evaluation_criteria_results;
          interested = evalRes.interested === "success" || evalRes.interested === true;
        } else if (callData.interested !== undefined) {
          interested = Boolean(callData.interested);
        }
      }

      summary = callData.transcript_summary || analysis.transcript_summary || (disposition === "ANSWERED" ? "Call completed with prospect." : `Call ended with ${disposition}`);
    }

    // 5. Record Outcome & Update Enquiry State
    const outcomeResult = await hskSheetsClient.recordOutcome({
      outcome_id: outcomeId,
      enquiry_id: enquiryId,
      attempt_sequence: attemptSequence,
      channel: "EXOTEL_PSTN",
      call_sid: callSid || null,
      conversation_id: conversationId || null,
      call_start_time: enquiry.last_call_at || new Date().toISOString(),
      duration_seconds: durationSeconds,
      call_disposition: disposition,
      interested,
      dnd_requested: dndRequested,
      qualification_summary: summary,
      recording_url: recordingUrl,
    });

    return NextResponse.json({
      success: true,
      event_id: eventId,
      outcome_id: outcomeId,
      enquiry_id: enquiryId,
      disposition,
      new_enquiry_status: outcomeResult.new_status,
      next_retry_at: outcomeResult.next_retry_at,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Webhook processing failure";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
