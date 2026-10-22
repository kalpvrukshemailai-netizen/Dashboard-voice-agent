/**
 * HSK Builder Group AI Calling Platform
 * Unified Google Sheets & Apps Script Client (Hardened)
 *
 * Bridges Next.js server endpoints to the deployed Google Apps Script Web App
 * or the in-memory test double for testing and offline development.
 */

import type {
  EnquiryRecord,
  CallOutcomeRecord,
  WebhookEventRecord,
} from "./hsk-sheets-schema.ts";
import { hskSheetsTestDouble } from "./hsk-sheets-test-double.ts";

export interface HskClientConfig {
  appsScriptUrl?: string;
  spreadsheetId?: string;
  sharedSecret?: string;
  useTestDouble?: boolean;
}

export class HskSheetsClient {
  private appsScriptUrl: string;
  private spreadsheetId?: string;
  private sharedSecret: string;
  private useTestDouble: boolean;

  constructor(config?: HskClientConfig) {
    this.appsScriptUrl = config?.appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || "";
    this.spreadsheetId = config?.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;
    this.sharedSecret = config?.sharedSecret || process.env.HSK_APPS_SCRIPT_SHARED_SECRET || "";
    this.useTestDouble =
      config?.useTestDouble ??
      (process.env.HSK_USE_TEST_DOUBLE === "true" ||
        process.env.NODE_ENV === "test" ||
        !this.appsScriptUrl);
  }

  private async execute(action: string, payload: Record<string, unknown> = {}): Promise<any> {
    const authPayload = {
      shared_secret: this.sharedSecret,
      ...payload,
    };

    if (this.useTestDouble) {
      return this.executeOnTestDouble(action, authPayload);
    }

    const bodyPayload = {
      action,
      spreadsheetId: this.spreadsheetId,
      ...authPayload,
    };

    const response = await fetch(this.appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
      cache: "no-store",
      redirect: "follow",
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`Google Apps Script returned invalid JSON (HTTP ${response.status}): ${text.slice(0, 150)}`);
    }

    if (!response.ok || data.success === false) {
      throw new Error(String(data.error || `Apps Script request failed (HTTP ${response.status})`));
    }

    return data;
  }

  private executeOnTestDouble(action: string, payload: Record<string, unknown>): any {
    switch (action) {
      case "initializeTabs":
        return hskSheetsTestDouble.initializeTabs(payload as any);
      case "getEnquiries":
        return hskSheetsTestDouble.getEnquiries(payload as any);
      case "createEnquiry":
        return hskSheetsTestDouble.createEnquiry(payload as any);
      case "claimNextEnquiry":
        return hskSheetsTestDouble.claimNextEnquiry(payload as any);
      case "recordOutcome":
        return hskSheetsTestDouble.recordOutcome(payload as any);
      case "recordWebhookEvent":
        return hskSheetsTestDouble.recordWebhookEvent(payload as any);
      case "acquireDialerLock":
        return hskSheetsTestDouble.acquireDialerLock(payload.session_id as string, payload.enquiry_id as string, payload.shared_secret as string);
      case "releaseDialerLock":
        return hskSheetsTestDouble.releaseDialerLock(payload.session_id as string, payload.force as boolean, payload.authorized_by as string, payload.shared_secret as string);
      case "reconcileStaleLocks":
        return hskSheetsTestDouble.reconcileStaleLocks(payload as any);
      case "getSystemState":
        return hskSheetsTestDouble.getSystemState(payload.shared_secret as string);
      case "getCallOutcomes":
        return hskSheetsTestDouble.getCallOutcomes(payload as any);
      case "getWebhookEvents":
        return hskSheetsTestDouble.getWebhookEvents(payload as any);
      default:
        throw new Error(`Unknown action on test double: ${action}`);
    }
  }

  public async initializeTabs() {
    return this.execute("initializeTabs");
  }

  public async getEnquiries(options?: { status?: string; queue_class?: string; limit?: number }) {
    return this.execute("getEnquiries", options || {});
  }

  public async getCallOutcomes(options?: { enquiry_id?: string; limit?: number }) {
    try {
      return await this.execute("getCallOutcomes", options || {});
    } catch (err: any) {
      if (err?.message?.includes("Unknown action: getCallOutcomes") && this.spreadsheetId && !this.useTestDouble) {
        try {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=1001`;
          const res = await fetch(exportUrl, { cache: "no-store" });
          if (res.ok) {
            const csv = await res.text();
            const lines = csv.trim().split("\n");
            if (lines.length > 1) {
              const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
              let outcomes: any[] = [];
              for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const row = lines[i].split(",").map((c) => c.replace(/"/g, "").trim());
                const record: Record<string, any> = {};
                headers.forEach((h, idx) => {
                  record[h] = row[idx] || "";
                });
                if (record.interested === "TRUE") record.interested = true;
                if (record.interested === "FALSE") record.interested = false;
                if (record.duration_seconds) record.duration_seconds = Number(record.duration_seconds) || 0;
                if (record.attempt_sequence) record.attempt_sequence = Number(record.attempt_sequence) || 1;

                if (options?.enquiry_id && record.enquiry_id !== options.enquiry_id) {
                  continue;
                }
                outcomes.push(record);
              }
              if (options?.limit) outcomes = outcomes.slice(0, options.limit);
              return { success: true, count: outcomes.length, outcomes, source: "google_sheet_direct" };
            }
            return { success: true, count: 0, outcomes: [], source: "google_sheet_direct" };
          }
        } catch {
          // Fall through to original error
        }
      }
      throw err;
    }
  }

  public async getWebhookEvents(options?: { limit?: number }) {
    try {
      return await this.execute("getWebhookEvents", options || {});
    } catch (err: any) {
      if (err?.message?.includes("Unknown action: getWebhookEvents") && this.spreadsheetId && !this.useTestDouble) {
        try {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=1002`;
          const res = await fetch(exportUrl, { cache: "no-store" });
          if (res.ok) {
            const csv = await res.text();
            const lines = csv.trim().split("\n");
            if (lines.length > 1) {
              const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
              let events: any[] = [];
              for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const row = lines[i].split(",").map((c) => c.replace(/"/g, "").trim());
                const record: Record<string, any> = {};
                headers.forEach((h, idx) => {
                  record[h] = row[idx] || "";
                });
                events.push(record);
              }
              if (options?.limit) events = events.slice(0, options.limit);
              return { success: true, count: events.length, events, source: "google_sheet_direct" };
            }
            return { success: true, count: 0, events: [], source: "google_sheet_direct" };
          }
        } catch {
          // Fall through
        }
      }
      throw err;
    }
  }

  public async createEnquiry(
    enquiry: Partial<EnquiryRecord> & Record<string, unknown> & {
      customer_name?: string;
      phone_number?: string;
      name?: string;
      phone?: string;
    },
  ) {
    return this.execute("createEnquiry", enquiry);
  }

  public async claimNextEnquiry() {
    return this.execute("claimNextEnquiry");
  }

  public async recordOutcome(
    outcome: Partial<CallOutcomeRecord> & {
      enquiry_id: string;
      outcome_id: string;
      auto_technical_retries_enabled?: boolean;
      max_technical_retries?: number;
    },
  ) {
    const autoTech =
      outcome.auto_technical_retries_enabled ??
      (process.env.ENABLE_AUTO_TECHNICAL_RETRIES === "true");
    const maxTech =
      outcome.max_technical_retries ??
      parseInt(process.env.MAX_TECHNICAL_RETRIES || "0", 10);

    return this.execute("recordOutcome", {
      ...outcome,
      auto_technical_retries_enabled: autoTech,
      max_technical_retries: maxTech,
    });
  }

  public async recordWebhookEvent(event: Partial<WebhookEventRecord> & { event_id: string; provider: "ELEVENLABS" | "EXOTEL" }) {
    return this.execute("recordWebhookEvent", event);
  }

  public async acquireDialerLock(sessionId?: string, enquiryId?: string) {
    return this.execute("acquireDialerLock", { session_id: sessionId, enquiry_id: enquiryId });
  }

  public async releaseDialerLock(sessionId?: string, force?: boolean, authorizedBy?: string) {
    return this.execute("releaseDialerLock", { session_id: sessionId, force, authorized_by: authorizedBy });
  }

  public async reconcileStaleLocks(force?: boolean, authorizedBy?: string) {
    return this.execute("reconcileStaleLocks", { force, authorized_by: authorizedBy });
  }

  public async getSystemState() {
    return this.execute("getSystemState");
  }
}

// Default export singleton
export const hskSheetsClient = new HskSheetsClient();
