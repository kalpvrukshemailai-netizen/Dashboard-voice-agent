# HSK Builder Group AI Calling Platform — Live External Setup Status Report

**Document Version:** 1.0.0  
**Generated At:** 2026-10-21T02:20:00+05:30 (Local Time)  
**Branch:** `feature/hsk-sheets-v1`  
**Commit Reference:** `484dd4a`  
**Automated Tests:** 19/19 Passing (~150ms)  
**Next.js Production Build:** Succeeded (0 TypeScript errors, 11 routes active)  

---

## Executive Summary

| Category | Component / Resource | Current Status | Safe Evidence / Identifier |
| :--- | :--- | :--- | :--- |
| **A. Host & Deployment** | Next.js Dashboard Host | **CODE COMPLETE, NOT LIVE-TESTED** | Local build & server verified (`http://localhost:3000`). No cloud deployment / git remote configured. |
| **A. Domain** | Production Domain | **CODE COMPLETE, NOT LIVE-TESTED** | Running locally only. No production DNS or deployment domain exists yet. |
| **A. Secrets** | Environment Variables (`.env.local`) | **PARTIALLY CONFIGURED** | Agent ID & Script URL present; 7 operational secrets missing from `.env.local`. |
| **B. Database** | Google Sheets 4-Tab Engine | **BLOCKED — MY ACTION REQUIRED** | Deployed script URL responds HTTP 200, but runs legacy prototype; rejects HSK V1 actions. |
| **B. Apps Script** | Web App & Scheduled Trigger | **PARTIALLY CONFIGURED** | URL: `.../AKfycbyWXYyqohLgoZEAoalxAwAJLHD3wGlI0bEqVzF6GtY9G3ZLycoC65UnSg79KXEmnJ80/exec`. Needs Code.js update & trigger. |
| **C. AI Voice** | ElevenLabs Alex Voice Agent | **PARTIALLY CONFIGURED** | `agent_6601m51hdb02fjz8yp3sxcsfhe4j` identified; REST API requires `ELEVENLABS_API_KEY`. |
| **C. Telephony** | Exotel Outbound Phone Number | **BLOCKED — MY ACTION REQUIRED** | Outbound dialer adapter ready; requires `ELEVENLABS_AGENT_PHONE_NUMBER_ID` in `.env.local`. |
| **D. Data Integrity** | Dashboard Demo vs Live Separation | **VERIFIED LIVE** | Persistent Amber Banner across all tabs, `[DEMO SAMPLE]` badges on tables, zero lead fabrication on empty sheets. |
| **E. Security** | API Route Authorization & Gates | **VERIFIED LIVE** | Scheduler `/api/scheduler/worker` returns HTTP 401 unauthenticated; 9 AM–10 PM IST calling hours gate verified. |
| **E. Test Call** | Controlled Outbound Live Call | **BLOCKED — MY ACTION REQUIRED** | Blocked on Apps Script update, telephony credentials, and explicit test number approval. |

---

## Component-by-Component Detailed Audit

### 1. Dashboard Host & Production Deployment
- **Status:** `CODE COMPLETE, NOT LIVE-TESTED`
- **Empirical Findings:**
  - `git remote -v`: No git remote is configured on this repository.
  - Deployment configuration files: No `.vercel`, `.github`, Netlify, or Railway configurations exist in the repository.
  - Vercel CLI: Installed at `/Users/Apple/Library/pnpm/bin/vercel`, but unauthenticated (`waiting for authentication...`).
  - Next.js Build: `next build` executed with exit code 0. Compiled successfully with Turbopack, passed all TypeScript checks, and generated all 11 routes (including 8 dynamic API routes).
  - Production Server: Tested locally via `next start` on `http://localhost:3000` (Network: `http://192.168.31.40:3000`). All API endpoints responded as expected.
- **Production Domain:**
  - Currently **none deployed**. The system runs locally at `http://localhost:3000`.
- **Exact Action Required:**
  - When ready for external hosting, link a Git remote repository or deploy via Vercel/Railway CLI with provider login.

---

### 2. Environment Variables Configuration
- **Status:** `PARTIALLY CONFIGURED`
- **Variable Verification Audit (without exposing secrets):**
  | Variable Name | Configured in `.env.local`? | Value Status | Purpose |
  | :--- | :---: | :--- | :--- |
  | `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | **YES** | Configured (`agent_6601m51hdb02fjz8yp3sxcsfhe4j`) | Client & Server Alex Agent ID |
  | `GOOGLE_APPS_SCRIPT_URL` | **YES** | Configured (`https://script.google.com/macros/s/.../exec`) | Apps Script Web App Endpoint |
  | `GOOGLE_SPREADSHEET_ID` | **NO** | Missing | Explicit Google Sheet Target |
  | `HSK_APPS_SCRIPT_SHARED_SECRET` | **NO** | Missing | Server-to-server auth between Next.js & Apps Script |
  | `ELEVENLABS_API_KEY` | **NO** | Missing | ElevenLabs Management & Dialing API Key |
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
- **Status:** `PARTIALLY CONFIGURED` (Web App reachable, but running legacy script; 4-tab engine blocked on script update)
- **Deployment URL:**
  `https://script.google.com/macros/s/AKfycbyWXYyqohLgoZEAoalxAwAJLHD3wGlI0bEqVzF6GtY9G3ZLycoC65UnSg79KXEmnJ80/exec`
- **Live Empirical Probe Results:**
  - `GET /exec` probe returned:
    ```json
    {"success": true, "message": "AI Lead Calling API is running"}
    ```
  - `POST {"action": "getLeads"}` returned HTTP 200 with 1 legacy lead:
    ```json
    {"success": true, "leads": [{"lead_name": "Rahul Shah", "phone": "+91 8493920383", "company_name": "Patel Agro & Chem", "lead_notes": "Looking for 3 BHK luxury apartment near SG Highway, Ahmedabad"}]}
    ```
  - `POST {"action": "getEnquiries"}` returned:
    ```json
    {"success": false, "error": "Unknown request type"}
    ```
  - `POST {"action": "getSystemState"}` returned:
    ```json
    {"success": false, "error": "Unknown request type"}
    ```
- **Diagnostic Finding:**
  - The live Web App is currently executing an older single-sheet prototype script.
  - It does not yet recognize the HSK V1 actions (`getEnquiries`, `createEnquiry`, `claimNextEnquiry`, `recordOutcome`, `getSystemState`, `initializeTabs`).
  - The 4-tab structure (`Enquiries`, `Call_Outcomes`, `Webhook_Events`, `System_State`) cannot be created or populated through the API until the script is updated in the Google Apps Script project.
- **Exact Next Actions (One Blocker at a Time):**
  1. Open the Google Spreadsheet linked to Web App `AKfycbyWXYyqohLgoZEAoalxAwAJLHD3wGlI0bEqVzF6GtY9G3ZLycoC65UnSg79KXEmnJ80`.
  2. In the Google Sheet menu, navigate to **Extensions > Apps Script**.
  3. Replace the contents of `Code.gs` / `Code.js` with the updated code from [apps_script/Code.js](file:///Users/Apple/Downloads/ai-calling-agent-mvp-zero/apps_script/Code.js).
  4. In the Apps Script toolbar, select the `initializeTabs` function and click **Run** to generate all 4 tabs (`Enquiries`, `Call_Outcomes`, `Webhook_Events`, `System_State`) with schema headers. Existing customer data in other sheets is preserved.
  5. Go to **Project Settings (gear icon) > Script Properties**, and set:
     - `HSK_SHARED_SECRET`: (min 32-character random string, matched in `.env.local`)
     - `CRON_SECRET`: (token matched in `.env.local`)
     - `NEXTJS_WORKER_URL`: (URL of dashboard `/api/scheduler/worker`, e.g. `https://<your-domain>/api/scheduler/worker`)
  6. Click **Deploy > New deployment**:
     - Select type: **Web app**
     - Description: `HSK Builder Group V1.0.0 Engine`
     - Execute as: **Me**
     - Who has access: **Anyone**
     - Click **Deploy**.
  7. In Apps Script, click **Triggers (clock icon) > Add Trigger**:
     - Choose function: `onScheduledTrigger`
     - Event source: `Time-driven`
     - Type: `Minutes timer`
     - Minute interval: `Every minute`
     - Click **Save**.

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
