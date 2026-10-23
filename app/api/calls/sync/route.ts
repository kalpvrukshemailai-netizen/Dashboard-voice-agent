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

      // Extract transcript text
      const transcriptList = Array.isArray(detail.transcript) ? detail.transcript : [];
      const userText = transcriptList
        .filter((t: any) => t.role === "user")
        .map((t: any) => t.message || "")
        .join(" ")
        .toLowerCase();

      const duration = Number(detail.metadata?.call_duration_secs || 0);
      const transcriptSummary =
        analysis.transcript_summary ||
        analysis.call_summary_title ||
        "Live voice conversation completed.";
      const summaryLower = transcriptSummary.toLowerCase();

      // Qualification & Interest criteria from ElevenLabs
      const criteriaList = analysis.evaluation_criteria_results_list || [];
      const leadQualified = criteriaList.find((c: any) => c.criteria_id === "lead_qualified")?.result === "success";
      const nextStepAgreed = criteriaList.find((c: any) => c.criteria_id === "next_step_agreed")?.result === "success";
      const callSuccessful = analysis.call_successful === "success";

      // Phone call metadata & result
      const callResult = (phoneCall.call_result || "").toLowerCase();
      const isCarrierBusy = callResult === "busy" || callResult === "user_busy";
      const isCarrierNoAnswer = callResult === "no-answer" || callResult === "no_answer";
      const isZeroDuration = duration === 0 || transcriptList.length === 0;

      // Conversational signals
      const isDnd =
        userText.includes("do not call") ||
        userText.includes("dnd") ||
        userText.includes("stop calling") ||
        userText.includes("block") ||
        userText.includes("don't call") ||
        userText.includes("mat call") ||
        summaryLower.includes("do not call") ||
        summaryLower.includes("requested not to be contacted");

      const hasBusyKeyword =
        userText.includes("busy") ||
        userText.includes("meeting") ||
        userText.includes("driving") ||
        userText.includes("drive") ||
        userText.includes("call back") ||
        userText.includes("call me later") ||
        userText.includes("call tomorrow") ||
        userText.includes("kal phone") ||
        userText.includes("kal call") ||
        userText.includes("baad mein") ||
        userText.includes("baad me") ||
        userText.includes("abhi nahi") ||
        userText.includes("not a good time") ||
        userText.includes("half an hour") ||
        userText.includes("30 minute") ||
        userText.includes("1 hour") ||
        summaryLower.includes("busy in a meeting") ||
        summaryLower.includes("stated they were busy") ||
        summaryLower.includes("call back tomorrow") ||
        summaryLower.includes("asked the agent to call back") ||
        summaryLower.includes("call back the next day") ||
        summaryLower.includes("call back in");

      const hasExplicitRefusal =
        userText.includes("not interested") ||
        userText.includes("don't want property") ||
        userText.includes("dont want property") ||
        userText.includes("wrong number") ||
        userText.includes("nahi chahiye") ||
        userText.includes("koi property nahi") ||
        summaryLower.includes("not interested in property") ||
        summaryLower.includes("indicated no interest in buying");

      // Intelligent Disposition & Qualification resolution
      let disposition: "ANSWERED" | "BUSY" | "NO_ANSWER" | "CALLBACK_REQUESTED" | "DO_NOT_CALL" | "NOT_INTERESTED" = "ANSWERED";
      let isInterested: boolean | null = null;
      let qualStatus: "QUALIFIED" | "INTERESTED" | "NOT_INTERESTED" | "DISQUALIFIED" | "CALLBACK_REQUESTED" | "UNREACHED" | "DND" | "PENDING" = "PENDING";
      let nextRetryIso: string | undefined = undefined;

      if (isCarrierBusy) {
        disposition = "BUSY";
        isInterested = null;
        qualStatus = "UNREACHED";
      } else if (isCarrierNoAnswer || isZeroDuration) {
        disposition = "NO_ANSWER";
        isInterested = null;
        qualStatus = "UNREACHED";
      } else if (isDnd) {
        disposition = "DO_NOT_CALL";
        isInterested = false;
        qualStatus = "DND";
      } else if (hasBusyKeyword && !hasExplicitRefusal) {
        // Prospect answered but is busy (in meeting, driving, asked to call back)
        disposition = "CALLBACK_REQUESTED";
        isInterested = null; // NEVER false!
        qualStatus = "CALLBACK_REQUESTED";

        const now = new Date();
        if (userText.includes("tomorrow") || userText.includes("kal") || summaryLower.includes("tomorrow") || summaryLower.includes("next day")) {
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          tomorrow.setHours(10, 30, 0, 0); // 10:30 AM next day
          nextRetryIso = tomorrow.toISOString();
        } else if (userText.includes("half an hour") || userText.includes("30 min") || summaryLower.includes("half an hour")) {
          nextRetryIso = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
        } else if (userText.includes("1 hour") || userText.includes("one hour")) {
          nextRetryIso = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        } else {
          nextRetryIso = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
        }
      } else if (leadQualified || nextStepAgreed || callSuccessful) {
        disposition = "ANSWERED";
        isInterested = true;
        qualStatus = "QUALIFIED";
      } else if (hasExplicitRefusal) {
        disposition = "NOT_INTERESTED";
        isInterested = false;
        qualStatus = "NOT_INTERESTED";
      } else {
        // Conversation ended without explicit qualification or refusal (e.g. abrupt drop)
        // CRITICAL: Keep alive, mark PENDING, schedule retry in 15 mins!
        disposition = "ANSWERED";
        isInterested = null;
        qualStatus = "PENDING";
        nextRetryIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

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
        call_disposition: disposition,
        interested: isInterested,
        qualification_status: qualStatus,
        next_retry_at: nextRetryIso,
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
