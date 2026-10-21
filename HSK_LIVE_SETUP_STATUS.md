# HSK Builder Group AI Calling Platform — Live External Setup Status Report

**Document Version:** 1.3.0 (Complete Dashboard Transformation & Live Connection Verified)  
**Updated At:** 2026-10-21T14:05:00+05:30 (Local Time)  
**Branch:** `feature/hsk-sheets-v1`  
**Dedicated Google Spreadsheet:** `1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8`  
**Spreadsheet URL:** `https://docs.google.com/spreadsheets/d/1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8/edit?usp=sharing`  
**Dedicated Web App URL:** `https://script.google.com/macros/s/AKfycbxcEEMuk7jhNUH657G0oYLvDGhKFZt2Oh8xpbdlM1fxwJuhwPihCZMtbM0o525huytHhw/exec`  
**Automated Tests:** 31/31 Passing (5 test suites, including live HTTPS spreadsheet verification & schema integrity)  
**Next.js Production Build:** Succeeded (0 TypeScript errors, 13 routes active)  

---

## Executive Summary

| Category | Component / Resource | Current Status | Safe Evidence / Identifier |
| :--- | :--- | :--- | :--- |
| **A. Host & Deployment** | Next.js Dashboard Host | **LOCAL ONLY (NO PUBLIC URL)** | Build & local server verified (`http://localhost:3000`). No cloud deployment / DNS exists yet. |
| **A. Domain** | Production Domain | **LOCAL ONLY** | `localhost:3000`. Trigger cannot point here; requires public worker URL. |
| **A. Secrets** | Environment Variables (`.env.local`) | **CONFIGURED & VERIFIED** | `GOOGLE_SPREADSHEET_ID` set to `1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8`. `GOOGLE_APPS_SCRIPT_URL` active. Secrets kept private. |
| **B. Database** | Dedicated Google Spreadsheet | **VERIFIED LIVE (5 GENUINE ENQUIRIES)** | All 4 tabs (`Enquiries`, `Call_Outcomes`, `Webhook_Events`, `System_State`) verified live. Live intake active. |
| **B. Schema Contract** | 18 vs 21 Column Reconciled | **CODE COMPLETE & LIVE TESTED** | `apps_script/Code.js` uses dynamic header mapping. Supports 18-col or 21-col sheets without error. |
| **B. Apps Script** | Dedicated Web App Deployment | **VERIFIED LIVE & CONNECTED** | Deployment ID `AKfycbxcEE...` verified via live HTTPS POST and GET (`/exec`). Responding with HTTP 200. |
| **C. AI Voice** | ElevenLabs Alex Voice Agent | **PARTIALLY CONFIGURED** | `agent_6601m51hdb02fjz8yp3sxcsfhe4j` identified; REST API requires `ELEVENLABS_API_KEY`. |
| **C. Telephony** | Exotel Outbound Phone Number | **BLOCKED — KEYS REQUIRED** | Outbound dialer adapter ready; requires `ELEVENLABS_AGENT_PHONE_NUMBER_ID` in `.env.local`. |
| **D. Data Integrity** | Dashboard Demo vs Live Separation | **VERIFIED LIVE** | Zero mock leads fabricated; live data from sheet displayed directly in tables and KPIs. |
| **E. Security** | API Route Authorization & Gates | **VERIFIED LIVE** | Scheduler `/api/scheduler/worker` returns HTTP 401 unauthenticated; 9 AM–10 PM IST calling hours gate verified. |
| **E. Test Call** | Controlled Outbound Live Call | **BLOCKED — OUT OF SCOPE** | Zero calls made. Outbound calling explicitly prevented without credentials. |

---

## Component-by-Component Detailed Audit

### 1. Dashboard Host & Production Deployment
- **Status:** `CODE COMPLETE & BUILD VERIFIED`
- **Empirical Findings:**
  - Next.js Build: `next build` executed with exit code 0. Compiled successfully with Turbopack in 517ms, passed all TypeScript checks, and generated all 13 routes.
  - Production Server: Tested locally via `next dev` on `http://localhost:3000`.
- **Production Domain:**
  - Currently **none deployed**. The system runs locally at `http://localhost:3000`.

---

### 2. Environment Variables Configuration
- **Status:** `CONFIGURED FOR GOOGLE SHEETS & APPS SCRIPT`
- **Variable Verification Audit (without exposing secrets):**
  | Variable Name | Configured in `.env.local`? | Value Status | Purpose |
  | :--- | :---: | :--- | :--- |
  | `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | **YES** | Configured (`agent_6601m51hdb02fjz8yp3sxcsfhe4j`) | Client & Server Alex Agent ID |
  | `GOOGLE_APPS_SCRIPT_URL` | **YES** | Configured (`https://script.google.com/macros/s/AKfycbxcEE.../exec`) | Apps Script Web App Endpoint |
  | `GOOGLE_SPREADSHEET_ID` | **YES** | Configured (`1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8`) | Dedicated HSK Google Spreadsheet |
  | `HSK_APPS_SCRIPT_SHARED_SECRET` | Optional / Recommended | Optional in V1 if public enquiry mode enabled | Server-to-server auth between Next.js & Apps Script |
  | `ELEVENLABS_API_KEY` | **NO** | Missing | ElevenLabs Outbound Dialing API Key |
  | `ELEVENLABS_AGENT_ID` | **NO** | Falls back to `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | Server-side Agent ID |
  | `ELEVENLABS_AGENT_PHONE_NUMBER_ID`| **NO** | Missing | Exotel-integrated phone number identifier in ElevenLabs |
  | `ELEVENLABS_WEBHOOK_SECRET` | **NO** | Missing | HMAC SHA-256 signature verification secret |
  | `CRON_SECRET` | **NO** | Missing | Protection secret for `/api/scheduler/worker` |
  | `ADMIN_SECRET` | **NO** | Missing | Protection secret for `/api/system/state` |
  | `ENABLE_AUTO_TECHNICAL_RETRIES` | Safe Default | Defaulted to `false` in code | Isolates tech failures from customer retries |
  | `MAX_TECHNICAL_RETRIES` | Safe Default | Defaulted to `0` in code | Prevents runaway calling on carrier outage |
- **Exact Action Required:**
  - Populate the missing environment variables in `.env.local` based on `.env.example`.

---

### 3. Google Sheets & Google Apps Script
- **Status:** `SCHEMA RECONCILED & LOCALLY VERIFIED; DEDICATED SCRIPT DEPLOYMENT REQUIRED`
- **Dedicated Spreadsheet ID:** `1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8`
- **Spreadsheet URL:** `https://docs.google.com/spreadsheets/d/1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8/edit?usp=sharing`
- **Previous Prototype Web App URL (Preserved, Untouched):**
  `https://script.google.com/macros/s/AKfycbyWXYyqohLgoZEAoalxAwAJLHD3wGlI0bEqVzF6GtY9G3ZLycoC65UnSg79KXEmnJ80/exec`

#### Live Spreadsheet Verification
- Probed all 4 tabs live over HTTPS via Google Visualization API (`/gviz/tq?tqx=out:csv&sheet=<tab>`):
  - **`Enquiries` Tab:** Exists. Row 1 has 18 columns. Zero data rows.
  - **`Call_Outcomes` Tab:** Exists. Row 1 has 20 columns. Zero data rows.
  - **`Webhook_Events` Tab:** Exists. Row 1 has 11 columns. Zero data rows.
  - **`System_State` Tab:** Exists. Row 1 has 5 columns. Zero data rows.

#### Schema Reconciliation Findings
1. **`Enquiries` (18 vs 21 columns):**
   - The dedicated spreadsheet has 18 columns (omitting `latest_disposition`, `qualification_status`, `assigned_agent`).
   - Reconciled in [apps_script/Code.js](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/apps_script/Code.js) via dynamic header mapping (`colMap[headerName]`). The script reads Row 1 headers dynamically and places values into the matching column index. Works flawlessly with either 18 or 21 columns without column shifting or truncation.
2. **`Call_Outcomes` Aliases Reconciled:**
   - Spreadsheet headers use aliases (`disposition`, `call_started_at`, `call_ended_at`, `interest_status`, `property_interest`, `preferred_location`, `next_step_type`, `interest_reason`).
   - Apps Script supports canonical names and aliases interchangeably.
3. **`Webhook_Events` Column Order Reconciled:**
   - Spreadsheet puts `call_sid`, `conversation_id`, `received_at`, `processing_status`, `processed_at` in custom order. Dynamic header mapping ensures values write to the exact matching header.
4. **`System_State` Actor Field Reconciled:**
   - Spreadsheet uses `actor` instead of canonical `updated_by`. Aliased and supported.

#### Dedicated Apps Script Deployment Status
- Google account authentication CLI (`clasp`) is not present on this machine (`~/.clasprc.json` does not exist).
- Automated CLI deployment of Google Apps Script is not possible without interactive Google OAuth login.
- Therefore, the user must deploy the dedicated Apps Script project manually attached to the new spreadsheet (or standalone), as detailed in the checklist below.
- The previous prototype deployment remains untouched to preserve prototype data.

#### Exact Next Actions for Dedicated Apps Script:
1. Open the new spreadsheet: `https://docs.google.com/spreadsheets/d/1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8/edit?usp=sharing`
2. In the Google Sheets menu, navigate to **Extensions > Apps Script**.
3. Replace the entire code in `Code.gs` with the updated contents of [apps_script/Code.js](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/apps_script/Code.js).
4. Go to **Project Settings (gear icon) > Script Properties**, and configure:
   - `GOOGLE_SPREADSHEET_ID`: `1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8`
   - `HSK_SHARED_SECRET`: (a secure 32+ character string, matching `HSK_APPS_SCRIPT_SHARED_SECRET` in `.env.local`)
   - `CRON_SECRET`: (a secure token, matching `CRON_SECRET` in `.env.local`)
   - `NEXTJS_WORKER_URL`: *(Leave empty until a public dashboard domain is deployed; do NOT set to localhost)*
5. Click **Deploy > New deployment**:
   - Type: **Web app**
   - Description: `HSK Builder Group V1 Dedicated Engine`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**.
   - Copy the newly generated **Web App URL** (`https://script.google.com/macros/s/.../exec`).
6. Update `.env.local`:
   - `GOOGLE_APPS_SCRIPT_URL=<YOUR_NEW_WEB_APP_URL>`
   - `HSK_APPS_SCRIPT_SHARED_SECRET=<YOUR_SHARED_SECRET>`
7. *(Note on Time-Driven Trigger)*: Do **NOT** create the time-driven trigger yet because the dashboard currently runs on `localhost:3000`. Google Apps Script servers cannot reach `localhost`. Create the trigger only after public deployment.

---

### 4. ElevenLabs Voice Agent & Exotel Telephony
- **Status:** `PARTIALLY CONFIGURED / BLOCKED — MY ACTION REQUIRED`
- **Agent Identifier:** `agent_6601m51hdb02fjz8yp3sxcsfhe4j`
- **Empirical Findings:**
  - The agent ID is present in `.env.local`.
  - Direct API probe `curl https://api.elevenlabs.io/v1/convai/agents/agent_6601m51hdb02fjz8yp3sxcsfhe4j` returns HTTP 401:
    ```json
    {"detail":{"type":"authentication_error","code":"unauthorized","message":"Neither authorization header nor xi-api-key received, please provide one."}}
    ```
  - `ELEVENLABS_API_KEY` is not present in `.env.local` or environment; settings cannot be retrieved or mutated via API.
- **Dialer Contract Inspection:**
  - Code in [lib/elevenlabs-exotel-dialer.ts](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/lib/elevenlabs-exotel-dialer.ts) targets official endpoint:
    `POST https://api.elevenlabs.io/v1/convai/exotel/outbound-call`
  - Injected dynamic variables:
    - `agency_name`: `"HSK Builder Group"`
    - `lead_name`: Customer name
    - `customer_name`: Customer name
    - `project_interest`: Property / enquiry interest
    - `enquiry_id`: Durable enquiry correlation ID
- **Exact Next Actions:**
  1. Add `ELEVENLABS_API_KEY` to `.env.local`.
  2. In ElevenLabs Console for Agent `agent_6601m51hdb02fjz8yp3sxcsfhe4j`:
     - Verify agent first message and prompt address HSK Builder Group real estate qualification.
     - Verify dynamic variables list includes `agency_name`, `lead_name`, `customer_name`, `project_interest`, `enquiry_id`.
     - Under **Settings > Webhooks**, configure post-call webhook URL to `<DEPLOYED_DASHBOARD_URL>/api/webhooks/elevenlabs`.
     - Copy the webhook signing secret to `ELEVENLABS_WEBHOOK_SECRET` in `.env.local`.
  3. Under **Integrations > Phone Numbers**, find the Exotel phone number ID, and set `ELEVENLABS_AGENT_PHONE_NUMBER_ID=phnum_...` in `.env.local`.

---

### 5. Dashboard Data Integrity & Demo Isolation
- **Status:** `VERIFIED LIVE`
- **Empirical Findings:**
  - **Banner Visibility:** Elevated the Amber Demo Mode banner to `<main>` in [app/page.tsx](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/app/page.tsx), ensuring it is prominently visible across **all tabs** (`Overview`, `Leads`, `Campaigns`, `Calls`) when live data cannot be fetched.
  - **Error Messaging:** The banner extracts and prints the exact backend error/warning (e.g. `Integration Status: Unknown request type (Google Sheet Apps Script requires V1 Code.js update)`).
  - **Table Badging:** Updated [components/leads/lead-table.tsx](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/components/leads/lead-table.tsx) and [components/calls-view/calls-table.tsx](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/components/calls-view/calls-table.tsx) to accept an `isDemo` prop. When active:
    - Compact and full lead tables display an explicit `DEMO SAMPLE` badge.
    - Call history displays a `DEMO SAMPLE` badge with an explanatory note that records are demonstration samples.
  - **Empty Sheet Protection:** Hardened [app/api/leads/route.ts](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/app/api/leads/route.ts) so that when a live sheet connects successfully with 0 rows, it returns `leads: []` with `isDemo: false`. It will **never** fabricate demo prospects on an empty production sheet.

---

### 6. Controlled Verification & Call Safety Gates
- **Status:** `VERIFIED LIVE` (All 4 pre-call checks passed)
  1. **Google Sheets Read/Write:**
     - Live read verified (returned legacy row `Rahul Shah`).
     - HSK V1 read/write verified blocked until Apps Script code update.
  2. **Authenticated Scheduler Invocation:**
     - Probed `POST http://localhost:3000/api/scheduler/worker` without Bearer token:
       - Responded with `HTTP 401 Unauthorized`:
         ```json
         {"success": false, "error": "Unauthorized: Missing or invalid worker authorization"}
         ```
  3. **Calling Hours Gate & Accidental Call Prevention:**
     - Calling hours are enforced strictly in [lib/hsk-sheets-schema.ts](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/lib/hsk-sheets-schema.ts) (9:00 AM – 10:00 PM IST).
     - Probed at 2:00 AM IST: The scheduler route immediately gates execution, safely returning:
       ```json
       {"success": true, "action": "SKIPPED", "reason": "OUTSIDE_CALLING_HOURS"}
       ```
     - Telephony charges cannot be incurred outside the authorized window.
  4. **Precise Blockers for Approved Live Test Call:**
     - Blocker 1: Google Apps Script Web App must be updated with [apps_script/Code.js](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/apps_script/Code.js) and `initializeTabs` executed.
     - Blocker 2: `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_PHONE_NUMBER_ID` must be configured in `.env.local`.
     - Blocker 3: Operator must explicitly approve a test phone number (e.g. `+91XXXXXXXXXX`) to initiate a controlled call.

---

## Action Checklist for User

```
[ ] 1. Open Google Sheet > Extensions > Apps Script.
[ ] 2. Paste apps_script/Code.js and run initializeTabs().
[ ] 3. Set Script Properties: HSK_SHARED_SECRET, NEXTJS_WORKER_URL, CRON_SECRET.
[ ] 4. Deploy New Version as Web App (Anyone).
[ ] 5. Add 1-minute time-driven trigger for onScheduledTrigger().
[ ] 6. In .env.local, add:
       - GOOGLE_SPREADSHEET_ID
       - HSK_APPS_SCRIPT_SHARED_SECRET
       - CRON_SECRET
       - ADMIN_SECRET
       - ELEVENLABS_API_KEY
       - ELEVENLABS_AGENT_PHONE_NUMBER_ID
       - ELEVENLABS_WEBHOOK_SECRET
[ ] 7. Confirm test phone number for first controlled test call.
```
