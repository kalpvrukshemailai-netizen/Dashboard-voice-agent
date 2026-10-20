import { NextResponse } from "next/server";
import { callAppsScript } from "../lib_apps_script";
import { mapRawLeadToLead, GoogleSheetLeadRaw, FALLBACK_DEMO_LEADS } from "@/lib/google-sheets";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get("spreadsheetId") || "";
    const tab = searchParams.get("tab") || "Sheet1";

    const payload: Record<string, unknown> = {
      action: "getLeads",
      tab,
    };
    if (spreadsheetId && spreadsheetId !== "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms") {
      payload.spreadsheetId = spreadsheetId;
    }

    const result = await callAppsScript(payload);
    const rawLeads = (result.leads as GoogleSheetLeadRaw[]) || [];
    const mappedLeads = rawLeads.map((raw, idx) => mapRawLeadToLead(raw, idx + 2));

    return NextResponse.json({
      success: true,
      isDemo: false,
      source: "google_sheet",
      leads: mappedLeads,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to load leads from Google Sheets";
    return NextResponse.json({
      success: true,
      isDemo: true,
      source: "demo_fallback",
      leads: FALLBACK_DEMO_LEADS,
      warning: errMsg,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const spreadsheetId = String(body.spreadsheetId || "").trim();
    const tab = String(body.tab || "Sheet1").trim();

    const payload: Record<string, unknown> = {
      action: "getLeads",
      tab,
    };
    if (spreadsheetId && spreadsheetId !== "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms") {
      payload.spreadsheetId = spreadsheetId;
    }

    const result = await callAppsScript(payload);
    const rawLeads = (result.leads as GoogleSheetLeadRaw[]) || [];
    const mappedLeads = rawLeads.map((raw, idx) => mapRawLeadToLead(raw, idx + 2));

    return NextResponse.json({
      success: true,
      isDemo: false,
      source: "google_sheet",
      leads: mappedLeads,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to load leads from Google Sheets";
    return NextResponse.json({
      success: true,
      isDemo: true,
      source: "demo_fallback",
      leads: FALLBACK_DEMO_LEADS,
      warning: errMsg,
    });
  }
}
