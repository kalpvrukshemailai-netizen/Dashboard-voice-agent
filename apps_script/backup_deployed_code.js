/**
 * ============================================================================
 * BACKUP: Previously Deployed Google Apps Script Version (1.2.0)
 * Deployed Web App: https://script.google.com/macros/s/AKfycbxcEEMuk7jhNUH657G0oYLvDGhKFZt2Oh8xpbdlM1fxwJuhwPihCZMtbM0o525huytHhw/exec
 * Backed up at: 2026-10-21T14:35:00+05:30
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

function verifyAuthorization(payload, parameter, action, e) {
  var isPublicAction = (action === "createEnquiry" || action === "create_enquiry" || action === "submit_enquiry" || action === "new_enquiry" || action === "health" || action === "ping");
  if (isPublicAction && CONFIG.ALLOW_PUBLIC_ENQUIRIES) {
    return true;
  }

  var configuredSecret = getSharedSecret();
  if (!configuredSecret) {
    return true;
  }

  var provided = (payload && (payload.shared_secret || payload.secret || payload.auth_token)) ||
                 (parameter && (parameter.shared_secret || parameter.secret || parameter.auth_token));

  if (!provided && e && e.headers) {
    provided = e.headers["x-hsk-secret"] || e.headers["X-HSK-Secret"] || e.headers["authorization"] || e.headers["Authorization"];
    if (provided && provided.toLowerCase().indexOf("bearer ") === 0) {
      provided = provided.substring(7);
    }
  }

  return provided === configuredSecret;
}
