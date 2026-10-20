import { NextResponse } from "next/server";
import { callAppsScript } from "../../lib_apps_script";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await callAppsScript({
      action: "getLeads",
      spreadsheetId: String(body.spreadsheetId ?? ""),
      tab: String(body.tab ?? "Sheet1"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load leads" },
      { status: 400 },
    );
  }
}
