/**
 * HSK Builder Group AI Calling Platform
 * ElevenLabs + Exotel Outbound Calling Adapter
 *
 * Primary Telephony Integration:
 * POST https://api.elevenlabs.io/v1/convai/exotel/outbound-call
 */

import { hskSheetsClient } from "./hsk-sheets-client.ts";
import { isCallingWindowOpen, normalizePhoneNumber } from "./hsk-sheets-schema.ts";

export interface OutboundDialParams {
  enquiry_id: string;
  phone_number: string;
  customer_name: string;
  project_interest?: string;
  customer_notes?: string;
}

export interface OutboundDialResult {
  success: boolean;
  conversation_id?: string;
  call_sid?: string;
  is_simulated?: boolean;
  error?: string;
  status_code?: number;
  quarantined_for_reconciliation?: boolean;
}

export async function initiateExotelOutboundCall(
  params: OutboundDialParams,
): Promise<OutboundDialResult> {
  const { enquiry_id, phone_number, customer_name, project_interest } = params;

  // 1. Calling Hours Gate
  if (!isCallingWindowOpen()) {
    return {
      success: false,
      error: "Initiation blocked: Outside 9:00 AM - 10:00 PM IST calling window",
    };
  }

  const cleanPhone = normalizePhoneNumber(phone_number);
  if (!cleanPhone) {
    return { success: false, error: "Invalid destination phone number" };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const agentPhoneNumberId = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;

  // 2. Check for missing credentials (Safe Test Double Mode)
  const isMockMode =
    process.env.HSK_USE_TEST_DOUBLE === "true" ||
    process.env.NODE_ENV === "test" ||
    !apiKey ||
    !agentPhoneNumberId;

  if (isMockMode) {
    if (!apiKey || !agentPhoneNumberId) {
      // In development or when credentials are not yet provisioned in .env.local
      const mockConvId = `conv_sim_${Date.now()}`;
      const mockCallSid = `exotel_sim_${Date.now()}`;
      return {
        success: true,
        is_simulated: true,
        conversation_id: mockConvId,
        call_sid: mockCallSid,
      };
    }
  }

  // 3. Official ElevenLabs Exotel Endpoint Call
  const endpoint = "https://api.elevenlabs.io/v1/convai/exotel/outbound-call";
  const requestBody = {
    agent_id: agentId,
    agent_phone_number_id: agentPhoneNumberId,
    to_number: cleanPhone,
    conversation_initiation_client_data: {
      dynamic_variables: {
        customer_name: customer_name.trim(),
        lead_name: customer_name.trim(),
        project_interest: (project_interest || "General").trim(),
        enquiry_id: enquiry_id.trim(),
        agency_name: "HSK Builder Group",
      },
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey!,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      const errDetail = typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
        ? data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
        : data.detail?.message || data.error || data.message || `HTTP ${response.status}`;
      return {
        success: false,
        status_code: response.status,
        error: `ElevenLabs Exotel API failed: ${errDetail}`,
      };
    }

    // Official response fields: conversation_id and call_sid (or callSid)
    const conversationId = data.conversation_id || data.conversationId;
    const callSid = data.call_sid || data.callSid;

    return {
      success: true,
      conversation_id: conversationId,
      call_sid: callSid,
    };
  } catch (error: any) {
    // 4. Ambiguous Timeout Handling
    if (error.name === "AbortError" || error.code === "UND_ERR_CONNECT_TIMEOUT") {
      // Rule 3: Do NOT blindly redial on timeout! Quarantine for operator reconciliation.
      return {
        success: false,
        quarantined_for_reconciliation: true,
        error: "Ambiguous timeout contacting ElevenLabs Exotel API. Call may have been placed. Quarantined for reconciliation.",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to initiate outbound call",
    };
  }
}
