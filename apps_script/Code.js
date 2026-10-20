/**
 * HSK Builder Group AI Calling Platform
 * Google Apps Script Backend (Version 1 - Production Hardened)
 *
 * System of Record: Google Spreadsheet with 4 Tabs:
 * 1. Enquiries
 * 2. Call_Outcomes
 * 3. Webhook_Events
 * 4. System_State
 */

// Global Constants & Sheet Tab Names
var TABS = {
  ENQUIRIES: "Enquiries",
  CALL_OUTCOMES: "Call_Outcomes",
  WEBHOOK_EVENTS: "Webhook_Events",
  SYSTEM_STATE: "System_State"
};

var HEADERS = {
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
  WEBHOOK_EVENTS: [
    "event_id", "received_at", "provider", "event_type",
    "idempotency_key", "enquiry_id", "conversation_id", "call_sid",
    "processing_status", "error_details", "raw_payload"
  ],
  SYSTEM_STATE: [
    "state_key", "state_value", "updated_at", "updated_by", "notes"
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

function verifyAuthorization(payload, parameter) {
  var configuredSecret = getSharedSecret();
  // If no secret configured in ScriptProperties, log warning in non-prod
  if (!configuredSecret) {
    return true; // allows initial bootstrap before ScriptProperties are populated
  }
  var provided = (payload && (payload.shared_secret || payload.secret)) || (parameter && (parameter.shared_secret || parameter.secret));
  return provided === configuredSecret;
}

/**
 * HTTP Entrypoint: POST
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for lock
    if (!lock.tryLock(10000)) {
      return jsonResponse({ success: false, error: "Server busy: Could not acquire script lock" }, 503);
    }

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        return jsonResponse({ success: false, error: "Invalid JSON payload" }, 400);
      }
    }

    // 1. Authenticate Request
    if (!verifyAuthorization(payload, null)) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid or missing shared secret" }, 401);
    }

    var action = payload.action || "health";
    var ss = getSpreadsheet(payload.spreadsheetId);

    var result;
    switch (action) {
      case "initializeTabs":
        result = handleInitializeTabs(ss);
        break;
      case "getEnquiries":
        result = handleGetEnquiries(ss, payload);
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
      case "reconcileStaleLocks":
        result = handleReconcileStaleLocks(ss, payload);
        break;
      default:
        result = { success: false, error: "Unknown action: " + action };
        break;
    }

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message || String(error),
      stack: error.stack
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * HTTP Entrypoint: GET
 */
function doGet(e) {
  try {
    // Authenticate GET requests if parameter contains commands or queries
    if (!verifyAuthorization(null, e && e.parameter)) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid or missing shared secret" }, 401);
    }

    var ss = getSpreadsheet(e && e.parameter ? e.parameter.spreadsheetId : null);
    var systemState = handleGetSystemState(ss);
    var isWindowOpen = isCallingWindowOpen();

    return jsonResponse({
      success: true,
      service: "HSK Builder Group AI Calling Backend",
      version: "1.1.0",
      calling_window_open: isWindowOpen,
      system_state: systemState.data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

// -------------------------------------------------------------
// Spreadsheet and Tab Management
// -------------------------------------------------------------

function getSpreadsheet(spreadsheetId) {
  if (spreadsheetId && String(spreadsheetId).trim().length > 0) {
    return SpreadsheetApp.openById(String(spreadsheetId).trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function handleInitializeTabs(ss) {
  var created = [];
  var existing = [];

  for (var tabKey in TABS) {
    var tabName = TABS[tabKey];
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      var headers = HEADERS[tabKey];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      created.push(tabName);

      // Initialize default rows for System_State
      if (tabName === TABS.SYSTEM_STATE) {
        var now = new Date().toISOString();
        var defaultState = [
          ["DIALER_LOCK", JSON.stringify({ locked: false, session_id: null, enquiry_id: null, locked_at: null }), now, "SYSTEM_INIT", "Dialer concurrency lock"],
          ["ACTIVE_SESSION", JSON.stringify({ active: false, session_id: null }), now, "SYSTEM_INIT", "In-flight call session"],
          ["SCHEDULER_HEARTBEAT", now, now, "SYSTEM_INIT", "Last queue worker run"],
          ["OPERATIONAL_ALERT", JSON.stringify({ alert: null, timestamp: null }), now, "SYSTEM_INIT", "Operational circuit breaker"]
        ];
        sheet.getRange(2, 1, defaultState.length, 5).setValues(defaultState);
      }
    } else {
      existing.push(tabName);
    }
  }

  return {
    success: true,
    message: "Tabs initialized successfully",
    created: created,
    existing: existing
  };
}

// -------------------------------------------------------------
// Calling Window Helper (9:00 AM - 10:00 PM Asia/Kolkata)
// -------------------------------------------------------------

function isCallingWindowOpen(date) {
  var d = date || new Date();
  var istHourString = Utilities.formatDate(d, "Asia/Kolkata", "HH");
  var hour = parseInt(istHourString, 10);
  return hour >= CALLING_HOURS.START_HOUR_IST && hour < CALLING_HOURS.END_HOUR_IST;
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

function handleCreateEnquiry(ss, payload) {
  var sheet = ss.getSheetByName(TABS.ENQUIRIES);
  if (!sheet) {
    handleInitializeTabs(ss);
    sheet = ss.getSheetByName(TABS.ENQUIRIES);
  }

  var enquiry = payload.enquiry || payload;
  if (!enquiry.customer_name || !enquiry.phone_number) {
    return { success: false, error: "customer_name and phone_number are required" };
  }

  var cleanPhone = normalizePhoneNumber(enquiry.phone_number);
  var now = new Date().toISOString();

  // Check for existing pending/active enquiry with same phone to avoid duplicates
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var phoneIdx = headers.indexOf("phone_number");
  var statusIdx = headers.indexOf("current_status");
  var idIdx = headers.indexOf("enquiry_id");

  for (var i = 1; i < data.length; i++) {
    var existingPhone = data[i][phoneIdx];
    var existingStatus = data[i][statusIdx];
    if (existingPhone === cleanPhone && (existingStatus === "NEW" || existingStatus === "QUEUED" || existingStatus === "CALLING" || existingStatus === "RETRY_SCHEDULED")) {
      return {
        success: true,
        is_duplicate: true,
        message: "Enquiry already queued/active for this phone number",
        enquiry_id: data[i][idIdx]
      };
    }
  }

  var enquiryId = enquiry.enquiry_id || generateEnquiryId(data.length);
  var inWindow = isCallingWindowOpen();
  var queueClass = inWindow ? "FRESH" : "BACKLOG";
  var currentStatus = "QUEUED";

  var newRow = [
    enquiryId,                                // enquiry_id
    now,                                      // created_at
    enquiry.customer_name.trim(),             // customer_name (immutable)
    cleanPhone,                               // phone_number (immutable)
    (enquiry.project_interest || "General").trim(), // project_interest (immutable)
    (enquiry.source || "Website").trim(),     // source (immutable)
    (enquiry.utm_campaign || "").trim(),      // utm_campaign (immutable)
    (enquiry.customer_notes || "").trim(),    // customer_notes (immutable)
    queueClass,                               // queue_class
    currentStatus,                            // current_status
    0,                                        // attempt_sequence_count
    0,                                        // customer_no_answer_count
    0,                                        // technical_failures_count
    "",                                       // last_call_at
    "",                                       // next_retry_at
    "",                                       // latest_disposition
    "",                                       // qualification_status
    "",                                       // active_session_id
    enquiry.assigned_agent || "",             // assigned_agent
    "",                                       // latest_outcome_id
    ""                                        // error_details
  ];

  sheet.appendRow(newRow);

  return {
    success: true,
    enquiry_id: enquiryId,
    queue_class: queueClass,
    current_status: currentStatus,
    in_calling_window: inWindow
  };
}

// -------------------------------------------------------------
// 2. Queue Coordinator & Priority Claiming
// -------------------------------------------------------------

function handleClaimNextEnquiry(ss, payload) {
  // 1. Calling Window Check
  if (!isCallingWindowOpen()) {
    return {
      success: true,
      claimed: false,
      reason: "CALLING_WINDOW_CLOSED",
      message: "Outside 9:00 AM - 10:00 PM IST calling window"
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
    if (status === "DO_NOT_CALL" || status === "QUALIFIED" || status === "DISQUALIFIED" || status === "NOT_ANSWERED" || status === "CALLING" || status === "FAILED_TECHNICAL") {
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

    // Priority 1: Fresh enquiries (NEW or QUEUED with FRESH)
    if ((status === "NEW" || status === "QUEUED") && qClass === "FRESH") {
      freshCandidates.push(item);
    }
    // Priority 2: Due retries (RETRY_SCHEDULED where next_retry_at <= now)
    else if (status === "RETRY_SCHEDULED" && nextRetryAt && nextRetryAt <= nowIso) {
      retryCandidates.push(item);
    }
    // Priority 3: Overnight backlog (QUEUED with BACKLOG)
    else if (status === "QUEUED" && qClass === "BACKLOG") {
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
  enqSheet.getRange(selected.rowIndex, colMap["active_session_id"] + 1).setValue(sessionId);
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
  var disposition = (outcome.call_disposition || "UNKNOWN").toUpperCase();
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
    // Customer no-answer policy: 2 min retry, max 3 attempts
    currentNoAnswer += 1;
    if (currentNoAnswer < 3) {
      newStatus = "RETRY_SCHEDULED";
      newQueueClass = "RETRY";
      var retryTime = new Date(now.getTime() + 2 * 60 * 1000);
      nextRetryIso = retryTime.toISOString();
    } else {
      newStatus = "NOT_ANSWERED";
      newQueueClass = "NONE";
      qualStatus = "UNREACHED";
    }
  } else if (disposition === "FAILED_TECH") {
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
  } else if (disposition === "ANSWERED") {
    newStatus = outcome.interested ? "QUALIFIED" : "DISQUALIFIED";
    newQueueClass = "NONE";
  }

  // Update Enquiry row (IMMUTABLE CUSTOMER FIELDS ARE PRESERVED)
  enqSheet.getRange(targetRow, colMap["queue_class"] + 1).setValue(newQueueClass);
  enqSheet.getRange(targetRow, colMap["current_status"] + 1).setValue(newStatus);
  enqSheet.getRange(targetRow, colMap["customer_no_answer_count"] + 1).setValue(currentNoAnswer);
  enqSheet.getRange(targetRow, colMap["technical_failures_count"] + 1).setValue(currentTechFail);
  enqSheet.getRange(targetRow, colMap["last_call_at"] + 1).setValue(nowIso);
  enqSheet.getRange(targetRow, colMap["next_retry_at"] + 1).setValue(nextRetryIso);
  enqSheet.getRange(targetRow, colMap["latest_disposition"] + 1).setValue(disposition);
  enqSheet.getRange(targetRow, colMap["qualification_status"] + 1).setValue(qualStatus);
  enqSheet.getRange(targetRow, colMap["active_session_id"] + 1).setValue(""); // Clear active session
  enqSheet.getRange(targetRow, colMap["latest_outcome_id"] + 1).setValue(outcome.outcome_id);
  if (outcome.error_details) {
    enqSheet.getRange(targetRow, colMap["error_details"] + 1).setValue(outcome.error_details);
  }

  // Append to Call_Outcomes tab
  var outcomeRow = [
    outcome.outcome_id,
    outcome.enquiry_id,
    outcome.attempt_sequence || 1,
    outcome.customer_attempt_number || (disposition === "BUSY" || disposition === "NO_ANSWER" ? currentNoAnswer : ""),
    outcome.channel || "EXOTEL_PSTN",
    outcome.call_sid || "",
    outcome.conversation_id || "",
    outcome.call_start_time || nowIso,
    outcome.duration_seconds || 0,
    disposition,
    outcome.interested === true ? true : (outcome.interested === false ? false : ""),
    outcome.property_config || "",
    outcome.budget_range || "",
    outcome.timeline || "",
    outcome.site_visit || "",
    dndRequested,
    outcome.qualification_summary || "",
    outcome.recording_url || "",
    outcome.transcript_summary || "",
    nowIso
  ];
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

  var nowIso = new Date().toISOString();
  var row = [
    event.event_id,
    nowIso,
    event.provider,
    event.event_type || "",
    event.idempotency_key || event.event_id,
    event.enquiry_id || "",
    event.conversation_id || "",
    event.call_sid || "",
    event.processing_status || "RECEIVED",
    event.error_details || "",
    typeof event.raw_payload === "object" ? JSON.stringify(event.raw_payload) : String(event.raw_payload || "")
  ];

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
      return;
    }
  }

  // Key not found: append new row
  sheet.appendRow([key, stringVal, nowIso, by, ""]);
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      var stateSheet = ss.getSheetByName(TABS.SYSTEM_STATE);
      setSystemStateValue(stateSheet, "SCHEDULER_HEARTBEAT", new Date().toISOString(), "TRIGGER");
    }

    // Check calling hours
    if (!isCallingWindowOpen()) return;

    // Invoke Next.js Queue Worker over HTTP if configured
    var props = PropertiesService.getScriptProperties();
    var workerUrl = props.getProperty("NEXTJS_WORKER_URL");
    var cronSecret = props.getProperty("CRON_SECRET");

    if (workerUrl && workerUrl.trim().length > 0) {
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
