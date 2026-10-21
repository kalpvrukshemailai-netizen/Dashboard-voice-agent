import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  HSK_TABS,
  ENQUIRIES_HEADERS,
  ENQUIRIES_HEADERS_21,
  ENQUIRIES_HEADERS_18,
  CALL_OUTCOMES_HEADERS_CANONICAL,
  CALL_OUTCOMES_HEADERS_SPREADSHEET,
  WEBHOOK_EVENTS_HEADERS_CANONICAL,
  WEBHOOK_EVENTS_HEADERS_SPREADSHEET,
  SYSTEM_STATE_HEADERS_CANONICAL,
  SYSTEM_STATE_HEADERS_SPREADSHEET,
} from "../lib/hsk-sheets-schema.ts";
import { extractSheetId } from "../lib/google-sheets.ts";

describe("Phase 1: Spreadsheet Schema Reconciliation & Live Sheet Verification", () => {
  const NEW_SPREADSHEET_URL =
    "https://docs.google.com/spreadsheets/d/1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8/edit?usp=sharing";
  const EXPECTED_SPREADSHEET_ID = "1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8";

  test("1. Spreadsheet ID extraction", () => {
    const extracted = extractSheetId(NEW_SPREADSHEET_URL);
    assert.equal(extracted, EXPECTED_SPREADSHEET_ID);
  });

  test("2. Schema Contract: 21-column canonical vs 18-column spreadsheet contract", () => {
    assert.equal(ENQUIRIES_HEADERS_21.length, 21);
    assert.equal(ENQUIRIES_HEADERS_18.length, 18);
    assert.equal(ENQUIRIES_HEADERS, ENQUIRIES_HEADERS_21);

    // Columns 1-15 are identical between both schemas
    for (let i = 0; i < 15; i++) {
      assert.equal(ENQUIRIES_HEADERS_18[i], ENQUIRIES_HEADERS_21[i]);
    }

    // Omitted fields in 18-column spreadsheet schema
    assert.ok(!ENQUIRIES_HEADERS_18.includes("latest_disposition"));
    assert.ok(!ENQUIRIES_HEADERS_18.includes("qualification_status"));
    assert.ok(!ENQUIRIES_HEADERS_18.includes("assigned_agent"));

    // Preserved fields in 18-column spreadsheet schema
    assert.ok(ENQUIRIES_HEADERS_18.includes("active_session_id"));
    assert.ok(ENQUIRIES_HEADERS_18.includes("latest_outcome_id"));
    assert.ok(ENQUIRIES_HEADERS_18.includes("error_details"));
  });

  test("3. Live Spreadsheet Verification: Enquiries tab headers match ENQUIRIES_HEADERS_18", async () => {
    const url = `https://docs.google.com/spreadsheets/d/${EXPECTED_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Enquiries`;
    const res = await fetch(url);
    assert.equal(res.status, 200, "Google Sheets CSV export should return HTTP 200");

    const text = await res.text();
    const firstLine = text.split("\n")[0];
    const liveHeaders = firstLine.split(",").map((s) => s.replace(/^"|"$/g, "").trim());

    assert.equal(liveHeaders.length, 18, "Live Enquiries tab must have 18 columns");
    assert.deepEqual(liveHeaders, Array.from(ENQUIRIES_HEADERS_18));
  });

  test("4. Live Spreadsheet Verification: Call_Outcomes tab headers match spreadsheet schema", async () => {
    const url = `https://docs.google.com/spreadsheets/d/${EXPECTED_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Call_Outcomes`;
    const res = await fetch(url);
    assert.equal(res.status, 200);

    const text = await res.text();
    const firstLine = text.split("\n")[0];
    const liveHeaders = firstLine.split(",").map((s) => s.replace(/^"|"$/g, "").trim());

    assert.equal(liveHeaders.length, 20, "Live Call_Outcomes tab must have 20 columns");
    assert.deepEqual(liveHeaders, Array.from(CALL_OUTCOMES_HEADERS_SPREADSHEET));
  });

  test("5. Live Spreadsheet Verification: Webhook_Events tab headers match spreadsheet schema", async () => {
    const url = `https://docs.google.com/spreadsheets/d/${EXPECTED_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Webhook_Events`;
    const res = await fetch(url);
    assert.equal(res.status, 200);

    const text = await res.text();
    const firstLine = text.split("\n")[0];
    const liveHeaders = firstLine.split(",").map((s) => s.replace(/^"|"$/g, "").trim());

    assert.equal(liveHeaders.length, 11, "Live Webhook_Events tab must have 11 columns");
    assert.deepEqual(liveHeaders, Array.from(WEBHOOK_EVENTS_HEADERS_SPREADSHEET));
  });

  test("6. Live Spreadsheet Verification: System_State tab headers match spreadsheet schema", async () => {
    const url = `https://docs.google.com/spreadsheets/d/${EXPECTED_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=System_State`;
    const res = await fetch(url);
    assert.equal(res.status, 200);

    const text = await res.text();
    const firstLine = text.split("\n")[0];
    const liveHeaders = firstLine.split(",").map((s) => s.replace(/^"|"$/g, "").trim());

    assert.equal(liveHeaders.length, 5, "Live System_State tab must have 5 columns");
    assert.deepEqual(liveHeaders, Array.from(SYSTEM_STATE_HEADERS_SPREADSHEET));
  });
});
