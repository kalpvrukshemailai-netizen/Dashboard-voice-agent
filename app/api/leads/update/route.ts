import { NextResponse } from "next/server";
import { callAppsScript } from "../../lib_apps_script";

// Allowed qualification/output fields only (Rule 6). CRM identity fields (lead_name, phone) are strictly protected.
const ALLOWED_UPDATE_FIELDS = [
  "call_status",
  "interested",
  "interest_status",
  "property_interest",
  "budget_range",
  "preferred_location",
  "timeline",
  "next_step_type",
  "interest_reason",
  "conversation_id",
  "called_at",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sheetRow = Number(body.sheet_row ?? body.sheetRow ?? body.row);
    const rawUpdates = body.updates;
    const spreadsheetId = String(body.spreadsheetId || "").trim();
    const tab = String(body.tab || "Sheet1").trim();

    if (!sheetRow || sheetRow < 2) {
      return NextResponse.json(
        { success: false, error: "Valid sheet_row (row >= 2) is required." },
        { status: 400 },
      );
    }

    if (!rawUpdates || typeof rawUpdates !== "object") {
      return NextResponse.json(
        { success: false, error: "Updates object is required." },
        { status: 400 },
      );
    }

    // Filter and sanitize updates to protect CRM identity fields (Rule 6)
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rawUpdates)) {
      const normKey = key.toLowerCase().trim().replace(/[-\s]+/g, "_");
      // Rule 6: Never update lead_name or phone from AI extraction / updates
      if (
        normKey === "lead_name" ||
        normKey === "name" ||
        normKey === "phone" ||
        normKey === "lead_phone"
      ) {
        continue;
      }
      if (!ALLOWED_UPDATE_FIELDS.includes(normKey)) {
        continue;
      }
      // Rule 6: Do not replace missing values with literal string "null" or "undefined"
      if (
        val == null ||
        val === "null" ||
        val === "undefined" ||
        val === "None" ||
        val === "NaN"
      ) {
        continue;
      }
      sanitizedUpdates[normKey] = val;
    }

    // Call Google Apps Script updateLead action
    // Pass both sheet_row and sheetRow for full backward/forward compatibility
    try {
      const payload: Record<string, unknown> = {
        action: "updateLead",
        tab,
        sheet_row: sheetRow,
        sheetRow,
        row: sheetRow,
        updates: sanitizedUpdates,
      };
      if (spreadsheetId && spreadsheetId !== "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms") {
        payload.spreadsheetId = spreadsheetId;
      }

      const result = await callAppsScript(payload);

      return NextResponse.json({
        success: true,
        sheet_row: sheetRow,
        result,
      });
    } catch (appsScriptErr) {
      // If no spreadsheet ID was configured and Apps Script is not available, return demo echo
      if (!spreadsheetId && !process.env.GOOGLE_APPS_SCRIPT_URL) {
        return NextResponse.json({
          success: true,
          sheet_row: sheetRow,
          demoMode: true,
          updates: sanitizedUpdates,
        });
      }
      throw appsScriptErr;
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to update Google Sheet row";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 502 },
    );
  }
}

