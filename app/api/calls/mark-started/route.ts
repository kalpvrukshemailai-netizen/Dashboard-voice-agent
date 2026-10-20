import { NextResponse } from "next/server";
import { callAppsScript } from "../../lib_apps_script";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sheetRow = Number(body.sheetRow ?? body.sheet_row ?? body.row);
    if (!sheetRow || sheetRow < 2) throw new Error("Valid sheet_row (row >= 2) is required");

    const spreadsheetId = String(body.spreadsheetId ?? "").trim();
    const payload: Record<string, unknown> = {
      action: "updateLead",
      tab: String(body.tab ?? "Sheet1"),
      sheet_row: sheetRow,
      sheetRow: sheetRow,
      row: sheetRow,
      updates: {
        call_status: "in_progress",
        called_at: new Date().toISOString(),
      },
    };
    if (spreadsheetId && spreadsheetId !== "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms") {
      payload.spreadsheetId = spreadsheetId;
    }

    const result = await callAppsScript(payload);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark call" },
      { status: 400 },
    );
  }
}

