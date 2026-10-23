/**
 * HSK Builder Group AI Calling Platform
 * Live ElevenLabs Telephony Sync Route
 *
 * Endpoint: POST /api/calls/sync and GET /api/calls/sync
 * Polls ElevenLabs Conversational AI for completed conversations,
 * correlates them with pending or calling enquiries,
 * writes full transcripts and analysis into Google Sheets (Call_Outcomes & Enquiries),
 * and automatically releases the dialer lock.
 */

import { NextResponse } from "next/server";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";
import { generateOutcomeId, normalizePhoneNumber } from "@/lib/hsk-sheets-schema";

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing ELEVENLABS_API_KEY" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const specificConvId = searchParams.get("conversation_id");

    let convIdsToProcess: string[] = [];

    if (specificConvId) {
      convIdsToProcess = [specificConvId];
    } else {
      // List recent conversations for this agent
      const listUrl = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId || ""}&page_size=10`;
      const listRes = await fetch(listUrl, {
        headers: { "xi-api-key": apiKey },
        cache: "no-store",
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
        return NextResponse.json({ success: false, error: `ElevenLabs list API failed: ${errText}` }, { status: 502 });
      }

      const listData = await listRes.json();
      const conversations = listData.conversations || [];
      convIdsToProcess = conversations.map((c: any) => c.conversation_id);
    }

    if (convIdsToProcess.length === 0) {
      return NextResponse.json({ success: true, message: "No conversations found to sync", synced_count: 0 });
    }

    // Retrieve active enquiries from Google Sheet
    const enqRes = await hskSheetsClient.getEnquiries({ limit: 100 });
    const enquiries: any[] = enqRes.enquiries || [];

    // Retrieve existing outcomes to avoid duplicate writes
    const outcomesRes = await hskSheetsClient.getCallOutcomes({ limit: 100 });
    const existingOutcomes: any[] = outcomesRes.outcomes || [];
    const recordedConvIds = new Set(existingOutcomes.map((o: any) => o.conversation_id).filter(Boolean));

    const syncResults: any[] = [];

    for (const convId of convIdsToProcess) {
      if (recordedConvIds.has(convId)) {
        continue; // Already persisted in Google Sheet
      }

      // Fetch detailed conversation
      const detailUrl = `https://api.elevenlabs.io/v1/convai/conversations/${convId}`;
      const detailRes = await fetch(detailUrl, {
        headers: { "xi-api-key": apiKey },
        cache: "no-store",
      });

      if (!detailRes.ok) continue;

      const detail = await detailRes.json();

      // Only process completed / ended calls
      const status = String(detail.status || "").toLowerCase();
      if (status === "in-progress" || status === "in_progress") {
        continue; // Still speaking
      }

      // Extract phone number and correlate to enquiry
      const phoneCall = detail.metadata?.phone_call || {};
      const externalPhone = phoneCall.external_number || detail.user_id || "";
      const cleanPhone = normalizePhoneNumber(externalPhone);

      // Extract enquiry_id from dynamic variables if available
      const dynVars =
        detail.conversation_initiation_client_data?.dynamic_variables ||
        detail.conversation_initiation_client_data?.custom_llm_extra_body ||
        {};
      const taggedEnquiryId = dynVars.enquiry_id;

      // Extract conversation start timestamp
      const convStartSecs = Number(detail.metadata?.start_time_unix_secs || detail.start_time_unix_secs || 0);
      const convStartMs = convStartSecs * 1000;

      // Find matching enquiry
      let matchedEnquiry = enquiries.find((e) => taggedEnquiryId && e.enquiry_id === taggedEnquiryId);

      // If no tagged enquiry_id, ONLY correlate by phone if the call happened AFTER the enquiry was created
      if (!matchedEnquiry && cleanPhone && convStartMs > 0) {
        matchedEnquiry = enquiries.find((e) => {
          if (normalizePhoneNumber(e.phone_number) !== cleanPhone) return false;
          const enqCreatedMs = new Date(e.created_at).getTime();
          // The call must have started after the enquiry was received (with 30s grace period)
          const callHappenedAfterEnquiry = convStartMs >= (enqCreatedMs - 30000);
          const isActivelyWaitingCall = e.current_status === "CALLING";
          return callHappenedAfterEnquiry && isActivelyWaitingCall;
        });
      }

      if (!matchedEnquiry) {
        continue; // Cannot correlate or old historical call — do NOT update new enquiry!
      }

      // Extract analysis details
      const analysis = detail.analysis || {};
      const dataCollection = analysis.data_collection_results_list || [];
      const getVal = (id: string) => dataCollection.find((d: any) => d.data_collection_id === id)?.value || "";

      const budget = getVal("budget_range") || "";
      const location = getVal("preferred_location") || "";
      const timeline = getVal("timeline") || "";
      const propertyType = getVal("property_type_preference") || getVal("property_interest") || "";

      // Qualification & Interest
      const criteriaList = analysis.evaluation_criteria_results_list || [];
      const leadQualified = criteriaList.find((c: any) => c.criteria_id === "lead_qualified")?.result === "success";
      const nextStepAgreed = criteriaList.find((c: any) => c.criteria_id === "next_step_agreed")?.result === "success";
      const isInterested = leadQualified || nextStepAgreed || analysis.call_successful === "success";

      const duration = Number(detail.metadata?.call_duration_secs || 0);
      const transcriptSummary =
        analysis.transcript_summary ||
        analysis.call_summary_title ||
        "Live voice conversation completed.";

      const outcomeId = generateOutcomeId(matchedEnquiry.enquiry_id, matchedEnquiry.attempt_sequence_count || 1);

      // Record to Google Sheet Call_Outcomes & update Enquiries
      const outcomePayload = {
        outcome_id: outcomeId,
        enquiry_id: matchedEnquiry.enquiry_id,
        attempt_sequence: matchedEnquiry.attempt_sequence_count || 1,
        channel: "EXOTEL_PSTN",
        call_sid: phoneCall.call_sid || "",
        conversation_id: convId,
        call_start_time: new Date((detail.metadata?.start_time_unix_secs || Date.now() / 1000) * 1000).toISOString(),
        duration_seconds: duration,
        call_disposition: "ANSWERED",
        interested: isInterested,
        qualification_status: isInterested ? "INTERESTED" : "NOT_INTERESTED",
        property_config: propertyType,
        budget_range: budget,
        preferred_location: location,
        timeline: timeline,
        qualification_summary: transcriptSummary,
        recording_url: `https://api.elevenlabs.io/v1/convai/conversations/${convId}/audio`,
        transcript_summary: transcriptSummary,
      };

      const recordRes = await hskSheetsClient.recordOutcome(outcomePayload as any);

      // Release dialer lock
      await hskSheetsClient.releaseDialerLock(undefined, true, "ELEVENLABS_SYNC");

      syncResults.push({
        conversation_id: convId,
        enquiry_id: matchedEnquiry.enquiry_id,
        outcome_id: outcomeId,
        status: recordRes.success ? "RECORDED_TO_SHEET" : "ERROR",
        summary: transcriptSummary,
      });
    }

    return NextResponse.json({
      success: true,
      synced_count: syncResults.length,
      synced_conversations: syncResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
