/**
 * HSK Builder Group AI Calling Platform
 * Google Sheets Schema, Header Contracts & Status Enums (Version 1)
 *
 * Source of Truth: Single Google Spreadsheet with 4 Tabs:
 * 1. Enquiries
 * 2. Call_Outcomes
 * 3. Webhook_Events
 * 4. System_State
 */

export const HSK_TABS = {
  ENQUIRIES: "Enquiries",
  CALL_OUTCOMES: "Call_Outcomes",
  WEBHOOK_EVENTS: "Webhook_Events",
  SYSTEM_STATE: "System_State",
} as const;

export type HskTabName = typeof HSK_TABS[keyof typeof HSK_TABS];

/**
 * Normalized Status Taxonomy
 */
export type QueueClass = "FRESH" | "RETRY" | "BACKLOG" | "NONE";

export type EnquiryStatus =
  | "NEW"
  | "QUEUED"
  | "CALLING"
  | "QUALIFIED"
  | "DISQUALIFIED"
  | "RETRY_SCHEDULED"
  | "NOT_ANSWERED"
  | "FAILED_TECHNICAL"
  | "DO_NOT_CALL";

export type CallDisposition =
  | "ANSWERED"
  | "BUSY"
  | "NO_ANSWER"
  | "FAILED_TECH"
  | "UNKNOWN";

export type QualificationStatus =
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "UNREACHED"
  | "DND"
  | "PENDING";

export type WebhookProcessingStatus =
  | "RECEIVED"
  | "PROCESSED"
  | "DUPLICATE_IGNORED"
  | "QUARANTINED"
  | "FAILED";

/**
 * 1. Enquiries Tab Headers (Columns A to U)
 */
export const ENQUIRIES_HEADERS = [
  "enquiry_id",               // A (PK)
  "created_at",               // B (ISO)
  "customer_name",            // C (Immutable)
  "phone_number",             // D (Immutable E.164)
  "project_interest",         // E (Immutable)
  "source",                   // F (Immutable)
  "utm_campaign",             // G (Immutable)
  "customer_notes",           // H (Immutable original notes)
  "queue_class",              // I (FRESH, RETRY, BACKLOG, NONE)
  "current_status",           // J (EnquiryStatus)
  "attempt_sequence_count",   // K (Total dial sequence: 1, 2, 3...)
  "customer_no_answer_count", // L (Customer busy/no-answer attempts: 0-3)
  "technical_failures_count", // M (Carrier/gateway errors: 0-2)
  "last_call_at",             // N (ISO)
  "next_retry_at",            // O (ISO)
  "latest_disposition",       // P (CallDisposition)
  "qualification_status",     // Q (QualificationStatus)
  "active_session_id",        // R (In-flight session if CALLING)
  "assigned_agent",           // S (Sales rep for follow-up)
  "latest_outcome_id",        // T (FK to Call_Outcomes)
  "error_details",            // U (Technical/Sync error details)
] as const;

export interface EnquiryRecord {
  enquiry_id: string;
  created_at: string;
  customer_name: string;
  phone_number: string;
  project_interest: string;
  source: string;
  utm_campaign: string;
  customer_notes: string;
  queue_class: QueueClass;
  current_status: EnquiryStatus;
  attempt_sequence_count: number;
  customer_no_answer_count: number;
  technical_failures_count: number;
  last_call_at: string | null;
  next_retry_at: string | null;
  latest_disposition: CallDisposition | null;
  qualification_status: QualificationStatus | null;
  active_session_id: string | null;
  assigned_agent: string | null;
  latest_outcome_id: string | null;
  error_details: string | null;
}

/**
 * 2. Call_Outcomes Tab Headers (Columns A to T)
 */
export const CALL_OUTCOMES_HEADERS = [
  "outcome_id",               // A (PK, e.g. OUT-HSK-<enquiry_id>-<seq>)
  "enquiry_id",               // B (FK to Enquiries)
  "attempt_sequence",         // C (Overall dial sequence)
  "customer_attempt_number",  // D (1, 2, or 3 if busy/no-answer)
  "channel",                  // E (EXOTEL_PSTN | BROWSER_TEST)
  "call_sid",                 // F (Exotel CallSid)
  "conversation_id",          // G (ElevenLabs Conversation ID)
  "call_start_time",          // H (ISO)
  "duration_seconds",         // I (Number)
  "call_disposition",         // J (CallDisposition)
  "interested",               // K (Boolean | null)
  "property_config",          // L (Extracted unit config)
  "budget_range",             // M (Extracted budget)
  "timeline",                 // N (Purchase timeline)
  "site_visit",               // O (Site visit intent)
  "dnd_requested",            // P (Boolean)
  "qualification_summary",    // Q (Concise 1-2 sentence AI summary)
  "recording_url",            // R (Exotel audio URL)
  "transcript_summary",       // S (Key points)
  "recorded_at",              // T (ISO)
] as const;

export interface CallOutcomeRecord {
  outcome_id: string;
  enquiry_id: string;
  attempt_sequence: number;
  customer_attempt_number: number | null;
  channel: "EXOTEL_PSTN" | "BROWSER_TEST";
  call_sid: string | null;
  conversation_id: string | null;
  call_start_time: string;
  duration_seconds: number | null;
  call_disposition: CallDisposition;
  interested: boolean | null;
  property_config: string | null;
  budget_range: string | null;
  timeline: string | null;
  site_visit: string | null;
  dnd_requested: boolean;
  qualification_summary: string | null;
  recording_url: string | null;
  transcript_summary: string | null;
  recorded_at: string;
}

/**
 * 3. Webhook_Events Tab Headers (Columns A to K)
 */
export const WEBHOOK_EVENTS_HEADERS = [
  "event_id",                 // A (PK, e.g. EVT-<idempotency_key>)
  "received_at",              // B (ISO)
  "provider",                 // C (ELEVENLABS | EXOTEL)
  "event_type",               // D (post_call_transcription | call_initiation_failure | exotel_status)
  "idempotency_key",          // E (Unique deduplication hash)
  "enquiry_id",               // F (Extracted correlation ID)
  "conversation_id",          // G
  "call_sid",                 // H
  "processing_status",        // I (WebhookProcessingStatus)
  "error_details",            // J
  "raw_payload",              // K (JSON string)
] as const;

export interface WebhookEventRecord {
  event_id: string;
  received_at: string;
  provider: "ELEVENLABS" | "EXOTEL";
  event_type: string;
  idempotency_key: string;
  enquiry_id: string | null;
  conversation_id: string | null;
  call_sid: string | null;
  processing_status: WebhookProcessingStatus;
  error_details: string | null;
  raw_payload: string;
}

/**
 * 4. System_State Tab Headers (Columns A to E)
 */
export const SYSTEM_STATE_HEADERS = [
  "state_key",                // A (PK: DIALER_LOCK, SCHEDULER_HEARTBEAT, ACTIVE_SESSION, OPERATIONAL_ALERT)
  "state_value",              // B (JSON string or scalar)
  "updated_at",               // C (ISO)
  "updated_by",               // D (Worker/Trigger identifier)
  "notes",                    // E
] as const;

export interface SystemStateRecord {
  state_key: string;
  state_value: string;
  updated_at: string;
  updated_by: string;
  notes: string | null;
}

/**
 * Calling Hours Gate (Asia/Kolkata: 9:00 AM to 10:00 PM IST)
 * All 7 days of the week, including weekends.
 */
export function isCallingWindowOpen(date: Date = new Date()): boolean {
  // Convert date to Asia/Kolkata hours
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(istFormatter.format(date), 10);
  return hour >= 9 && hour < 22;
}

/**
 * Calculates next 9:00 AM IST window opening if currently outside calling hours.
 */
export function getNextWindowOpeningTime(date: Date = new Date()): Date {
  const istParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => parseInt(istParts.find((p) => p.type === type)?.value || "0", 10);
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");

  // If before 9 AM today, window opens today at 9:00 AM IST
  // If >= 10 PM today, window opens tomorrow at 9:00 AM IST
  let targetDay = day;
  if (hour >= 22) {
    targetDay += 1;
  }

  // Construct UTC time for 9:00 AM IST (+05:30) => 03:30:00 UTC
  // month in JS Date constructor is 0-indexed
  const utcDate = new Date(Date.UTC(year, month - 1, targetDay, 3, 30, 0, 0));
  return utcDate;
}

/**
 * Normalizes phone numbers to standard E.164 (+91XXXXXXXXXX for 10-digit Indian numbers)
 */
export function normalizePhoneNumber(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return `+${cleaned}`;
  return `+${cleaned}`;
}

/**
 * Generates an immutable, human-readable enquiry_id
 */
export function generateEnquiryId(sequenceNumber?: number): string {
  const prefix = "HSK-ENQ";
  const year = new Date().getFullYear();
  if (typeof sequenceNumber === "number" && sequenceNumber > 0) {
    return `${prefix}-${year}-${String(sequenceNumber).padStart(5, "0")}`;
  }
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${year}-${randomSuffix}${timestamp}`;
}

/**
 * Generates deterministic outcome_id
 */
export function generateOutcomeId(enquiryId: string, attemptSequence: number): string {
  return `OUT-${enquiryId}-${attemptSequence}`;
}
