/**
 * HSK Builder Group AI Calling Platform
 * Unified Google Sheets & Apps Script Client
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
  useTestDouble?: boolean;
}

export class HskSheetsClient {
  private appsScriptUrl: string;
  private spreadsheetId?: string;
  private useTestDouble: boolean;

  constructor(config?: HskClientConfig) {
    this.appsScriptUrl = config?.appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || "";
    this.spreadsheetId = config?.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;
    this.useTestDouble =
      config?.useTestDouble ??
      (process.env.HSK_USE_TEST_DOUBLE === "true" ||
        process.env.NODE_ENV === "test" ||
        !this.appsScriptUrl);
  }

  private async execute(action: string, payload: Record<string, unknown> = {}): Promise<any> {
    if (this.useTestDouble) {
      return this.executeOnTestDouble(action, payload);
    }

    const bodyPayload = {
      action,
      spreadsheetId: this.spreadsheetId,
      ...payload,
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
        return hskSheetsTestDouble.initializeTabs();
      case "getEnquiries":
        return hskSheetsTestDouble.getEnquiries(payload as any);
      case "createEnquiry":
        return hskSheetsTestDouble.createEnquiry(payload as any);
      case "claimNextEnquiry":
        return hskSheetsTestDouble.claimNextEnquiry();
      case "recordOutcome":
        return hskSheetsTestDouble.recordOutcome(payload as any);
      case "recordWebhookEvent":
        return hskSheetsTestDouble.recordWebhookEvent(payload as any);
      case "acquireDialerLock":
        return hskSheetsTestDouble.acquireDialerLock(payload.session_id as string, payload.enquiry_id as string);
      case "releaseDialerLock":
        return hskSheetsTestDouble.releaseDialerLock(payload.session_id as string);
      case "reconcileStaleLocks":
        return hskSheetsTestDouble.reconcileStaleLocks();
      case "getSystemState":
        return hskSheetsTestDouble.getSystemState();
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

  public async createEnquiry(enquiry: Partial<EnquiryRecord> & { customer_name: string; phone_number: string }) {
    return this.execute("createEnquiry", enquiry);
  }

  public async claimNextEnquiry() {
    return this.execute("claimNextEnquiry");
  }

  public async recordOutcome(outcome: Partial<CallOutcomeRecord> & { enquiry_id: string; outcome_id: string }) {
    return this.execute("recordOutcome", outcome);
  }

  public async recordWebhookEvent(event: Partial<WebhookEventRecord> & { event_id: string; provider: "ELEVENLABS" | "EXOTEL" }) {
    return this.execute("recordWebhookEvent", event);
  }

  public async acquireDialerLock(sessionId?: string, enquiryId?: string) {
    return this.execute("acquireDialerLock", { session_id: sessionId, enquiry_id: enquiryId });
  }

  public async releaseDialerLock(sessionId?: string) {
    return this.execute("releaseDialerLock", { session_id: sessionId });
  }

  public async reconcileStaleLocks() {
    return this.execute("reconcileStaleLocks");
  }

  public async getSystemState() {
    return this.execute("getSystemState");
  }
}

// Default export singleton
export const hskSheetsClient = new HskSheetsClient();
