import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hskSheetsTestDouble } from "../lib/hsk-sheets-test-double.ts";
import { HskSheetsClient } from "../lib/hsk-sheets-client.ts";
import {
  verifyElevenLabsWebhookSignature,
  generateMockElevenLabsSignature,
} from "../lib/elevenlabs-webhook-verifier.ts";
import {
  isCallingWindowOpen,
  generateOutcomeId,
  normalizePhoneNumber,
} from "../lib/hsk-sheets-schema.ts";

describe("Phase 6: End-to-End HSK Builder Group AI Calling Workflow", () => {
  let client;
  const mockWebhookSecret = "test_webhook_secret_key_12345";

  beforeEach(() => {
    hskSheetsTestDouble.reset();
    client = new HskSheetsClient({ useTestDouble: true });
    process.env.ELEVENLABS_WEBHOOK_SECRET = mockWebhookSecret;
  });

  test("1. Full lifecycle: Website Enquiry -> Queue Claim -> Outbound Call -> No Answer Retry -> Answer & Qualification", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    // Step 1: Customer submits enquiry on website
    const customerPayload = {
      customer_name: "Rohan Verma",
      phone_number: "98250 99887",
      project_interest: "HSK Signature Villa",
      customer_notes: "Looking for 4BHK with East facing entrance",
      source: "Google Ads",
      utm_campaign: "diwali_luxury_villas",
    };

    const intakeRes = await client.createEnquiry({
      ...customerPayload,
      phone_number: normalizePhoneNumber(customerPayload.phone_number),
    });

    assert.equal(intakeRes.success, true);
    assert.ok(intakeRes.enquiry_id);
    assert.equal(intakeRes.queue_class, "FRESH");
    assert.equal(intakeRes.current_status, "QUEUED");

    const enquiryId = intakeRes.enquiry_id;

    // Step 2: Queue Worker executes and claims the fresh enquiry
    const claim1 = await client.claimNextEnquiry();
    assert.equal(claim1.claimed, true);
    assert.equal(claim1.enquiry.enquiry_id, enquiryId);
    assert.equal(claim1.enquiry.customer_name, "Rohan Verma");

    // Check system state: dialer is locked
    const state1 = await client.getSystemState();
    assert.equal(state1.data.DIALER_LOCK.locked, true);
    assert.equal(state1.data.ACTIVE_SESSION.active, true);

    // Step 3: Outbound call placed, but customer is BUSY
    const outcome1Id = generateOutcomeId(enquiryId, 1);
    const outcome1Res = await client.recordOutcome({
      outcome_id: outcome1Id,
      enquiry_id: enquiryId,
      attempt_sequence: 1,
      channel: "EXOTEL_PSTN",
      call_sid: "exotel_call_001",
      conversation_id: "conv_001",
      call_disposition: "BUSY",
    });

    assert.equal(outcome1Res.success, true);
    assert.equal(outcome1Res.new_status, "RETRY_SCHEDULED");
    assert.ok(outcome1Res.next_retry_at);

    // Verify dialer lock released
    const stateAfterOutcome1 = await client.getSystemState();
    assert.equal(stateAfterOutcome1.data.DIALER_LOCK.locked, false);

    // Verify enquiry counter updated
    let enquiryRecord = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enquiryId);
    assert.equal(enquiryRecord.customer_no_answer_count, 1);
    assert.equal(enquiryRecord.current_status, "RETRY_SCHEDULED");
    assert.equal(enquiryRecord.queue_class, "RETRY");

    // Step 4: 2 minutes pass, enquiry is due for retry
    enquiryRecord.next_retry_at = new Date(Date.now() - 5000).toISOString();

    // Worker claims retry
    const claim2 = await client.claimNextEnquiry();
    assert.equal(claim2.claimed, true);
    assert.equal(claim2.enquiry.enquiry_id, enquiryId);
    assert.equal(claim2.enquiry.attempt_sequence, 2);

    // Step 5: Webhook arrives with post_call_transcription: Customer answered and qualified!
    const webhookPayload = {
      type: "post_call_transcription",
      conversation_id: "conv_002",
      call_sid: "exotel_call_002",
      conversation_initiation_client_data: {
        dynamic_variables: {
          enquiry_id: enquiryId,
        },
      },
      data: {
        call_duration_secs: 145,
        transcript_summary: "Customer confirmed interest in 4BHK villa, budget ₹3.5 Cr. Requested site visit on Saturday.",
        analysis: {
          evaluation_criteria_results: {
            interested: "success",
          },
        },
      },
    };

    const rawWebhookBody = JSON.stringify(webhookPayload);
    const signature = generateMockElevenLabsSignature(rawWebhookBody, mockWebhookSecret);

    // Webhook signature verification check
    const sigCheck = verifyElevenLabsWebhookSignature(rawWebhookBody, signature, mockWebhookSecret);
    assert.equal(sigCheck.isValid, true);

    // Durable webhook event logged
    const eventId = `EVT-conv_002-post_call_transcription`;
    const logRes = await client.recordWebhookEvent({
      event_id: eventId,
      provider: "ELEVENLABS",
      event_type: "post_call_transcription",
      idempotency_key: eventId,
      enquiry_id: enquiryId,
      conversation_id: "conv_002",
      call_sid: "exotel_call_002",
      processing_status: "PROCESSED",
      raw_payload: webhookPayload,
    });
    assert.equal(logRes.success, true);

    // Outcome recorded
    const outcome2Id = generateOutcomeId(enquiryId, 2);
    const outcome2Res = await client.recordOutcome({
      outcome_id: outcome2Id,
      enquiry_id: enquiryId,
      attempt_sequence: 2,
      channel: "EXOTEL_PSTN",
      call_sid: "exotel_call_002",
      conversation_id: "conv_002",
      duration_seconds: 145,
      call_disposition: "ANSWERED",
      interested: true,
      qualification_summary: webhookPayload.data.transcript_summary,
    });

    assert.equal(outcome2Res.success, true);
    assert.equal(outcome2Res.new_status, "QUALIFIED");

    // Step 6: Verify immutable customer identity fields were NEVER altered
    const finalEnquiry = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enquiryId);
    assert.equal(finalEnquiry.customer_name, "Rohan Verma");
    assert.equal(finalEnquiry.phone_number, "+919825099887");
    assert.equal(finalEnquiry.project_interest, "HSK Signature Villa");
    assert.equal(finalEnquiry.customer_notes, "Looking for 4BHK with East facing entrance");
    assert.equal(finalEnquiry.current_status, "QUALIFIED");
    assert.equal(finalEnquiry.latest_outcome_id, outcome2Id);

    // Verify lock released
    const finalState = await client.getSystemState();
    assert.equal(finalState.data.DIALER_LOCK.locked, false);
  });

  test("2. Webhook replay idempotency: Duplicate delivery returns duplicate_ignored and does not mutate row count", async () => {
    const eventId = "EVT-REPLAY-100";
    const log1 = await client.recordWebhookEvent({
      event_id: eventId,
      provider: "ELEVENLABS",
      event_type: "post_call_transcription",
    });
    assert.equal(log1.success, true);
    assert.equal(log1.duplicate, undefined);

    // Replay with same eventId
    const log2 = await client.recordWebhookEvent({
      event_id: eventId,
      provider: "ELEVENLABS",
      event_type: "post_call_transcription",
    });
    assert.equal(log2.success, true);
    assert.equal(log2.duplicate, true);
  });

  test("3. DND immediately suppresses future automated calls", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    const enq = await client.createEnquiry({
      customer_name: "DND Customer",
      phone_number: "9825000099",
    });

    await client.claimNextEnquiry();

    await client.recordOutcome({
      outcome_id: `OUT-${enq.enquiry_id}-1`,
      enquiry_id: enq.enquiry_id,
      call_disposition: "ANSWERED",
      dnd_requested: true,
    });

    const record = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enq.enquiry_id);
    assert.equal(record.current_status, "DO_NOT_CALL");
    assert.equal(record.qualification_status, "DND");

    // Queue claim must skip
    const claim = await client.claimNextEnquiry();
    assert.equal(claim.claimed, false);
  });
});
