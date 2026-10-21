/**
 * ============================================================================
 * HSK Builder Group AI Calling Platform & Real Estate Web Backend
 * Google Apps Script Backend (Version 1 — Production Hardened & Unified)
 *
 * Dedicated Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8/edit
 *
 * System of Record: Google Spreadsheet with 4 Tabs:
 * 1. Enquiries       (gid: 0)
 * 2. Call_Outcomes  (gid: 1001)
 * 3. Webhook_Events (gid: 1002)
 * 4. System_State   (gid: 1003)
 * ============================================================================
 */

// Global Constants & Sheet Tab Names
var TABS = {
  ENQUIRIES: "Enquiries",
  CALL_OUTCOMES: "Call_Outcomes",
  WEBHOOK_EVENTS: "Webhook_Events",
  SYSTEM_STATE: "System_State"
};

// Global Configuration
var CONFIG = {
  DEFAULT_SPREADSHEET_ID: "1a4sfmK6faPs9QR3-_0fQzksn49epumoTbzwas2tnfv8",
  TIMEZONE: "Asia/Kolkata", // Indian Standard Time (UTC+05:30)
  LOCK_TIMEOUT_MS: 10000,
  ALLOW_PUBLIC_ENQUIRIES: true // Permits public website inquiries without client-side secret exposure
};

// Canonical Sheet Header Schemas (Supports both 18-col and 21-col variants dynamically)
var HEADERS = {
  ENQUIRIES_21: [
    "enquiry_id", "created_at", "customer_name", "phone_number",
    "project_interest", "source", "utm_campaign", "customer_notes",
    "queue_class", "current_status", "attempt_sequence_count",
    "customer_no_answer_count", "technical_failures_count",
    "last_call_at", "next_retry_at", "latest_disposition",
    "qualification_status", "active_session_id", "assigned_agent",
    "latest_outcome_id", "error_details"
  ],
  ENQUIRIES_18: [
    "enquiry_id", "created_at", "customer_name", "phone_number",
    "project_interest", "source", "utm_campaign", "customer_notes",
    "queue_class", "current_status", "attempt_sequence_count",
    "customer_no_answer_count", "technical_failures_count",
    "last_call_at", "next_retry_at", "active_session_id",
    "latest_outcome_id", "error_details"
  ],
  ENQUIRIES: [
    "enquiry_id", "created_at", "customer_name", "phone_number",
    "project_interest", "source", "utm_campaign", "customer_notes",
    "queue_class", "current_status", "attempt_sequence_count",
    "customer_no_answer_count", "technical_failures_count",
    "last_call_at", "next_retry_at", "latest_disposition",
    "qualification_status", "active_session_id", "assigned_agent",
    "latest_outcome_id", "error_details"
  ],
  CALL_OUTCOMES: [
    "outcome_id", "enquiry_id", "attempt_sequence", "customer_attempt_number",
    "channel", "call_sid", "conversation_id", "call_start_time",
    "duration_seconds", "call_disposition", "interested", "property_config",
    "budget_range", "timeline", "site_visit", "dnd_requested",
    "qualification_summary", "recording_url", "transcript_summary", "recorded_at"
  ],
  CALL_OUTCOMES_SPREADSHEET: [
    "outcome_id", "enquiry_id", "attempt_sequence", "channel",
    "call_sid", "conversation_id", "call_started_at", "call_ended_at",
    "duration_seconds", "disposition", "interested", "interest_status",
    "property_interest", "budget_range", "preferred_location", "timeline",
    "next_step_type", "interest_reason", "qualification_status", "transcript_summary"
  ],
  WEBHOOK_EVENTS: [
    "event_id", "received_at", "provider", "event_type",
    "idempotency_key", "enquiry_id", "conversation_id", "call_sid",
    "processing_status", "error_details", "raw_payload"
  ],
  WEBHOOK_EVENTS_SPREADSHEET: [
    "event_id", "provider", "event_type", "idempotency_key",
    "enquiry_id", "call_sid", "conversation_id", "received_at",
    "processing_status", "processed_at", "raw_payload"
  ],
  SYSTEM_STATE: [
    "state_key", "state_value", "updated_at", "updated_by", "notes"
  ],
  SYSTEM_STATE_SPREADSHEET: [
    "state_key", "state_value", "updated_at", "actor", "notes"
  ]
};

var CALLING_HOURS = {
  START_HOUR_IST: 9,   // 9:00 AM IST
  END_HOUR_IST: 22     // 10:00 PM IST (inclusive of 21:59)
};

// -------------------------------------------------------------
// Authentication & Security (Server-to-Server Shared Secret)
// -------------------------------------------------------------

function getSharedSecret() {
  return PropertiesService.getScriptProperties().getProperty("HSK_SHARED_SECRET") || "";
}

/**
 * Verifies authorization for protected actions.
 * Public enquiry submissions from the website frontend are permitted without exposing secrets.
 */
function verifyAuthorization(payload, parameter, action, e) {
  // Public actions do not require server secret if public submissions are permitted
  var isPublicAction = (action === "createEnquiry" || action === "create_enquiry" || action === "submit_enquiry" || action === "new_enquiry" || action === "health" || action === "ping");
  if (isPublicAction && CONFIG.ALLOW_PUBLIC_ENQUIRIES) {
    return true;
  }

  var configuredSecret = getSharedSecret();
  // If no secret configured in ScriptProperties, allow initial setup
  if (!configuredSecret) {
    return true;
  }

  var provided = (payload && (payload.shared_secret || payload.secret || payload.auth_token)) ||
                 (parameter && (parameter.shared_secret || parameter.secret || parameter.auth_token));

  // Also check request headers (e.g. x-hsk-secret or Authorization)
  if (!provided && e && e.headers) {
    provided = e.headers["x-hsk-secret"] || e.headers["X-HSK-Secret"] || e.headers["authorization"] || e.headers["Authorization"];
    if (provided && provided.toLowerCase().indexOf("bearer ") === 0) {
      provided = provided.substring(7);
    }
  }

  return provided === configuredSecret;
}

/**
 * HTTP Entrypoint: POST
 * Handles action dispatching for Website Backend, 11Labs Outbound Caller, and Operational Dashboard
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for lock
    if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
      return jsonResponse({ success: false, error: "Server busy: Could not acquire script lock" }, 503);
    }

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        // Fallback for form-encoded payload
        if (e.parameter) {
          payload = e.parameter;
        } else {
          return jsonResponse({ success: false, error: "Invalid JSON payload" }, 400);
        }
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = normalizeActionName(payload.action || (e && e.parameter ? e.parameter.action : ""));

    // Default to createEnquiry if lead fields are present without an explicit action
    if (!action && (payload.customer_name || payload.name || payload.phone_number || payload.phone || payload.enquiry)) {
      action = "createEnquiry";
    }
    if (!action) {
      action = "health";
    }

    // 1. Authenticate Request
    if (!verifyAuthorization(payload, e ? e.parameter : null, action, e)) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid or missing shared secret" }, 401);
    }

    var ss = getSpreadsheet(payload.spreadsheetId || (e && e.parameter ? e.parameter.spreadsheetId : null));

    var result;
    switch (action) {
      case "initializeTabs":
        result = handleInitializeTabs(ss);
        break;
      case "getEnquiries":
        result = handleGetEnquiries(ss, payload);
        break;
      case "getCallOutcomes":
        result = handleGetCallOutcomes(ss, payload);
        break;
      case "getWebhookEvents":
        result = handleGetWebhookEvents(ss, payload);
        break;
      case "createEnquiry":
        result = handleCreateEnquiry(ss, payload);
        break;
      case "claimNextEnquiry":
        result = handleClaimNextEnquiry(ss, payload);
        break;
      case "recordOutcome":
        result = handleRecordOutcome(ss, payload);
        break;
      case "recordWebhookEvent":
        result = handleRecordWebhookEvent(ss, payload);
        break;
      case "acquireDialerLock":
        result = handleAcquireDialerLock(ss, payload);
        break;
      case "releaseDialerLock":
        result = handleReleaseDialerLock(ss, payload);
        break;
      case "getSystemState":
        result = handleGetSystemState(ss);
        break;
      case "updateSystemState":
        result = handleUpdateSystemState(ss, payload);
        break;
      case "reconcileStaleLocks":
        result = handleReconcileStaleLocks(ss, payload);
        break;
      case "health":
        result = {
          success: true,
          service: "HSK Builder Group AI Calling & Real Estate Backend",
          version: "1.2.0",
          calling_window_open: isCallingWindowOpen(),
          timestamp: new Date().toISOString()
        };
        break;
      default:
        result = { success: false, error: "Unknown action: " + action };
        break;
    }

    return jsonResponse(result);
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString() + " Stack: " + error.stack);
    return jsonResponse({
      success: false,
      error: error.message || String(error),
      stack: error.stack
    }, 500);
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

/**
 * HTTP Entrypoint: GET
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = normalizeActionName(params.action || "health");

    // Authenticate GET requests if parameter contains commands or queries
    if (!verifyAuthorization(null, params, action, e)) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid or missing shared secret" }, 401);
    }

    var ss = getSpreadsheet(params.spreadsheetId);
    var systemState = handleGetSystemState(ss);
    var isWindowOpen = isCallingWindowOpen();

    if (action === "getEnquiries") {
      var enquiriesResult = handleGetEnquiries(ss, params);
      return jsonResponse(enquiriesResult);
    }

    if (action === "getCallOutcomes") {
      var outcomesResult = handleGetCallOutcomes(ss, params);
      return jsonResponse(outcomesResult);
    }

    if (action === "getSystemState") {
      return jsonResponse(systemState);
    }

    return jsonResponse({
      success: true,
      service: "HSK Builder Group AI Calling Backend",
      version: "1.2.0",
      calling_window_open: isWindowOpen,
      system_state: systemState.data,
      spreadsheet_id: ss.getId(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

/**
 * Preflight CORS OPTIONS handler
 */
function doOptions(e) {
  return jsonResponse({ success: true });
}

/**
 * Normalizes action names to support both camelCase and snake_case variants
 */
function normalizeActionName(action) {
  if (!action) return "";
  var cleaned = String(action).trim();
  var map = {
    "initializetabs": "initializeTabs",
    "initialize_tabs": "initializeTabs",
    "getenquiries": "getEnquiries",
    "get_enquiries": "getEnquiries",
    "read_enquiries": "getEnquiries",
    "list_enquiries": "getEnquiries",
    "getcalloutcomes": "getCallOutcomes",
    "get_call_outcomes": "getCallOutcomes",
    "list_call_outcomes": "getCallOutcomes",
    "getwebhookevents": "getWebhookEvents",
    "get_webhook_events": "getWebhookEvents",
    "createenquiry": "createEnquiry",
    "create_enquiry": "createEnquiry",
    "submitenquiry": "createEnquiry",
    "submit_enquiry": "createEnquiry",
    "new_enquiry": "createEnquiry",
    "claimnextenquiry": "claimNextEnquiry",
    "claim_next_enquiry": "claimNextEnquiry",
    "claim_queue_item": "claimNextEnquiry",
    "claim_enquiry": "claimNextEnquiry",
    "recordoutcome": "recordOutcome",
    "record_outcome": "recordOutcome",
    "log_outcome": "recordOutcome",
    "recordwebhookevent": "recordWebhookEvent",
    "record_webhook_event": "recordWebhookEvent",
    "webhook_event": "recordWebhookEvent",
    "acquiredialerlock": "acquireDialerLock",
    "acquire_dialer_lock": "acquireDialerLock",
    "releasedialerlock": "releaseDialerLock",
    "release_dialer_lock": "releaseDialerLock",
    "release_claim": "releaseDialerLock",
    "getsystemstate": "getSystemState",
    "get_system_state": "getSystemState",
    "updatesystemstate": "updateSystemState",
    "update_system_state": "updateSystemState",
    "reconcilestalelocks": "reconcileStaleLocks",
    "reconcile_stale_locks": "reconcileStaleLocks",
    "health": "health",
    "ping": "health"
  };
  return map[cleaned.toLowerCase()] || cleaned;
}

// -------------------------------------------------------------
// Spreadsheet and Tab Management
// -------------------------------------------------------------

function getSpreadsheet(spreadsheetId) {
  var id = spreadsheetId ||
           PropertiesService.getScriptProperties().getProperty("GOOGLE_SPREADSHEET_ID") ||
           PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") ||
           CONFIG.DEFAULT_SPREADSHEET_ID;

  if (id && String(id).trim().length > 0) {
    try {
      return SpreadsheetApp.openById(String(id).trim());
    } catch (e) {
      Logger.log("openById failed for " + id + ": " + e.message + ". Falling back to active spreadsheet.");
    }
  }

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }
  throw new Error("No Google Spreadsheet configured. Set GOOGLE_SPREADSHEET_ID in ScriptProperties or verify spreadsheet permissions.");
}

function handleInitializeTabs(ss) {
  var created = [];
  var existing = [];

  for (var tabKey in TABS) {
    var tabName = TABS[tabKey];
    var sheet = ss.getSheetByName(tabName);
    var expectedHeaders = HEADERS[tabKey] || HEADERS[tabKey + "_SPREADSHEET"] || HEADERS.ENQUIRIES_18;

    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
      created.push(tabName);
    } else {
      existing.push(tabName);
      // If sheet exists but is completely empty (0 rows), set headers
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
      }
    }

    // Initialize default rows for System_State if not populated
    if (tabName === TABS.SYSTEM_STATE) {
      if (sheet.getLastRow() <= 1) {
        var now = new Date().toISOString();
        var defaultState = [
          ["DIALER_LOCK", JSON.stringify({ locked: false, session_id: null, enquiry_id: null, locked_at: null }), now, "SYSTEM_INIT", "Dialer concurrency lock"],
          ["ACTIVE_SESSION", JSON.stringify({ active: false, session_id: null }), now, "SYSTEM_INIT", "In-flight call session"],
          ["SCHEDULER_HEARTBEAT", now, now, "SYSTEM_INIT", "Last queue worker run"],
          ["OPERATIONAL_ALERT", JSON.stringify({ alert: null, timestamp: null }), now, "SYSTEM_INIT", "Operational circuit breaker"]
        ];
        sheet.getRange(2, 1, defaultState.length, 5).setValues(defaultState);
      }
    }
  }

  return {
    success: true,
    message: "Tabs verified and initialized successfully",
    spreadsheet_id: ss.getId(),
    created: created,
    existing: existing
  };
}

// -------------------------------------------------------------
// Calling Window Helper (9:00 AM - 10:00 PM Asia/Kolkata)
// -------------------------------------------------------------

function isCallingWindowOpen(date) {
  var d = date || new Date();
  var istHourString = Utilities.formatDate(d, CONFIG.TIMEZONE, "HH");
  var hour = parseInt(istHourString, 10);
  return hour >= CALLING_HOURS.START_HOUR_IST && hour < CALLING_HOURS.END_HOUR_IST;
}

function getNextCallingWindowStartIso() {
  var now = new Date();
  var istDateStr = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  var hour = parseInt(istDateStr.substring(11, 13), 10);

  // If before 9 AM today, schedule for today at 9 AM; otherwise next morning
  var targetDayOffset = (hour < CALLING_HOURS.START_HOUR_IST) ? 0 : 1;
  var targetDate = new Date(now.getTime() + (targetDayOffset * 24 * 60 * 60 * 1000));
  var datePrefix = Utilities.formatDate(targetDate, CONFIG.TIMEZONE, "yyyy-MM-dd");

  return datePrefix + "T09:00:00+05:30";
}

// -------------------------------------------------------------
// 1. Enquiries Intake & Retrieval
// -------------------------------------------------------------

function handleGetEnquiries(ss, payload) {
  var sheet = ss.getSheetByName(TABS.ENQUIRIES);
  if (!sheet) {
    return { success: false, error: "Enquiries sheet not found. Run initializeTabs first." };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, count: 0, enquiries: [] };
  }

  var headers = data[0];
  var enquiries = [];
  var limit = payload && payload.limit ? Number(payload.limit) : 100;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // Skip empty rows

    var record = {};
    for (var h = 0; h < headers.length; h++) {
      record[headers[h]] = row[h];
    }
    enquiries.push(record);
  }

  // Filter if status or queue_class requested
  if (payload && payload.status) {
    enquiries = enquiries.filter(function(e) { return e.current_status === payload.status; });
  }
  if (payload && payload.queue_class) {
    enquiries = enquiries.filter(function(e) { return e.queue_class === payload.queue_class; });
  }

  return {
    success: true,
    count: enquiries.length,
    enquiries: enquiries.slice(0, limit)
  };
}

/**
 * Retrieves Call Outcomes from the Call_Outcomes tab
 */
function handleGetCallOutcomes(ss, payload) {
  var sheet = ss.getSheetByName(TABS.CALL_OUTCOMES);
  if (!sheet) {
    return { success: true, count: 0, outcomes: [] };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, count: 0, outcomes: [] };
  }

  var headers = data[0];
  var outcomes = [];
  var limit = payload && payload.limit ? Number(payload.limit) : 100;
  var enquiryId = payload && payload.enquiry_id ? String(payload.enquiry_id).trim() : "";

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    var record = {};
    for (var h = 0; h < headers.length; h++) {
      record[headers[h]] = row[h];
    }

    if (enquiryId && record.enquiry_id !== enquiryId) {
      continue;
    }

    outcomes.push(record);
  }

  return {
    success: true,
    count: outcomes.length,
    outcomes: outcomes.slice(0, limit)
  };
}

/**
 * Retrieves logged webhook events from the Webhook_Events tab
 */
function handleGetWebhookEvents(ss, payload) {
  var sheet = ss.getSheetByName(TABS.WEBHOOK_EVENTS);
  if (!sheet) {
    return { success: true, count: 0, events: [] };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, count: 0, events: [] };
  }

  var headers = data[0];
  var events = [];
  var limit = payload && payload.limit ? Number(payload.limit) : 100;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    var record = {};
    for (var h = 0; h < headers.length; h++) {
      record[headers[h]] = row[h];
    }
    events.push(record);
  }

  return {
    success: true,
    count: events.length,
    events: events.slice(0, limit)
  };
}

/**
 * Creates an enquiry record.
 * Supports Website form contract (name, phone, email, propertyId, preferredDate)
 * and direct API contracts (customer_name, phone_number, project_interest, etc.).
 */
function handleCreateEnquiry(ss, payload) {
  var sheet = ss.getSheetByName(TABS.ENQUIRIES);
  if (!sheet) {
    handleInitializeTabs(ss);
    sheet = ss.getSheetByName(TABS.ENQUIRIES);
  }

  var raw = payload.enquiry || payload.data || payload;

  // Field extraction with camelCase & snake_case compatibility
  var customerName = raw.customer_name || raw.name || raw.fullName || "";
  var phoneNumber = raw.phone_number || raw.phone || raw.mobile || "";
  var email = raw.email || "";
  var projectInterest = raw.project_interest || raw.propertyId || raw.property_interest || raw.property || "General";
  var preferredDate = raw.preferredDate || raw.preferred_date || raw.visitDate || "";

  if (!customerName || !phoneNumber) {
    return { success: false, error: "customer_name (or name) and phone_number (or phone) are required" };
  }

  var cleanPhone = normalizePhoneNumber(phoneNumber);
  var nowIso = raw.created_at || new Date().toISOString();

  // Supplementary Customer Notes compilation
  var notes = raw.customer_notes || raw.notes || "";
  var extraDetails = [];
  if (email) extraDetails.push("Email: " + email);
  if (preferredDate) extraDetails.push("Preferred Visit: " + preferredDate);
  if (raw.consent !== undefined) extraDetails.push("Consent: " + (raw.consent ? "YES" : "NO"));

  if (extraDetails.length > 0) {
    notes = notes ? (notes + " | " + extraDetails.join(" | ")) : extraDetails.join(" | ");
  }

  // Check for existing pending/active enquiry with same phone or same enquiry_id to avoid duplicates
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var phoneIdx = headers.indexOf("phone_number");
  var statusIdx = headers.indexOf("current_status");
  var idIdx = headers.indexOf("enquiry_id");

  var incomingId = raw.enquiry_id || raw.id || "";

  for (var i = 1; i < data.length; i++) {
    var existingId = idIdx !== -1 ? String(data[i][idIdx]).trim() : "";
    var existingPhone = phoneIdx !== -1 ? String(data[i][phoneIdx]).trim() : "";
    var existingStatus = statusIdx !== -1 ? String(data[i][statusIdx]).trim() : "";

    // 1. Exact ID duplicate
    if (incomingId && existingId === incomingId) {
      return {
        success: true,
        is_duplicate: true,
        message: "Enquiry already exists with this enquiry_id (idempotent)",
        enquiry_id: existingId
      };
    }

    // 2. Active lead with same phone
    if (existingPhone === cleanPhone && (existingStatus === "NEW" || existingStatus === "QUEUED" || existingStatus === "CALLING" || existingStatus === "PENDING_CALL" || existingStatus === "RETRY_SCHEDULED")) {
      return {
        success: true,
        is_duplicate: true,
        message: "Enquiry already queued/active for this phone number",
        enquiry_id: existingId || data[i][0]
      };
    }
  }

  var enquiryId = incomingId || generateEnquiryId(data.length);
  var inWindow = isCallingWindowOpen();
  var queueClass = raw.queue_class || (inWindow ? "FRESH" : "BACKLOG");
  var currentStatus = inWindow ? "PENDING_CALL" : "QUEUED";
  var nextRetryAt = inWindow ? "" : getNextCallingWindowStartIso();

  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    colMap[headers[h]] = h;
  }

  // Build row dynamically matching the sheet's actual header names (supports 18-col, 21-col, or custom order)
  var newRow = new Array(headers.length).fill("");
  var setVal = function(headerName, val) {
    if (colMap[headerName] !== undefined) {
      newRow[colMap[headerName]] = val;
    }
  };

  setVal("enquiry_id", enquiryId);
  setVal("created_at", nowIso);
  setVal("customer_name", customerName.trim());
  setVal("phone_number", cleanPhone);
  setVal("project_interest", projectInterest.trim());
  setVal("source", (raw.source || "hsk-website").trim());
  setVal("utm_campaign", (raw.utm_campaign || raw.campaign || "direct-web").trim());
  setVal("customer_notes", notes.trim());
  setVal("queue_class", queueClass);
  setVal("current_status", currentStatus);
  setVal("attempt_sequence_count", 0);
  setVal("customer_no_answer_count", 0);
  setVal("technical_failures_count", 0);
  setVal("last_call_at", "");
  setVal("next_retry_at", nextRetryAt);
  setVal("latest_disposition", "");
  setVal("qualification_status", "");
  setVal("active_session_id", "");
  setVal("assigned_agent", raw.assigned_agent || "");
  setVal("latest_outcome_id", "");
  setVal("error_details", "");

  sheet.appendRow(newRow);

  return {
    success: true,
    enquiry_id: enquiryId,
    queue_class: queueClass,
    current_status: currentStatus,
    in_calling_window: inWindow,
    next_retry_at: nextRetryAt
  };
}

// -------------------------------------------------------------
// 2. Queue Coordinator & Priority Claiming
// -------------------------------------------------------------

function handleClaimNextEnquiry(ss, payload) {
  // 1. Calling Window Check
  if (!isCallingWindowOpen() && !(payload && payload.bypass_calling_window)) {
    return {
      success: true,
      claimed: false,
      reason: "CALLING_WINDOW_CLOSED",
      message: "Outside 9:00 AM - 10:00 PM IST calling window",
      next_window_start: getNextCallingWindowStartIso()
    };
  }

  // 2. Check Dialer Lock in System_State
  var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
  var dialerLock = getSystemStateValue(stateSheet, "DIALER_LOCK");
  if (dialerLock && dialerLock.locked) {
    // Production Safety Rule: NEVER release an active dialer lock solely due to age!
    var lockedTime = dialerLock.locked_at ? new Date(dialerLock.locked_at).getTime() : 0;
    var nowTime = new Date().getTime();
    var elapsedMs = nowTime - lockedTime;
    var isProlonged = elapsedMs >= 15 * 60 * 1000;

    if (isProlonged) {
      setSystemStateValue(stateSheet, "OPERATIONAL_ALERT", {
        alert: "DIALER_LOCK_PROLONGED",
        session_id: dialerLock.session_id,
        enquiry_id: dialerLock.enquiry_id,
        locked_at: dialerLock.locked_at,
        elapsed_minutes: Math.round(elapsedMs / 60000),
        message: "Active call lock held over 15 minutes. Requires verified provider status or authorized operator reconciliation."
      }, "MONITOR");
    }

    return {
      success: true,
      claimed: false,
      reason: "DIALER_BUSY",
      active_session: dialerLock.session_id,
      locked_at: dialerLock.locked_at,
      requires_operator_reconciliation: isProlonged
    };
  }

  // 3. Scan Enquiries and find eligible candidates
  var enqSheet = ss.getSheetByName(TABS.ENQUIRIES);
  var data = enqSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, claimed: false, reason: "QUEUE_EMPTY" };
  }

  var headers = data[0];
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    colMap[headers[h]] = h;
  }

  var nowIso = new Date().toISOString();
  var freshCandidates = [];
  var retryCandidates = [];
  var backlogCandidates = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var status = row[colMap["current_status"]];
    var qClass = row[colMap["queue_class"]];
    var noAnswerCount = Number(row[colMap["customer_no_answer_count"]] || 0);
    var techFailCount = Number(row[colMap["technical_failures_count"]] || 0);
    var nextRetryAt = row[colMap["next_retry_at"]];
    var createdAt = row[colMap["created_at"]];

    // Exclude terminal / suppressed states
    if (status === "DO_NOT_CALL" || status === "QUALIFIED" || status === "DISQUALIFIED" || status === "NOT_ANSWERED" || status === "CALLING" || status === "DIALING" || status === "FAILED_TECHNICAL" || status === "CONVERTED_INTERESTED" || status === "CLOSED_NOT_INTERESTED" || status === "EXHAUSTED_NO_ANSWER") {
      continue;
    }
    if (noAnswerCount >= 3) {
      continue;
    }

    var item = {
      rowIndex: r + 1, // 1-indexed spreadsheet row
      enquiry_id: row[colMap["enquiry_id"]],
      created_at: createdAt,
      next_retry_at: nextRetryAt,
      customer_name: row[colMap["customer_name"]],
      phone_number: row[colMap["phone_number"]],
      project_interest: row[colMap["project_interest"]],
      attempt_sequence_count: Number(row[colMap["attempt_sequence_count"]] || 0),
      customer_no_answer_count: noAnswerCount,
      technical_failures_count: techFailCount
    };

    // Priority 1: Fresh enquiries (NEW or QUEUED or PENDING_CALL with FRESH)
    if ((status === "NEW" || status === "QUEUED" || status === "PENDING_CALL") && (qClass === "FRESH" || !qClass || qClass === "NEW")) {
      freshCandidates.push(item);
    }
    // Priority 2: Due retries (RETRY_SCHEDULED or PENDING_CALL with next_retry_at <= now)
    else if ((status === "RETRY_SCHEDULED" || status === "PENDING_CALL") && nextRetryAt && nextRetryAt <= nowIso) {
      retryCandidates.push(item);
    }
    // Priority 3: Overnight backlog (QUEUED with BACKLOG)
    else if ((status === "QUEUED" || status === "PENDING_CALL") && qClass === "BACKLOG") {
      backlogCandidates.push(item);
    }
  }

  var selected = null;
  // Rule: latest fresh enquiry first (created_at DESC)
  if (freshCandidates.length > 0) {
    freshCandidates.sort(function(a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    selected = freshCandidates[0];
  }
  // Rule: due retries second (next_retry_at ASC)
  else if (retryCandidates.length > 0) {
    retryCandidates.sort(function(a, b) {
      return new Date(a.next_retry_at).getTime() - new Date(b.next_retry_at).getTime();
    });
    selected = retryCandidates[0];
  }
  // Rule: overnight backlog third (created_at ASC)
  else if (backlogCandidates.length > 0) {
    backlogCandidates.sort(function(a, b) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    selected = backlogCandidates[0];
  }

  if (!selected) {
    return { success: true, claimed: false, reason: "NO_DUE_ENQUIRIES" };
  }

  // Atomically claim the selected candidate
  var sessionId = "SES-" + selected.enquiry_id + "-" + Date.now();
  var newAttemptSeq = selected.attempt_sequence_count + 1;

  // Update enquiry row
  enqSheet.getRange(selected.rowIndex, colMap["current_status"] + 1).setValue("CALLING");
  if (colMap["active_session_id"] !== undefined) {
    enqSheet.getRange(selected.rowIndex, colMap["active_session_id"] + 1).setValue(sessionId);
  }
  enqSheet.getRange(selected.rowIndex, colMap["attempt_sequence_count"] + 1).setValue(newAttemptSeq);
  enqSheet.getRange(selected.rowIndex, colMap["last_call_at"] + 1).setValue(nowIso);

  // Set dialer lock
  setSystemStateValue(stateSheet, "DIALER_LOCK", {
    locked: true,
    session_id: sessionId,
    enquiry_id: selected.enquiry_id,
    locked_at: nowIso
  }, "QUEUE_CLAIM");

  // Set active session
  setSystemStateValue(stateSheet, "ACTIVE_SESSION", {
    active: true,
    session_id: sessionId,
    enquiry_id: selected.enquiry_id,
    started_at: nowIso
  }, "QUEUE_CLAIM");

  return {
    success: true,
    claimed: true,
    session_id: sessionId,
    enquiry: {
      enquiry_id: selected.enquiry_id,
      customer_name: selected.customer_name,
      phone_number: selected.phone_number,
      project_interest: selected.project_interest,
      attempt_sequence: newAttemptSeq,
      customer_no_answer_count: selected.customer_no_answer_count,
      technical_failures_count: selected.technical_failures_count
    }
  };
}

// -------------------------------------------------------------
// 3. Outcome Recording & Retry Scheduling
// -------------------------------------------------------------

function handleRecordOutcome(ss, payload) {
  var outcome = payload.outcome || payload;
  if (!outcome.enquiry_id || !outcome.outcome_id) {
    return { success: false, error: "enquiry_id and outcome_id are required" };
  }

  var outcomesSheet = ss.getSheetByName(TABS.CALL_OUTCOMES);
  var enqSheet = ss.getSheetByName(TABS.ENQUIRIES);
  var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);

  // 1. Check if outcome_id already exists to guarantee idempotency
  var outcomesData = outcomesSheet.getDataRange().getValues();
  for (var o = 1; o < outcomesData.length; o++) {
    if (outcomesData[o][0] === outcome.outcome_id) {
      return {
        success: true,
        idempotent_duplicate: true,
        message: "Outcome already recorded",
        outcome_id: outcome.outcome_id
      };
    }
  }

  // 2. Find matching Enquiry row
  var enqData = enqSheet.getDataRange().getValues();
  var headers = enqData[0];
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    colMap[headers[h]] = h;
  }

  var targetRow = -1;
  for (var r = 1; r < enqData.length; r++) {
    if (enqData[r][colMap["enquiry_id"]] === outcome.enquiry_id) {
      targetRow = r + 1; // 1-indexed
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, error: "Enquiry not found: " + outcome.enquiry_id };
  }

  var now = new Date();
  var nowIso = now.toISOString();
  var disposition = (outcome.call_disposition || outcome.disposition || "UNKNOWN").toUpperCase();
  var dndRequested = outcome.dnd_requested === true || outcome.dnd_requested === "true";

  var currentNoAnswer = Number(enqData[targetRow - 1][colMap["customer_no_answer_count"]] || 0);
  var currentTechFail = Number(enqData[targetRow - 1][colMap["technical_failures_count"]] || 0);

  var newStatus = "COMPLETED";
  var newQueueClass = "NONE";
  var nextRetryIso = "";
  var qualStatus = outcome.qualification_status || (outcome.interested ? "INTERESTED" : "UNREACHED");

  // Outcome branching logic
  if (dndRequested) {
    newStatus = "DO_NOT_CALL";
    qualStatus = "DND";
    newQueueClass = "NONE";
  } else if (disposition === "BUSY" || disposition === "NO_ANSWER") {
    // Customer no-answer policy: 2 min retry (or scheduled morning if outside window), max 3 attempts
    currentNoAnswer += 1;
    if (currentNoAnswer < 3) {
      newStatus = "RETRY_SCHEDULED";
      newQueueClass = "RETRY";
      var retryTime = new Date(now.getTime() + 2 * 60 * 1000);
      if (isCallingWindowOpen(retryTime)) {
        nextRetryIso = retryTime.toISOString();
      } else {
        nextRetryIso = getNextCallingWindowStartIso();
      }
    } else {
      newStatus = "NOT_ANSWERED";
      newQueueClass = "NONE";
      qualStatus = "UNREACHED";
    }
  } else if (disposition === "FAILED_TECH" || disposition === "FAILED" || disposition === "TECHNICAL_FAILURE") {
    // Technical failure policy: isolated counter; automatic retry disabled by default until explicitly configured
    currentTechFail += 1;
    var autoTechRetryEnabled = outcome.auto_technical_retries_enabled === true;
    var maxTechRetries = Number(outcome.max_technical_retries || 0);

    if (autoTechRetryEnabled && currentTechFail < maxTechRetries) {
      newStatus = "RETRY_SCHEDULED";
      newQueueClass = "RETRY";
      var backoffMins = currentTechFail === 1 ? 1 : 5;
      nextRetryIso = new Date(now.getTime() + backoffMins * 60 * 1000).toISOString();
    } else {
      newStatus = "FAILED_TECHNICAL";
      newQueueClass = "NONE";
      // Log operational alert for operator visibility
      setSystemStateValue(stateSheet, "OPERATIONAL_ALERT", {
        alert: "TECHNICAL_FAILURE_RECORDED",
        enquiry_id: outcome.enquiry_id,
        technical_failures_count: currentTechFail,
        error_details: outcome.error_details || "Carrier gateway error",
        timestamp: nowIso
      }, "RECORD_OUTCOME");
    }
  } else if (disposition === "ANSWERED" || disposition === "COMPLETED" || disposition === "INTERESTED" || disposition === "NOT_INTERESTED") {
    if (outcome.interested === true || disposition === "INTERESTED") {
      newStatus = "QUALIFIED";
      qualStatus = "INTERESTED";
    } else {
      newStatus = "DISQUALIFIED";
      qualStatus = "NOT_INTERESTED";
    }
    newQueueClass = "NONE";
  }

  // Update Enquiry row (IMMUTABLE CUSTOMER FIELDS ARE PRESERVED)
  if (colMap["queue_class"] !== undefined) enqSheet.getRange(targetRow, colMap["queue_class"] + 1).setValue(newQueueClass);
  if (colMap["current_status"] !== undefined) enqSheet.getRange(targetRow, colMap["current_status"] + 1).setValue(newStatus);
  if (colMap["customer_no_answer_count"] !== undefined) enqSheet.getRange(targetRow, colMap["customer_no_answer_count"] + 1).setValue(currentNoAnswer);
  if (colMap["technical_failures_count"] !== undefined) enqSheet.getRange(targetRow, colMap["technical_failures_count"] + 1).setValue(currentTechFail);
  if (colMap["last_call_at"] !== undefined) enqSheet.getRange(targetRow, colMap["last_call_at"] + 1).setValue(nowIso);
  if (colMap["next_retry_at"] !== undefined) enqSheet.getRange(targetRow, colMap["next_retry_at"] + 1).setValue(nextRetryIso);
  if (colMap["latest_disposition"] !== undefined) enqSheet.getRange(targetRow, colMap["latest_disposition"] + 1).setValue(disposition);
  if (colMap["qualification_status"] !== undefined) enqSheet.getRange(targetRow, colMap["qualification_status"] + 1).setValue(qualStatus);
  if (colMap["active_session_id"] !== undefined) enqSheet.getRange(targetRow, colMap["active_session_id"] + 1).setValue(""); // Clear active session
  if (colMap["latest_outcome_id"] !== undefined) enqSheet.getRange(targetRow, colMap["latest_outcome_id"] + 1).setValue(outcome.outcome_id);
  if (colMap["error_details"] !== undefined && outcome.error_details) {
    enqSheet.getRange(targetRow, colMap["error_details"] + 1).setValue(outcome.error_details);
  }

  // Append to Call_Outcomes tab (Header-driven to support canonical & alias column names)
  var outcomesHeaders = outcomesSheet.getDataRange().getValues()[0];
  var outColMap = {};
  for (var oh = 0; oh < outcomesHeaders.length; oh++) {
    outColMap[outcomesHeaders[oh]] = oh;
  }

  var outcomeRow = new Array(outcomesHeaders.length).fill("");
  var setOutcomeCol = function(nameAliases, val) {
    for (var a = 0; a < nameAliases.length; a++) {
      var col = outColMap[nameAliases[a]];
      if (col !== undefined) {
        outcomeRow[col] = val;
        return;
      }
    }
  };

  setOutcomeCol(["outcome_id"], outcome.outcome_id);
  setOutcomeCol(["enquiry_id"], outcome.enquiry_id);
  setOutcomeCol(["attempt_sequence"], outcome.attempt_sequence || 1);
  setOutcomeCol(["customer_attempt_number"], outcome.customer_attempt_number || (disposition === "BUSY" || disposition === "NO_ANSWER" ? currentNoAnswer : ""));
  setOutcomeCol(["channel"], outcome.channel || "elevenlabs-voice");
  setOutcomeCol(["call_sid"], outcome.call_sid || "");
  setOutcomeCol(["conversation_id"], outcome.conversation_id || "");
  setOutcomeCol(["call_start_time", "call_started_at"], outcome.call_start_time || outcome.call_started_at || nowIso);
  setOutcomeCol(["call_ended_at", "recorded_at"], outcome.call_ended_at || outcome.recorded_at || nowIso);
  setOutcomeCol(["duration_seconds"], outcome.duration_seconds || 0);
  setOutcomeCol(["call_disposition", "disposition"], disposition);
  setOutcomeCol(["interested"], outcome.interested === true ? true : (outcome.interested === false ? false : ""));
  setOutcomeCol(["property_config", "property_interest"], outcome.property_config || outcome.property_interest || "");
  setOutcomeCol(["budget_range"], outcome.budget_range || "");
  setOutcomeCol(["preferred_location"], outcome.preferred_location || "");
  setOutcomeCol(["timeline"], outcome.timeline || "");
  setOutcomeCol(["site_visit", "next_step_type"], outcome.site_visit || outcome.next_step_type || "");
  setOutcomeCol(["dnd_requested"], dndRequested);
  setOutcomeCol(["qualification_summary", "interest_reason"], outcome.qualification_summary || outcome.interest_reason || "");
  setOutcomeCol(["qualification_status", "interest_status"], qualStatus);
  setOutcomeCol(["recording_url"], outcome.recording_url || "");
  setOutcomeCol(["transcript_summary"], outcome.transcript_summary || outcome.summary || "");
  setOutcomeCol(["recorded_at"], nowIso);

  outcomesSheet.appendRow(outcomeRow);

  // Release dialer lock and active session
  setSystemStateValue(stateSheet, "DIALER_LOCK", {
    locked: false,
    session_id: null,
    enquiry_id: null,
    locked_at: null
  }, "RECORD_OUTCOME");

  setSystemStateValue(stateSheet, "ACTIVE_SESSION", {
    active: false,
    session_id: null
  }, "RECORD_OUTCOME");

  return {
    success: true,
    outcome_id: outcome.outcome_id,
    enquiry_id: outcome.enquiry_id,
    new_status: newStatus,
    next_retry_at: nextRetryIso
  };
}

// -------------------------------------------------------------
// 4. Webhook Events Logging
// -------------------------------------------------------------

function handleRecordWebhookEvent(ss, payload) {
  var webhookSheet = ss.getSheetByName(TABS.WEBHOOK_EVENTS);
  var event = payload.event || payload;

  if (!event.event_id || !event.provider) {
    return { success: false, error: "event_id and provider are required" };
  }

  // Check idempotency_key / event_id deduplication
  var data = webhookSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === event.event_id || (event.idempotency_key && data[i][4] === event.idempotency_key)) {
      return {
        success: true,
        duplicate: true,
        message: "Webhook event already logged",
        event_id: data[i][0]
      };
    }
  }

  var webhookHeaders = webhookSheet.getDataRange().getValues()[0];
  var webColMap = {};
  for (var wh = 0; wh < webhookHeaders.length; wh++) {
    webColMap[webhookHeaders[wh]] = wh;
  }

  var nowIso = new Date().toISOString();
  var row = new Array(webhookHeaders.length).fill("");
  var setWebCol = function(nameAliases, val) {
    for (var a = 0; a < nameAliases.length; a++) {
      var col = webColMap[nameAliases[a]];
      if (col !== undefined) {
        row[col] = val;
        return;
      }
    }
  };

  setWebCol(["event_id"], event.event_id);
  setWebCol(["received_at"], nowIso);
  setWebCol(["provider"], event.provider);
  setWebCol(["event_type"], event.event_type || "");
  setWebCol(["idempotency_key"], event.idempotency_key || event.event_id);
  setWebCol(["enquiry_id"], event.enquiry_id || "");
  setWebCol(["conversation_id"], event.conversation_id || "");
  setWebCol(["call_sid"], event.call_sid || "");
  setWebCol(["processing_status"], event.processing_status || "RECEIVED");
  setWebCol(["error_details", "processed_at"], event.error_details || nowIso);
  setWebCol(["raw_payload"], typeof event.raw_payload === "object" ? JSON.stringify(event.raw_payload) : String(event.raw_payload || ""));

  webhookSheet.appendRow(row);

  return {
    success: true,
    event_id: event.event_id,
    status: event.processing_status || "RECEIVED"
  };
}

// -------------------------------------------------------------
// 5. Dialer Lock & System State Operations
// -------------------------------------------------------------

function handleAcquireDialerLock(ss, payload) {
  var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
  var current = getSystemStateValue(stateSheet, "DIALER_LOCK");

  if (current && current.locked) {
    return {
      success: false,
      error: "Dialer already locked by session " + current.session_id,
      current_lock: current
    };
  }

  var nowIso = new Date().toISOString();
  var newLock = {
    locked: true,
    session_id: payload.session_id || ("SES-" + Date.now()),
    enquiry_id: payload.enquiry_id || null,
    locked_at: nowIso
  };

  setSystemStateValue(stateSheet, "DIALER_LOCK", newLock, payload.updated_by || "MANUAL_LOCK");
  return { success: true, lock: newLock };
}

function handleReleaseDialerLock(ss, payload) {
  var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
  var current = getSystemStateValue(stateSheet, "DIALER_LOCK");

  // Only allow release if session_id matches OR if force flag is explicitly provided by authorized operator
  if (current && current.locked && payload.session_id && current.session_id !== payload.session_id && !payload.force) {
    return {
      success: false,
      error: "Cannot release lock owned by different session (" + current.session_id + ") without force reconciliation."
    };
  }

  var releasedLock = {
    locked: false,
    session_id: null,
    enquiry_id: null,
    locked_at: null,
    released_by: payload.authorized_by || payload.updated_by || "OPERATOR"
  };

  setSystemStateValue(stateSheet, "DIALER_LOCK", releasedLock, payload.updated_by || "MANUAL_RELEASE");
  setSystemStateValue(stateSheet, "ACTIVE_SESSION", { active: false, session_id: null }, "MANUAL_RELEASE");

  return { success: true, message: "Lock released successfully" };
}

function handleGetSystemState(ss) {
  var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
  if (!stateSheet) {
    return { success: false, error: "System_State sheet not initialized" };
  }

  var data = stateSheet.getDataRange().getValues();
  var state = {};
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var val = data[i][1];
    try {
      state[key] = JSON.parse(val);
    } catch (e) {
      state[key] = val;
    }
  }

  return { success: true, data: state };
}

function handleUpdateSystemState(ss, payload) {
  var key = payload.state_key || payload.key;
  var value = payload.state_value || payload.value;
  var actor = payload.actor || payload.updated_by || "SYSTEM";

  if (!key) {
    return { success: false, error: "state_key is required" };
  }

  var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
  if (!stateSheet) {
    handleInitializeTabs(ss);
    stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
  }

  setSystemStateValue(stateSheet, key, value, actor);
  return { success: true, message: "System state updated", key: key, value: value };
}

function handleReconcileStaleLocks(ss, payload) {
  var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
  var current = getSystemStateValue(stateSheet, "DIALER_LOCK");
  if (!current || !current.locked) {
    return { success: true, message: "Dialer is not locked", reconciled: false };
  }

  var lockedTime = current.locked_at ? new Date(current.locked_at).getTime() : 0;
  var nowTime = new Date().getTime();
  var elapsedMs = nowTime - lockedTime;
  var isProlonged = elapsedMs >= 15 * 60 * 1000;

  // Strict Safety Rule: Do NOT automatically release active lock!
  // If force flag is provided with operator authorization, allow manual release:
  if (payload && payload.force === true && payload.authorized_by) {
    setSystemStateValue(stateSheet, "DIALER_LOCK", {
      locked: false,
      session_id: null,
      enquiry_id: null,
      locked_at: null,
      manually_reconciled: true,
      authorized_by: payload.authorized_by,
      reason: payload.reason || "Operator verified provider status is terminal"
    }, "OPERATOR_RECONCILE");

    setSystemStateValue(stateSheet, "ACTIVE_SESSION", { active: false, session_id: null }, "OPERATOR_RECONCILE");
    return { success: true, reconciled: true, message: "Dialer lock manually reconciled by operator." };
  }

  // Without explicit authorized operator force, quarantine and alert
  if (isProlonged) {
    setSystemStateValue(stateSheet, "OPERATIONAL_ALERT", {
      alert: "STALE_LOCK_ATTENTION_REQUIRED",
      session_id: current.session_id,
      enquiry_id: current.enquiry_id,
      locked_at: current.locked_at,
      elapsed_minutes: Math.round(elapsedMs / 60000),
      message: "Dialer lock held for >15 min. Automatic release disallowed. Operator verification required."
    }, "STALE_MONITOR");

    return {
      success: true,
      reconciled: false,
      requires_manual_reconciliation: true,
      message: "Lock is prolonged (>15m) but automatic release is prohibited to prevent duplicate concurrent calls. Operator reconciliation required.",
      current_lock: current
    };
  }

  return { success: true, reconciled: false, elapsed_seconds: Math.floor(elapsedMs / 1000) };
}

// -------------------------------------------------------------
// System State Row Helpers (Batch/Indexed Key-Value)
// -------------------------------------------------------------

function getSystemStateValue(sheet, key) {
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      try {
        return JSON.parse(data[i][1]);
      } catch (e) {
        return data[i][1];
      }
    }
  }
  return null;
}

function setSystemStateValue(sheet, key, value, updatedBy) {
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var stringVal = typeof value === "object" ? JSON.stringify(value) : String(value);
  var nowIso = new Date().toISOString();
  var by = updatedBy || "SYSTEM";

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(stringVal);
      sheet.getRange(i + 1, 3).setValue(nowIso);
      sheet.getRange(i + 1, 4).setValue(by);
      SpreadsheetApp.flush();
      return;
    }
  }

  // Key not found: append new row
  sheet.appendRow([key, stringVal, nowIso, by, ""]);
  SpreadsheetApp.flush();
}

// -------------------------------------------------------------
// Time-Driven Trigger Scheduled Worker
// -------------------------------------------------------------

/**
 * Configure as a Time-Driven Trigger in Google Apps Script.
 * Supported intervals: everyMinutes(1), everyMinutes(5), everyMinutes(10), everyMinutes(15), everyMinutes(30).
 * Note: Google Apps Script does NOT support 2-minute trigger intervals.
 *
 * This function triggers the Next.js Worker API route to process the queue.
 */
function onScheduledTrigger() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    var ss = getSpreadsheet();
    if (ss) {
      var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
      if (stateSheet) {
        setSystemStateValue(stateSheet, "SCHEDULER_HEARTBEAT", new Date().toISOString(), "TRIGGER");
      }
    }

    // Check calling hours
    if (!isCallingWindowOpen()) return;

    // Invoke Next.js Queue Worker over HTTP if configured with a reachable public URL
    var props = PropertiesService.getScriptProperties();
    var workerUrl = props.getProperty("NEXTJS_WORKER_URL");
    var cronSecret = props.getProperty("CRON_SECRET");

    if (workerUrl && workerUrl.trim().length > 0) {
      // Safety check: Never attempt HTTP calls to localhost or unroutable loopback addresses from Google Apps Script
      if (workerUrl.indexOf("localhost") !== -1 || workerUrl.indexOf("127.0.0.1") !== -1) {
        Logger.log("Trigger skipped: NEXTJS_WORKER_URL is set to localhost/loopback, which is not reachable from Google Apps Script cloud.");
        return;
      }

      var headers = { "Content-Type": "application/json" };
      if (cronSecret && cronSecret.trim().length > 0) {
        headers["Authorization"] = "Bearer " + cronSecret.trim();
      }

      try {
        var response = UrlFetchApp.fetch(workerUrl.trim(), {
          method: "POST",
          headers: headers,
          payload: JSON.stringify({ source: "apps_script_trigger" }),
          muteHttpExceptions: true
        });
        Logger.log("Trigger invoked Next.js worker. HTTP " + response.getResponseCode());
      } catch (fetchErr) {
        Logger.log("Error invoking Next.js worker from trigger: " + fetchErr.message);
      }
    }
  } catch (e) {
    Logger.log("Error in onScheduledTrigger: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------

function normalizePhoneNumber(raw) {
  var cleaned = String(raw || "").replace(/[^\d+]/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.indexOf("+") === 0) return cleaned;
  if (cleaned.length === 10) return "+91" + cleaned;
  if (cleaned.length === 12 && cleaned.indexOf("91") === 0) return "+" + cleaned;
  return "+" + cleaned;
}

function generateEnquiryId(index) {
  var year = new Date().getFullYear();
  var numStr = ("00000" + (index || 1)).slice(-5);
  return "HSK-ENQ-" + year + "-" + numStr;
}

function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
