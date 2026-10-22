import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hskSheetsTestDouble } from "../lib/hsk-sheets-test-double.ts";
import { HskSheetsClient } from "../lib/hsk-sheets-client.ts";

describe("HSK Website Integration Restoration & Safe Merge Verification", () => {
  const configuredSecret = "hsk_prod_secret_token_abcdef123456";

  beforeEach(() => {
    hskSheetsTestDouble.reset();
    hskSheetsTestDouble.setConfiguredSharedSecret(configuredSecret);
    hskSheetsTestDouble.setMockCallingWindow(true);
  });

  test("1. Replay Original Website Form Payload: Accepted unauthenticated, normalizes fields and persists exactly 1 enquiry", async () => {
    // Replay the exact website enquiry payload matching live Rows 1-5
    const originalWebsitePayload = {
      name: "Shaurya Pratap",
      phone: "919876543210",
      propertyId: "SL-3B-204 — 3 bhk apartment",
      email: "shauryapratap@example.com",
      visitDate: "2026-10-25",
      consent: true,
    };

    // Unauthenticated submission from public website frontend (no shared_secret provided)
    const result = hskSheetsTestDouble.createEnquiry(originalWebsitePayload);

    // Assert response matches what website expects
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "success");
    assert.ok(result.enquiry_id && result.enquiry_id.startsWith("HSK-ENQ-"));
    assert.strictEqual(result.id, result.enquiry_id);
    assert.strictEqual(result.queue_class, "FRESH");
    assert.strictEqual(result.current_status, "QUEUED");
    assert.strictEqual(result.in_calling_window, true);

    // Verify exactly one row was persisted in Enquiries tab
    const fetchRes = hskSheetsTestDouble.getEnquiries({ shared_secret: configuredSecret });
    assert.strictEqual(fetchRes.success, true);
    assert.strictEqual(fetchRes.count, 1);

    const saved = fetchRes.enquiries[0];
    assert.strictEqual(saved.customer_name, "Shaurya Pratap");
    assert.strictEqual(saved.phone_number, "+919876543210");
    assert.strictEqual(saved.project_interest, "SL-3B-204 — 3 bhk apartment");
    assert.strictEqual(saved.source, "hsk-website");
    assert.strictEqual(saved.utm_campaign, "direct-web");
    assert.ok(saved.customer_notes.includes("Email: shauryapratap@example.com"));
    assert.ok(saved.customer_notes.includes("Preferred Visit: 2026-10-25"));
    assert.ok(saved.customer_notes.includes("Consent: YES"));
  });

  test("2. Idempotency: Duplicate website form submission returns duplicate status and does NOT create duplicate row", async () => {
    const websitePayload = {
      name: "Himanshu Sharma",
      phone: "919102930293",
      propertyId: "SL-3B-204",
      email: "himanshu@gmail.com",
      consent: true,
    };

    // Initial submission
    const firstSubmit = hskSheetsTestDouble.createEnquiry(websitePayload);
    assert.strictEqual(firstSubmit.success, true);
    assert.strictEqual(Boolean(firstSubmit.is_duplicate), false);

    // Replay duplicate submission with same phone number
    const secondSubmit = hskSheetsTestDouble.createEnquiry({
      name: "Himanshu Sharma Duplicate",
      phone: "+919102930293",
      propertyId: "SL-3B-204",
      email: "himanshu@gmail.com",
    });

    assert.strictEqual(secondSubmit.success, true);
    assert.strictEqual(secondSubmit.is_duplicate, true);
    assert.strictEqual(secondSubmit.enquiry_id, firstSubmit.enquiry_id);
    assert.ok(secondSubmit.message.includes("already queued/active"));

    // Verify total row count is still strictly 1
    const fetchRes = hskSheetsTestDouble.getEnquiries({ shared_secret: configuredSecret });
    assert.strictEqual(fetchRes.count, 1);
  });

  test("3. Alias Handling: Supports camelCase, snake_case, and custom form field names", async () => {
    const customPayload = {
      fullName: "Kavya Shah Verification Test",
      mobile: "9876543210",
      property: "HSK-SKYGARDEN",
      notes: "Looking for penthouse view",
      email_id: "kavya.test@example.com",
      preferredDate: "2026-10-25",
      consent: "YES",
      action: "submit_enquiry",
    };

    const res = hskSheetsTestDouble.createEnquiry(customPayload);
    assert.strictEqual(res.success, true);

    const fetchRes = hskSheetsTestDouble.getEnquiries({ shared_secret: configuredSecret });
    assert.strictEqual(fetchRes.count, 1);
    const item = fetchRes.enquiries[0];

    assert.strictEqual(item.customer_name, "Kavya Shah Verification Test");
    assert.strictEqual(item.phone_number, "+919876543210");
    assert.strictEqual(item.project_interest, "HSK-SKYGARDEN");
    assert.ok(item.customer_notes.includes("Looking for penthouse view"));
    assert.ok(item.customer_notes.includes("Email: kavya.test@example.com"));
    assert.ok(item.customer_notes.includes("Preferred Visit: 2026-10-25"));
    assert.ok(item.customer_notes.includes("Consent: YES"));
  });

  test("4. Protected Operations: Sensitive actions FAIL CLOSED if unauthenticated or wrong secret", async () => {
    const unauthClient = new HskSheetsClient({
      useTestDouble: true,
      sharedSecret: "wrong_secret_key",
    });

    // Operational read actions must fail
    const readEnq = await unauthClient.getEnquiries();
    assert.strictEqual(readEnq.success, false);
    assert.ok(readEnq.error?.includes("Unauthorized"));

    const readOutcomes = await unauthClient.getCallOutcomes();
    assert.strictEqual(readOutcomes.success, false);
    assert.ok(readOutcomes.error?.includes("Unauthorized"));

    const readEvents = await unauthClient.getWebhookEvents();
    assert.strictEqual(readEvents.success, false);
    assert.ok(readEvents.error?.includes("Unauthorized"));

    const readState = await unauthClient.getSystemState();
    assert.strictEqual(readState.success, false);
    assert.ok(readState.error?.includes("Unauthorized"));

    // Operational mutate actions must fail
    const claim = await unauthClient.claimNextEnquiry();
    assert.strictEqual(claim.success, false);
    assert.ok(claim.error?.includes("Unauthorized"));

    const lock = await unauthClient.acquireDialerLock("sess_bad");
    assert.strictEqual(lock.success, false);
    assert.ok(lock.error?.includes("Unauthorized"));

    const unlock = await unauthClient.releaseDialerLock("sess_bad");
    assert.strictEqual(unlock.success, false);
    assert.ok(unlock.error?.includes("Unauthorized"));
  });

  test("5. Authenticated Operations: Dashboard client with valid secret executes protected operations and queue workflow", async () => {
    const authClient = new HskSheetsClient({
      useTestDouble: true,
      sharedSecret: configuredSecret,
    });

    // 1. Submit enquiry via website (public intake simulation)
    const enqRes = hskSheetsTestDouble.createEnquiry({
      name: "Rahul Sharma",
      phone: "919876543201",
      propertyId: "HSK Solitaire 4 BHK",
    });
    assert.strictEqual(enqRes.success, true);

    // 2. Dashboard claims next enquiry
    const claimRes = await authClient.claimNextEnquiry();
    assert.strictEqual(claimRes.success, true);
    assert.strictEqual(claimRes.claimed, true);
    assert.strictEqual(claimRes.enquiry.customer_name, "Rahul Sharma");

    // 3. Concurrency lock prevents secondary claim
    const lockCheck = await authClient.acquireDialerLock("sess_secondary");
    assert.strictEqual(lockCheck.success, false);
    assert.ok(lockCheck.error?.includes("busy") || lockCheck.error?.includes("already locked"));

    // 4. Record outcome
    const outcomeRes = await authClient.recordOutcome({
      outcome_id: "OUT-RESTORE-001",
      enquiry_id: enqRes.enquiry_id,
      attempt_sequence: 1,
      channel: "EXOTEL_PSTN",
      call_sid: "CA_TEST_RESTORE",
      conversation_id: "conv_test_restore",
      call_disposition: "ANSWERED",
      interested: true,
      qualification_summary: "Confirmed site visit for Saturday",
    });
    assert.strictEqual(outcomeRes.success, true);

    // 5. Release dialer lock
    const releaseRes = await authClient.releaseDialerLock(claimRes.session_id);
    assert.strictEqual(releaseRes.success, true);
  });
});
