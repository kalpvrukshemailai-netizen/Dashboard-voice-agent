/**
 * In-Memory Test Double for HSK Google Sheets + Apps Script Backend
 *
 * Implements the exact 4-tab data store, LockService simulation,
 * priority queue logic, immutable field preservation, and idempotent operations.
 */

import {
  HSK_TABS,
  ENQUIRIES_HEADERS,
  CALL_OUTCOMES_HEADERS,
  WEBHOOK_EVENTS_HEADERS,
  SYSTEM_STATE_HEADERS,
  isCallingWindowOpen,
  normalizePhoneNumber,
  generateEnquiryId,
} from "./hsk-sheets-schema.ts";
import type {
  EnquiryRecord,
  CallOutcomeRecord,
  WebhookEventRecord,
  SystemStateRecord,
} from "./hsk-sheets-schema.ts";

export class HskSheetsTestDouble {
  private enquiries: Map<string, EnquiryRecord> = new Map();
  private outcomes: Map<string, CallOutcomeRecord> = new Map();
  private webhookEvents: Map<string, WebhookEventRecord> = new Map();
  private systemState: Map<string, SystemStateRecord> = new Map();
  private isLocked: boolean = false;
  private forceCallingWindow: boolean | null = null; // null = use real time

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.enquiries.clear();
    this.outcomes.clear();
    this.webhookEvents.clear();
    this.systemState.clear();
    this.isLocked = false;
    this.forceCallingWindow = null;
    this.initializeDefaultSystemState();
  }

  public setMockCallingWindow(isOpen: boolean | null): void {
    this.forceCallingWindow = isOpen;
  }

  private checkWindowOpen(): boolean {
    if (this.forceCallingWindow !== null) {
      return this.forceCallingWindow;
    }
    return isCallingWindowOpen();
  }

  private initializeDefaultSystemState(): void {
    const now = new Date().toISOString();
    this.systemState.set("DIALER_LOCK", {
      state_key: "DIALER_LOCK",
      state_value: JSON.stringify({ locked: false, session_id: null, enquiry_id: null, locked_at: null }),
      updated_at: now,
      updated_by: "SYSTEM_INIT",
      notes: "Dialer concurrency lock",
    });
    this.systemState.set("ACTIVE_SESSION", {
      state_key: "ACTIVE_SESSION",
      state_value: JSON.stringify({ active: false, session_id: null }),
      updated_at: now,
      updated_by: "SYSTEM_INIT",
      notes: "In-flight call session",
    });
    this.systemState.set("SCHEDULER_HEARTBEAT", {
      state_key: "SCHEDULER_HEARTBEAT",
      state_value: now,
      updated_at: now,
      updated_by: "SYSTEM_INIT",
      notes: "Last queue worker run",
    });
    this.systemState.set("OPERATIONAL_ALERT", {
      state_key: "OPERATIONAL_ALERT",
      state_value: JSON.stringify({ alert: null, timestamp: null }),
      updated_at: now,
      updated_by: "SYSTEM_INIT",
      notes: "Operational circuit breaker",
    });
  }

  public initializeTabs(): { success: boolean; created: string[]; existing: string[] } {
    return {
      success: true,
      created: Object.values(HSK_TABS),
      existing: [],
    };
  }

  public getEnquiries(options?: { status?: string; queue_class?: string; limit?: number }) {
    let list = Array.from(this.enquiries.values());
    if (options?.status) {
      list = list.filter((e) => e.current_status === options.status);
    }
    if (options?.queue_class) {
      list = list.filter((e) => e.queue_class === options.queue_class);
    }
    const limit = options?.limit || 100;
    return {
      success: true,
      count: list.length,
      enquiries: list.slice(0, limit),
    };
  }

  public createEnquiry(payload: Partial<EnquiryRecord> & { customer_name: string; phone_number: string }) {
    if (!payload.customer_name || !payload.phone_number) {
      return { success: false, error: "customer_name and phone_number are required" };
    }

    const cleanPhone = normalizePhoneNumber(payload.phone_number);

    // Check for existing pending/active enquiry
    for (const existing of this.enquiries.values()) {
      if (
        existing.phone_number === cleanPhone &&
        ["NEW", "QUEUED", "CALLING", "RETRY_SCHEDULED"].includes(existing.current_status)
      ) {
        return {
          success: true,
          is_duplicate: true,
          message: "Enquiry already queued/active for this phone number",
          enquiry_id: existing.enquiry_id,
        };
      }
    }

    const now = new Date().toISOString();
    const inWindow = this.checkWindowOpen();
    const queueClass = inWindow ? "FRESH" : "BACKLOG";
    const enquiryId = payload.enquiry_id || generateEnquiryId(this.enquiries.size + 1);

    const record: EnquiryRecord = {
      enquiry_id: enquiryId,
      created_at: now,
      customer_name: payload.customer_name.trim(),
      phone_number: cleanPhone,
      project_interest: (payload.project_interest || "General").trim(),
      source: (payload.source || "Website").trim(),
      utm_campaign: (payload.utm_campaign || "").trim(),
      customer_notes: (payload.customer_notes || "").trim(),
      queue_class: queueClass,
      current_status: "QUEUED",
      attempt_sequence_count: 0,
      customer_no_answer_count: 0,
      technical_failures_count: 0,
      last_call_at: null,
      next_retry_at: null,
      latest_disposition: null,
      qualification_status: null,
      active_session_id: null,
      assigned_agent: payload.assigned_agent || null,
      latest_outcome_id: null,
      error_details: null,
    };

    this.enquiries.set(enquiryId, record);

    return {
      success: true,
      enquiry_id: enquiryId,
      queue_class: queueClass,
      current_status: record.current_status,
      in_calling_window: inWindow,
    };
  }

  public claimNextEnquiry(): Record<string, unknown> {
    if (!this.checkWindowOpen()) {
      return {
        success: true,
        claimed: false,
        reason: "CALLING_WINDOW_CLOSED",
        message: "Outside 9:00 AM - 10:00 PM IST calling window",
      };
    }

    // Check Dialer Lock
    const dialerLockState = this.systemState.get("DIALER_LOCK");
    if (dialerLockState) {
      const lockObj = JSON.parse(dialerLockState.state_value);
      if (lockObj.locked) {
        const lockedTime = new Date(lockObj.locked_at).getTime();
        const nowTime = Date.now();
        if (nowTime - lockedTime < 15 * 60 * 1000) {
          return {
            success: true,
            claimed: false,
            reason: "DIALER_BUSY",
            active_session: lockObj.session_id,
            locked_at: lockObj.locked_at,
          };
        } else {
          // Reconcile stale lock
          this.setSystemStateValue("DIALER_LOCK", {
            locked: false,
            session_id: null,
            enquiry_id: null,
            locked_at: null,
          });
        }
      }
    }

    const nowIso = new Date().toISOString();
    const freshCandidates: EnquiryRecord[] = [];
    const retryCandidates: EnquiryRecord[] = [];
    const backlogCandidates: EnquiryRecord[] = [];

    for (const record of this.enquiries.values()) {
      if (
        ["DO_NOT_CALL", "QUALIFIED", "DISQUALIFIED", "NOT_ANSWERED", "CALLING"].includes(
          record.current_status,
        )
      ) {
        continue;
      }
      if (record.customer_no_answer_count >= 3 || record.technical_failures_count >= 2) {
        continue;
      }

      if (
        (record.current_status === "NEW" || record.current_status === "QUEUED") &&
        record.queue_class === "FRESH"
      ) {
        freshCandidates.push(record);
      } else if (
        record.current_status === "RETRY_SCHEDULED" &&
        record.next_retry_at &&
        record.next_retry_at <= nowIso
      ) {
        retryCandidates.push(record);
      } else if (record.current_status === "QUEUED" && record.queue_class === "BACKLOG") {
        backlogCandidates.push(record);
      }
    }

    let selected: EnquiryRecord | null = null;
    if (freshCandidates.length > 0) {
      // Latest fresh enquiry first (created_at DESC)
      freshCandidates.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      selected = freshCandidates[0];
    } else if (retryCandidates.length > 0) {
      // Due retries second (next_retry_at ASC)
      retryCandidates.sort(
        (a, b) => new Date(a.next_retry_at!).getTime() - new Date(b.next_retry_at!).getTime(),
      );
      selected = retryCandidates[0];
    } else if (backlogCandidates.length > 0) {
      // Overnight backlog third (created_at ASC)
      backlogCandidates.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      selected = backlogCandidates[0];
    }

    if (!selected) {
      return { success: true, claimed: false, reason: "NO_DUE_ENQUIRIES" };
    }

    // Atomically claim
    const sessionId = `SES-${selected.enquiry_id}-${Date.now()}`;
    const newAttemptSeq = selected.attempt_sequence_count + 1;

    selected.current_status = "CALLING";
    selected.active_session_id = sessionId;
    selected.attempt_sequence_count = newAttemptSeq;
    selected.last_call_at = nowIso;

    this.setSystemStateValue("DIALER_LOCK", {
      locked: true,
      session_id: sessionId,
      enquiry_id: selected.enquiry_id,
      locked_at: nowIso,
    });
    this.setSystemStateValue("ACTIVE_SESSION", {
      active: true,
      session_id: sessionId,
      enquiry_id: selected.enquiry_id,
      started_at: nowIso,
    });

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
        technical_failures_count: selected.technical_failures_count,
      },
    };
  }

  public recordOutcome(outcome: Partial<CallOutcomeRecord> & { enquiry_id: string; outcome_id: string }) {
    if (!outcome.enquiry_id || !outcome.outcome_id) {
      return { success: false, error: "enquiry_id and outcome_id are required" };
    }

    // 1. Idempotency check on outcome_id
    if (this.outcomes.has(outcome.outcome_id)) {
      return {
        success: true,
        idempotent_duplicate: true,
        message: "Outcome already recorded",
        outcome_id: outcome.outcome_id,
      };
    }

    const enquiry = this.enquiries.get(outcome.enquiry_id);
    if (!enquiry) {
      return { success: false, error: `Enquiry not found: ${outcome.enquiry_id}` };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const disposition = (outcome.call_disposition || "UNKNOWN").toUpperCase() as CallOutcomeRecord["call_disposition"];
    const dndRequested = outcome.dnd_requested === true;

    let newStatus = enquiry.current_status;
    let newQueueClass = enquiry.queue_class;
    let nextRetryIso: string | null = null;
    let qualStatus = outcome.interested ? "INTERESTED" : "UNREACHED";

    // Branching logic
    if (dndRequested) {
      newStatus = "DO_NOT_CALL";
      qualStatus = "DND";
      newQueueClass = "NONE";
    } else if (disposition === "BUSY" || disposition === "NO_ANSWER") {
      enquiry.customer_no_answer_count += 1;
      if (enquiry.customer_no_answer_count < 3) {
        newStatus = "RETRY_SCHEDULED";
        newQueueClass = "RETRY";
        nextRetryIso = new Date(now.getTime() + 2 * 60 * 1000).toISOString();
      } else {
        newStatus = "NOT_ANSWERED";
        newQueueClass = "NONE";
        qualStatus = "UNREACHED";
      }
    } else if (disposition === "FAILED_TECH") {
      enquiry.technical_failures_count += 1;
      if (enquiry.technical_failures_count < 2) {
        newStatus = "RETRY_SCHEDULED";
        newQueueClass = "RETRY";
        const backoffMins = enquiry.technical_failures_count === 1 ? 1 : 5;
        nextRetryIso = new Date(now.getTime() + backoffMins * 60 * 1000).toISOString();
      } else {
        newStatus = "FAILED_TECHNICAL";
        newQueueClass = "NONE";
      }
    } else if (disposition === "ANSWERED") {
      newStatus = outcome.interested ? "QUALIFIED" : "DISQUALIFIED";
      newQueueClass = "NONE";
    }

    // Preserve immutable customer fields: customer_name, phone_number, project_interest, customer_notes
    enquiry.queue_class = newQueueClass as any;
    enquiry.current_status = newStatus as any;
    enquiry.last_call_at = nowIso;
    enquiry.next_retry_at = nextRetryIso;
    enquiry.latest_disposition = disposition;
    enquiry.qualification_status = qualStatus as any;
    enquiry.active_session_id = null;
    enquiry.latest_outcome_id = outcome.outcome_id;

    // Record outcome
    const outcomeRecord: CallOutcomeRecord = {
      outcome_id: outcome.outcome_id,
      enquiry_id: outcome.enquiry_id,
      attempt_sequence: outcome.attempt_sequence || enquiry.attempt_sequence_count,
      customer_attempt_number: outcome.customer_attempt_number ?? (disposition === "BUSY" || disposition === "NO_ANSWER" ? enquiry.customer_no_answer_count : null),
      channel: outcome.channel || "EXOTEL_PSTN",
      call_sid: outcome.call_sid || null,
      conversation_id: outcome.conversation_id || null,
      call_start_time: outcome.call_start_time || nowIso,
      duration_seconds: outcome.duration_seconds || 0,
      call_disposition: disposition,
      interested: outcome.interested ?? null,
      property_config: outcome.property_config || null,
      budget_range: outcome.budget_range || null,
      timeline: outcome.timeline || null,
      site_visit: outcome.site_visit || null,
      dnd_requested: dndRequested,
      qualification_summary: outcome.qualification_summary || null,
      recording_url: outcome.recording_url || null,
      transcript_summary: outcome.transcript_summary || null,
      recorded_at: nowIso,
    };

    this.outcomes.set(outcome.outcome_id, outcomeRecord);

    // Release lock
    this.setSystemStateValue("DIALER_LOCK", {
      locked: false,
      session_id: null,
      enquiry_id: null,
      locked_at: null,
    });
    this.setSystemStateValue("ACTIVE_SESSION", { active: false, session_id: null });

    return {
      success: true,
      outcome_id: outcome.outcome_id,
      enquiry_id: outcome.enquiry_id,
      new_status: newStatus,
      next_retry_at: nextRetryIso,
    };
  }

  public recordWebhookEvent(payload: Partial<WebhookEventRecord> & { event_id: string; provider: "ELEVENLABS" | "EXOTEL" }) {
    if (!payload.event_id || !payload.provider) {
      return { success: false, error: "event_id and provider are required" };
    }

    if (this.webhookEvents.has(payload.event_id)) {
      return {
        success: true,
        duplicate: true,
        message: "Webhook event already logged",
        event_id: payload.event_id,
      };
    }

    const nowIso = new Date().toISOString();
    const eventRecord: WebhookEventRecord = {
      event_id: payload.event_id,
      received_at: nowIso,
      provider: payload.provider,
      event_type: payload.event_type || "",
      idempotency_key: payload.idempotency_key || payload.event_id,
      enquiry_id: payload.enquiry_id || null,
      conversation_id: payload.conversation_id || null,
      call_sid: payload.call_sid || null,
      processing_status: payload.processing_status || "RECEIVED",
      error_details: payload.error_details || null,
      raw_payload: typeof payload.raw_payload === "object" ? JSON.stringify(payload.raw_payload) : String(payload.raw_payload || ""),
    };

    this.webhookEvents.set(payload.event_id, eventRecord);

    return {
      success: true,
      event_id: payload.event_id,
      status: eventRecord.processing_status,
    };
  }

  public acquireDialerLock(sessionId?: string, enquiryId?: string) {
    const current = this.getSystemStateValue("DIALER_LOCK");
    if (current?.locked) {
      const lockedTime = new Date(current.locked_at).getTime();
      const nowTime = Date.now();
      if (nowTime - lockedTime < 15 * 60 * 1000) {
        return {
          success: false,
          error: `Dialer already locked by session ${current.session_id}`,
          current_lock: current,
        };
      }
    }

    const nowIso = new Date().toISOString();
    const newLock = {
      locked: true,
      session_id: sessionId || `SES-${Date.now()}`,
      enquiry_id: enquiryId || null,
      locked_at: nowIso,
    };

    this.setSystemStateValue("DIALER_LOCK", newLock);
    return { success: true, lock: newLock };
  }

  public releaseDialerLock(sessionId?: string) {
    const current = this.getSystemStateValue("DIALER_LOCK");
    if (current?.locked && sessionId && current.session_id !== sessionId) {
      return {
        success: false,
        error: `Cannot release lock owned by different session: ${current.session_id}`,
      };
    }

    this.setSystemStateValue("DIALER_LOCK", {
      locked: false,
      session_id: null,
      enquiry_id: null,
      locked_at: null,
    });
    this.setSystemStateValue("ACTIVE_SESSION", { active: false, session_id: null });

    return { success: true, message: "Lock released successfully" };
  }

  public reconcileStaleLocks() {
    const current = this.getSystemStateValue("DIALER_LOCK");
    if (!current?.locked) {
      return { success: true, message: "Dialer is not locked", reconciled: false };
    }

    const lockedTime = new Date(current.locked_at).getTime();
    const nowTime = Date.now();
    const elapsedMs = nowTime - lockedTime;

    if (elapsedMs >= 15 * 60 * 1000) {
      this.setSystemStateValue("DIALER_LOCK", {
        locked: false,
        session_id: null,
        enquiry_id: null,
        locked_at: null,
        reconciled_stale_lock: current.session_id,
      });
      this.setSystemStateValue("ACTIVE_SESSION", { active: false, session_id: null });
      return { success: true, reconciled: true, message: `Reconciled stale lock for session ${current.session_id}` };
    }

    return { success: true, reconciled: false, elapsed_seconds: Math.floor(elapsedMs / 1000) };
  }

  public getSystemState() {
    const data: Record<string, unknown> = {};
    for (const [k, v] of this.systemState.entries()) {
      try {
        data[k] = JSON.parse(v.state_value);
      } catch {
        data[k] = v.state_value;
      }
    }
    return { success: true, data };
  }

  private getSystemStateValue(key: string): any {
    const rec = this.systemState.get(key);
    if (!rec) return null;
    try {
      return JSON.parse(rec.state_value);
    } catch {
      return rec.state_value;
    }
  }

  private setSystemStateValue(key: string, value: any, updatedBy: string = "SYSTEM"): void {
    const nowIso = new Date().toISOString();
    const strVal = typeof value === "object" ? JSON.stringify(value) : String(value);
    this.systemState.set(key, {
      state_key: key,
      state_value: strVal,
      updated_at: nowIso,
      updated_by: updatedBy,
      notes: null,
    });
  }
}

// Singleton test double instance
export const hskSheetsTestDouble = new HskSheetsTestDouble();
