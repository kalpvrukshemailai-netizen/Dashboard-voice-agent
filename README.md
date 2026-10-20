# AI Calling Agent MVP — zero-cost browser voice + Google Sheets

This MVP avoids Twilio and paid PSTN telephony. It uses:

Google Sheet → Google Apps Script → Next.js dashboard → ElevenLabs browser widget → ElevenLabs post-call webhook → Google Apps Script → same Google Sheet row

## 1. ElevenLabs

- Published agent: `agent_5101m3dfq488edv8aqf47w7ahvyk`
- Widget enabled and public.
- Dynamic variables expected by the agent:
  - `lead_name`
  - `company_name`
  - `lead_phone`
  - `lead_notes`
  - `sheet_id`
  - `sheet_tab`
  - `sheet_row`
- Data Collection expected:
  - `lead_name`
  - `contact_number`
  - `property_interest`
  - `budget_range`
  - `preferred_location`
  - `next_step_type`
  - `interested`
  - `interest_status`
  - `interest_reason`
  - `timeline`

Configure a workspace post-call transcription webhook to the **same Apps Script Web App URL**. This means no ngrok or public Next.js webhook is needed.

## 2. Google Sheet columns

Use exactly:

`lead_name | phone | company_name | lead_notes | call_status | interested | interest_status | property_interest | budget_range | preferred_location | timeline | next_step_type | interest_reason | conversation_id | called_at`

Initially populate only the first four columns and set `call_status` to `Pending`.

## 3. Google Apps Script

In **Extensions → Apps Script**, replace the script with this:

```javascript
const DEFAULT_SHEET_NAME = "Sheet1";

function doGet() {
  return jsonResponse({ success: true, message: "AI Lead Calling API is running" });
}

function doPost(e) {
  try {
    const data = JSON.parse(e?.postData?.contents || "{}");

    if (data.type === "post_call_transcription") {
      return jsonResponse(handleElevenLabsWebhook(data));
    }

    if (data.action === "getLeads") {
      return jsonResponse(getLeads(
        String(data.spreadsheetId || ""),
        String(data.tab || DEFAULT_SHEET_NAME)
      ));
    }

    if (data.action === "updateLead") {
      return jsonResponse(updateLead(
        String(data.spreadsheetId || ""),
        String(data.tab || DEFAULT_SHEET_NAME),
        Number(data.sheetRow),
        data.updates || {}
      ));
    }

    throw new Error("Unknown action");
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function getSpreadsheet(spreadsheetId) {
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Spreadsheet ID is required");
  return active;
}

function getSheet(spreadsheetId, tab) {
  const sheet = getSpreadsheet(spreadsheetId).getSheetByName(tab);
  if (!sheet) throw new Error('Sheet tab "' + tab + '" not found');
  return sheet;
}

function normalizeHeader(value) {
  return String(value).trim().toLowerCase().replace(/\\s+/g, "_");
}

function getLeads(spreadsheetId, tab) {
  const sheet = getSheet(spreadsheetId, tab);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, leads: [] };

  const headers = values[0].map(normalizeHeader);
  const leads = values.slice(1)
    .map((row, index) => {
      const lead = { sheetRow: index + 2 };
      headers.forEach((header, col) => lead[header] = row[col] ?? "");
      return lead;
    })
    .filter(lead => String(lead.lead_name || "").trim() && String(lead.phone || "").trim());

  return { success: true, leads };
}

function updateLead(spreadsheetId, tab, sheetRow, updates) {
  if (!sheetRow || sheetRow < 2) throw new Error("Invalid sheet row");
  const sheet = getSheet(spreadsheetId, tab);
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(normalizeHeader);

  Object.keys(updates).forEach(key => {
    const index = headers.indexOf(normalizeHeader(key));
    if (index === -1) return;
    sheet.getRange(sheetRow, index + 1).setValue(updates[key] ?? "");
  });

  return { success: true, sheetRow };
}

function unwrap(value) {
  if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "value")) {
    return value.value;
  }
  return value;
}

function textValue(value) {
  const v = unwrap(value);
  return v == null ? "" : String(v);
}

function booleanValue(value) {
  const v = unwrap(value);
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true") return true;
    if (v.toLowerCase() === "false") return false;
  }
  return "";
}

function handleElevenLabsWebhook(event) {
  const data = event.data || {};
  const dynamic = (((data.conversation_initiation_client_data || {}).dynamic_variables) || {});
  const row = Number(dynamic.sheet_row);
  const spreadsheetId = String(dynamic.sheet_id || "");
  const tab = String(dynamic.sheet_tab || DEFAULT_SHEET_NAME);

  if (!spreadsheetId || !row) {
    return { success: true, ignored: true, reason: "Missing sheet mapping" };
  }

  const analysis = data.analysis || {};
  const collections = analysis.data_collection_results || {};

  updateLead(spreadsheetId, tab, row, {
    call_status: "completed",
    interested: booleanValue(collections.interested),
    interest_status: textValue(collections.interest_status),
    property_interest: textValue(collections.property_interest),
    budget_range: textValue(collections.budget_range),
    preferred_location: textValue(collections.preferred_location),
    timeline: textValue(collections.timeline),
    next_step_type: textValue(collections.next_step_type),
    interest_reason: textValue(collections.interest_reason),
    conversation_id: textValue(data.conversation_id),
    called_at: data.metadata && data.metadata.start_time_unix_secs
      ? new Date(Number(data.metadata.start_time_unix_secs) * 1000).toISOString()
      : new Date().toISOString()
  });

  return { success: true, updatedRow: row };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

After saving, use **Deploy → Manage deployments → Edit → New version → Deploy** so the existing Web App URL points to the new code. Keep the access setting that allows the endpoint to be called by the project/webhook.

## 4. ElevenLabs webhook

In ElevenLabs workspace/agent post-call webhook settings, configure the transcription webhook endpoint to the exact Apps Script Web App URL.

For this demo, HMAC verification can be left off initially. Harden it after the end-to-end flow works.

## 5. Environment

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_5101m3dfq488edv8aqf47w7ahvyk
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

No Google service-account JSON is needed.

## 6. Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Paste the **Google Sheet URL**, choose `Sheet1`, set the agency name, and click **Load Leads**.

Select a lead → **Call** → Start a call inside the ElevenLabs widget.

After the conversation ends, ElevenLabs sends the post-call transcription webhook directly to Apps Script. Apps Script uses `sheet_id`, `sheet_tab`, and `sheet_row` from the widget dynamic variables to update the exact lead row.

## Important

This is a browser voice demonstration, not a real PSTN phone dialer. It is intended for a zero-cost project/demo MVP.
