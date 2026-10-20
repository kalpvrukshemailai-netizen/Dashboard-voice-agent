import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hskSheetsTestDouble } from "../lib/hsk-sheets-test-double.ts";
import { HskSheetsClient } from "../lib/hsk-sheets-client.ts";
import {
  verifyWorkerAuthorization,
  verifyAdminAuthorization,
  validateEnquiryInput,
} from "../lib/auth-helpers.ts";
import { generateOutcomeId, normalizePhoneNumber } from "../lib/hsk-sheets-schema.ts";

describe("Production Hardening: Authentication, Lock Safety & Policy Gates", () => {
  const testSecret = "hsk_super_secret_shared_token_98765";
  const cronSecret = "cron_secret_worker_auth_12345";
  const adminSecret = "admin_secret_operator_auth_54321";

  beforeEach(() => {
    hskSheetsTestDouble.reset();
    process.env.HSK_APPS_SCRIPT_SHARED_SECRET = testSecret;
    process.env.CRON_SECRET = cronSecret;
    process.env.ADMIN_SECRET = adminSecret;
    process.env.ENABLE_AUTO_TECHNICAL_RETRIES = "false";
    hskSheetsTestDouble.setConfiguredSharedSecret(testSecret);
    hskSheetsTestDouble.setMockCallingWindow(true);
  });

  test("1. Google Apps Script Authentication: Rejects unauthorized requests without valid shared secret", async () => {
    // Client configured with invalid shared secret
    const unauthClient = new HskSheetsClient({
      useTestDouble: true,
      sharedSecret: "wrong_secret_attack",
    });

    const res = await unauthClient.getEnquiries();
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("Unauthorized"));

    // Client with valid secret succeeds
    const authClient = new HskSheetsClient({
      useTestDouble: true,
      sharedSecret: testSecret,
    });
    const authRes = await authClient.getEnquiries();
    assert.equal(authRes.success, true);
    assert.equal(authRes.count, 0);
  });

  test("2. Protected Next.js API Routes: Worker authorization rejects missing or invalid bearer tokens", () => {
    // Anonymous request (no Authorization header)
    assert.equal(verifyWorkerAuthorization(null), false);
    assert.equal(verifyWorkerAuthorization(undefined), false);

    // Wrong bearer token
    assert.equal(verifyWorkerAuthorization("Bearer invalid_cron_token"), false);
    assert.equal(verifyWorkerAuthorization("Basic dXNlcjpwYXNz"), false);

    // Valid CRON_SECRET succeeds
    assert.equal(verifyWorkerAuthorization(`Bearer ${cronSecret}`), true);
  });

  test("3. Protected Next.js API Routes: Operator state authorization rejects unauthorized actors", () => {
    // Anonymous attempt
    assert.equal(verifyAdminAuthorization(null), false);
    assert.equal(verifyAdminAuthorization(""), false);

    // Wrong token
    assert.equal(verifyAdminAuthorization("Bearer hacker_token"), false);

    // Authorized token
    assert.equal(verifyAdminAuthorization(`Bearer ${adminSecret}`), true);
  });

  test("4. Safe Active-Call Recovery: Prolonged lock (>15m) is NEVER auto-released and prevents concurrent calls", async () => {
    const client = new HskSheetsClient({ useTestDouble: true, sharedSecret: testSecret });

    // Create 2 enquiries
    await client.createEnquiry({
      customer_name: "Customer Active",
      phone_number: "9825000001",
    });
    await client.createEnquiry({
      customer_name: "Customer Waiting",
      phone_number: "9825000002",
    });

    // Claim first enquiry (locks dialer)
    const claim1 = await client.claimNextEnquiry();
    assert.equal(claim1.claimed, true);

    // Artificially simulate 25 minutes elapsed on the lock (simulate a prolonged call)
    const oldTime = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    const state = await client.getSystemState();
    const lockObj = state.data.DIALER_LOCK;
    lockObj.locked_at = oldTime;
    hskSheetsTestDouble["systemState"].get("DIALER_LOCK").state_value = JSON.stringify(lockObj);

    // CRITICAL SAFETY CHECK: claimNextEnquiry must NOT auto-release lock!
    const claim2 = await client.claimNextEnquiry();
    assert.equal(claim2.claimed, false);
    assert.equal(claim2.reason, "DIALER_BUSY");
    assert.equal(claim2.requires_operator_reconciliation, true);

    // Reconcile without explicit force & authorization must NOT release lock
    const reconcileNoAuth = await client.reconcileStaleLocks();
    assert.equal(reconcileNoAuth.reconciled, false);
    assert.equal(reconcileNoAuth.requires_manual_reconciliation, true);

    // Verify lock is STILL locked!
    const checkState = await client.getSystemState();
    assert.equal(checkState.data.DIALER_LOCK.locked, true);

    // Only explicit operator authorized force release clears the lock
    const forceReconcile = await client.reconcileStaleLocks(true, "Operator_999");
    assert.equal(forceReconcile.success, true);
    assert.equal(forceReconcile.reconciled, true);

    // Now that operator verified and reconciled, dialer can claim next lead
    const claim3 = await client.claimNextEnquiry();
    assert.equal(claim3.claimed, true);
  });

  test("5. Retry Policy Safety: Technical failure does NOT auto-retry by default; customer counters isolated", async () => {
    const client = new HskSheetsClient({ useTestDouble: true, sharedSecret: testSecret });

    const enq = await client.createEnquiry({
      customer_name: "Carrier Error Prospect",
      phone_number: "9825000015",
    });
    await client.claimNextEnquiry();

    // Record FAILED_TECH with default settings (auto_technical_retries_enabled: false)
    const outcomeId = generateOutcomeId(enq.enquiry_id, 1);
    const outRes = await client.recordOutcome({
      outcome_id: outcomeId,
      enquiry_id: enq.enquiry_id,
      call_disposition: "FAILED_TECH",
      qualification_summary: "502 Bad Gateway from PSTN carrier",
      auto_technical_retries_enabled: false,
    });

    assert.equal(outRes.new_status, "FAILED_TECHNICAL");
    assert.equal(outRes.next_retry_at, null);

    // Verify customer no-answer count remains 0
    const rec = (await client.getEnquiries()).enquiries.find((e) => e.enquiry_id === enq.enquiry_id);
    assert.equal(rec.technical_failures_count, 1);
    assert.equal(rec.customer_no_answer_count, 0);
    assert.equal(rec.current_status, "FAILED_TECHNICAL");
  });

  test("6. Website Form Intake Validation: Validates customer name, phone and protects against garbage data", async () => {
    // 1. Missing name (< 2 chars)
    const res1 = validateEnquiryInput({ customer_name: "A", phone_number: "9825012345" });
    assert.equal(res1.isValid, false);
    assert.ok(res1.error?.includes("Customer name is required"));

    // 2. Missing phone
    const res2 = validateEnquiryInput({ customer_name: "Valid Name", phone_number: "" });
    assert.equal(res2.isValid, false);
    assert.ok(res2.error?.includes("Phone number is required"));

    // 3. Valid input normalization
    const res3 = validateEnquiryInput({
      customer_name: "  Sneha Reddy  ",
      phone_number: " 98250 54321 ",
      project_interest: "HSK Meadows",
    });
    assert.equal(res3.isValid, true);
    assert.equal(res3.cleanData?.customer_name, "Sneha Reddy");
    assert.equal(normalizePhoneNumber(res3.cleanData?.raw_phone), "+919825054321");

    // 4. Persistence into Sheets client
    const client = new HskSheetsClient({ useTestDouble: true, sharedSecret: testSecret });
    const createRes = await client.createEnquiry({
      customer_name: res3.cleanData.customer_name,
      phone_number: res3.cleanData.raw_phone,
      project_interest: res3.cleanData.project_interest,
    });
    assert.equal(createRes.success, true);
    assert.equal(createRes.queue_class, "FRESH");
  });
});
