import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hskSheetsTestDouble } from "../lib/hsk-sheets-test-double.ts";
import { HskSheetsClient } from "../lib/hsk-sheets-client.ts";
import {
  isCallingWindowOpen,
  normalizePhoneNumber,
  getNextWindowOpeningTime,
  generateEnquiryId,
  generateOutcomeId,
  HSK_TABS,
  ENQUIRIES_HEADERS,
  CALL_OUTCOMES_HEADERS,
  WEBHOOK_EVENTS_HEADERS,
  SYSTEM_STATE_HEADERS,
} from "../lib/hsk-sheets-schema.ts";

describe("Phase 1: Google Sheets Foundation, Locking & Queue Coordinator", () => {
  let client;

  beforeEach(() => {
    hskSheetsTestDouble.reset();
    client = new HskSheetsClient({ useTestDouble: true });
  });

  test("1. Schema headers and tab names match specification", () => {
    assert.equal(HSK_TABS.ENQUIRIES, "Enquiries");
    assert.equal(HSK_TABS.CALL_OUTCOMES, "Call_Outcomes");
    assert.equal(HSK_TABS.WEBHOOK_EVENTS, "Webhook_Events");
    assert.equal(HSK_TABS.SYSTEM_STATE, "System_State");

    assert.ok(ENQUIRIES_HEADERS.includes("enquiry_id"));
    assert.ok(ENQUIRIES_HEADERS.includes("customer_name"));
    assert.ok(ENQUIRIES_HEADERS.includes("phone_number"));
    assert.ok(ENQUIRIES_HEADERS.includes("customer_no_answer_count"));
    assert.ok(ENQUIRIES_HEADERS.includes("technical_failures_count"));

    assert.ok(CALL_OUTCOMES_HEADERS.includes("outcome_id"));
    assert.ok(CALL_OUTCOMES_HEADERS.includes("call_disposition"));

    assert.ok(WEBHOOK_EVENTS_HEADERS.includes("event_id"));
    assert.ok(SYSTEM_STATE_HEADERS.includes("state_key"));
  });

  test("2. Calling hours gate enforcement (9 AM - 10 PM IST)", () => {
    // 10:00 AM IST is 04:30 UTC
    const insideTime = new Date("2026-10-21T04:30:00.000Z");
    assert.equal(isCallingWindowOpen(insideTime), true);

    // 11:30 PM IST is 18:00 UTC
    const outsideTimeLate = new Date("2026-10-21T18:00:00.000Z");
    assert.equal(isCallingWindowOpen(outsideTimeLate), false);

    // 7:00 AM IST is 01:30 UTC
    const outsideTimeEarly = new Date("2026-10-21T01:30:00.000Z");
    assert.equal(isCallingWindowOpen(outsideTimeEarly), false);
  });

  test("3. Phone normalization and ID generation", () => {
    assert.equal(normalizePhoneNumber("9825014820"), "+919825014820");
    assert.equal(normalizePhoneNumber("+919825014820"), "+919825014820");
    assert.equal(normalizePhoneNumber("919825014820"), "+919825014820");
    assert.equal(normalizePhoneNumber("  (98250) 14820 "), "+919825014820");

    const enqId = generateEnquiryId(42);
    assert.ok(enqId.startsWith("HSK-ENQ-"));
    assert.ok(enqId.endsWith("00042"));

    const outId = generateOutcomeId("HSK-ENQ-2026-00001", 2);
    assert.equal(outId, "OUT-HSK-ENQ-2026-00001-2");
  });

  test("4. Enquiry intake and duplicate prevention", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    const res1 = await client.createEnquiry({
      customer_name: "Amit Patel",
      phone_number: "9825011111",
      project_interest: "HSK Heights",
      customer_notes: "Looking for 3BHK",
    });

    assert.equal(res1.success, true);
    assert.ok(res1.enquiry_id);
    assert.equal(res1.queue_class, "FRESH");

    // Second intake with same phone while first is QUEUED must be flagged duplicate
    const res2 = await client.createEnquiry({
      customer_name: "Amit Patel Duplicate",
      phone_number: "+919825011111",
      project_interest: "HSK Heights",
    });

    assert.equal(res2.success, true);
    assert.equal(res2.is_duplicate, true);
    assert.equal(res2.enquiry_id, res1.enquiry_id);
  });

  test("5. Queue Priority Ordering: Latest Fresh > Due Retries > Overnight Backlog", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    // 1. Create overnight backlog enquiry (simulated)
    const enqBacklog = await client.createEnquiry({
      customer_name: "Backlog Lead",
      phone_number: "9825000001",
      customer_notes: "Arrived at 2 AM",
    });
    // Manually mark as BACKLOG
    const bRecord = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enqBacklog.enquiry_id);
    bRecord.queue_class = "BACKLOG";
    bRecord.created_at = new Date("2026-10-21T02:00:00Z").toISOString();

    // 2. Create due retry enquiry
    const enqRetry = await client.createEnquiry({
      customer_name: "Retry Lead",
      phone_number: "9825000002",
    });
    const rRecord = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enqRetry.enquiry_id);
    rRecord.queue_class = "RETRY";
    rRecord.current_status = "RETRY_SCHEDULED";
    rRecord.next_retry_at = new Date(Date.now() - 60000).toISOString(); // Overdue

    // 3. Create older fresh enquiry
    const enqFreshOld = await client.createEnquiry({
      customer_name: "Fresh Older Lead",
      phone_number: "9825000003",
    });
    const foRecord = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enqFreshOld.enquiry_id);
    foRecord.created_at = new Date(Date.now() - 100000).toISOString();

    // 4. Create latest fresh enquiry
    const enqFreshNew = await client.createEnquiry({
      customer_name: "Fresh Newest Lead",
      phone_number: "9825000004",
    });
    const fnRecord = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enqFreshNew.enquiry_id);
    fnRecord.created_at = new Date(Date.now() - 10000).toISOString();

    // PRIORITY CHECK 1: Latest fresh enquiry must be claimed first
    const claim1 = await client.claimNextEnquiry();
    assert.equal(claim1.claimed, true);
    assert.equal(claim1.enquiry.customer_name, "Fresh Newest Lead");

    // Complete call 1 to free dialer
    await client.recordOutcome({
      outcome_id: "OUT-001",
      enquiry_id: claim1.enquiry.enquiry_id,
      call_disposition: "ANSWERED",
      interested: true,
    });

    // PRIORITY CHECK 2: Next freshest lead must be claimed ahead of retries & backlog
    const claim2 = await client.claimNextEnquiry();
    assert.equal(claim2.claimed, true);
    assert.equal(claim2.enquiry.customer_name, "Fresh Older Lead");

    await client.recordOutcome({
      outcome_id: "OUT-002",
      enquiry_id: claim2.enquiry.enquiry_id,
      call_disposition: "ANSWERED",
      interested: true,
    });

    // PRIORITY CHECK 3: Now due retries must be claimed ahead of backlog
    const claim3 = await client.claimNextEnquiry();
    assert.equal(claim3.claimed, true);
    assert.equal(claim3.enquiry.customer_name, "Retry Lead");

    await client.recordOutcome({
      outcome_id: "OUT-003",
      enquiry_id: claim3.enquiry.enquiry_id,
      call_disposition: "ANSWERED",
      interested: true,
    });

    // PRIORITY CHECK 4: Finally overnight backlog is claimed
    const claim4 = await client.claimNextEnquiry();
    assert.equal(claim4.claimed, true);
    assert.equal(claim4.enquiry.customer_name, "Backlog Lead");
  });

  test("6. Concurrency lock prevents parallel dialer claims", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    await client.createEnquiry({
      customer_name: "Lead 1",
      phone_number: "9825000010",
    });
    await client.createEnquiry({
      customer_name: "Lead 2",
      phone_number: "9825000020",
    });

    // Claim 1 locks dialer
    const claim1 = await client.claimNextEnquiry();
    assert.equal(claim1.claimed, true);
    assert.ok(claim1.enquiry.enquiry_id);

    // Concurrent claim while call is in-flight must be rejected
    const claim2 = await client.claimNextEnquiry();
    assert.equal(claim2.claimed, false);
    assert.equal(claim2.reason, "DIALER_BUSY");

    // Finishing call 1 unlocks dialer
    await client.recordOutcome({
      outcome_id: "OUT-CONCURRENCY-1",
      enquiry_id: claim1.enquiry.enquiry_id,
      call_disposition: "ANSWERED",
      interested: true,
    });

    // Now claim 3 succeeds and claims the second enquiry
    const claim3 = await client.claimNextEnquiry();
    assert.equal(claim3.claimed, true);
    assert.notEqual(claim3.enquiry.enquiry_id, claim1.enquiry.enquiry_id);
  });

  test("7. Retry policy: busy/no-answer allows 3 attempts at 2-min intervals, then terminal NOT_ANSWERED", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    const enq = await client.createEnquiry({
      customer_name: "Busy Lead",
      phone_number: "9825000030",
    });
    const enquiryId = enq.enquiry_id;

    // Attempt 1: Busy
    const claim1 = await client.claimNextEnquiry();
    assert.equal(claim1.enquiry.enquiry_id, enquiryId);

    const out1 = await client.recordOutcome({
      outcome_id: "OUT-ATTEMPT-1",
      enquiry_id: enquiryId,
      call_disposition: "BUSY",
    });
    assert.equal(out1.new_status, "RETRY_SCHEDULED");
    assert.ok(out1.next_retry_at);

    // Check counters
    let state = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enquiryId);
    assert.equal(state.customer_no_answer_count, 1);
    assert.equal(state.technical_failures_count, 0);

    // Simulate time passing: overdue
    state.next_retry_at = new Date(Date.now() - 1000).toISOString();

    // Attempt 2: No Answer
    const claim2 = await client.claimNextEnquiry();
    assert.equal(claim2.claimed, true);

    const out2 = await client.recordOutcome({
      outcome_id: "OUT-ATTEMPT-2",
      enquiry_id: enquiryId,
      call_disposition: "NO_ANSWER",
    });
    assert.equal(out2.new_status, "RETRY_SCHEDULED");

    state = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enquiryId);
    assert.equal(state.customer_no_answer_count, 2);

    // Simulate time passing: overdue
    state.next_retry_at = new Date(Date.now() - 1000).toISOString();

    // Attempt 3: No Answer -> Terminal NOT_ANSWERED
    const claim3 = await client.claimNextEnquiry();
    assert.equal(claim3.claimed, true);

    const out3 = await client.recordOutcome({
      outcome_id: "OUT-ATTEMPT-3",
      enquiry_id: enquiryId,
      call_disposition: "NO_ANSWER",
    });
    assert.equal(out3.new_status, "NOT_ANSWERED");

    state = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enquiryId);
    assert.equal(state.customer_no_answer_count, 3);
    assert.equal(state.current_status, "NOT_ANSWERED");
    assert.equal(state.queue_class, "NONE");

    // Attempt 4 must NOT be claimed because terminal state reached
    const claim4 = await client.claimNextEnquiry();
    assert.equal(claim4.claimed, false);
    assert.equal(claim4.reason, "NO_DUE_ENQUIRIES");
  });

  test("8. Technical failure counter is strictly isolated from customer no-answer count", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    const enq = await client.createEnquiry({
      customer_name: "Tech Fail Lead",
      phone_number: "9825000040",
    });
    const enquiryId = enq.enquiry_id;

    // Claim
    await client.claimNextEnquiry();

    // Record FAILED_TECH
    const out1 = await client.recordOutcome({
      outcome_id: "OUT-TECH-1",
      enquiry_id: enquiryId,
      call_disposition: "FAILED_TECH",
      error_details: "Carrier Gateway 502",
    });
    assert.equal(out1.new_status, "RETRY_SCHEDULED");

    const record = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enquiryId);
    // Crucial rule: tech failures NEVER increment customer no answer
    assert.equal(record.technical_failures_count, 1);
    assert.equal(record.customer_no_answer_count, 0);
  });

  test("9. DND immediately suppresses future calls", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    const enq = await client.createEnquiry({
      customer_name: "DND Lead",
      phone_number: "9825000050",
    });
    const enquiryId = enq.enquiry_id;

    await client.claimNextEnquiry();

    const out = await client.recordOutcome({
      outcome_id: "OUT-DND-1",
      enquiry_id: enquiryId,
      call_disposition: "ANSWERED",
      dnd_requested: true,
    });

    assert.equal(out.new_status, "DO_NOT_CALL");

    const record = (await client.getEnquiries()).enquiries.find(e => e.enquiry_id === enquiryId);
    assert.equal(record.current_status, "DO_NOT_CALL");
    assert.equal(record.qualification_status, "DND");

    // Queue must never claim this lead again
    const claim = await client.claimNextEnquiry();
    assert.equal(claim.claimed, false);
  });

  test("10. Idempotent outcome recording prevents duplicate row creation", async () => {
    hskSheetsTestDouble.setMockCallingWindow(true);

    const enq = await client.createEnquiry({
      customer_name: "Idempotent Lead",
      phone_number: "9825000060",
    });
    await client.claimNextEnquiry();

    const res1 = await client.recordOutcome({
      outcome_id: "OUT-IDEM-001",
      enquiry_id: enq.enquiry_id,
      call_disposition: "ANSWERED",
      interested: true,
    });
    assert.equal(res1.success, true);
    assert.equal(res1.idempotent_duplicate, undefined);

    // Resending same outcome_id
    const res2 = await client.recordOutcome({
      outcome_id: "OUT-IDEM-001",
      enquiry_id: enq.enquiry_id,
      call_disposition: "ANSWERED",
      interested: true,
    });
    assert.equal(res2.success, true);
    assert.equal(res2.idempotent_duplicate, true);
  });
});
