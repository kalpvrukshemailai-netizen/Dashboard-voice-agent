/**
 * HSK Builder Group AI Calling Platform
 * Call Outcomes API Route
 *
 * Endpoint: GET /api/calls
 * Retrieves verified call outcomes from the Call_Outcomes sheet tab.
 */

import { NextResponse } from "next/server";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const enquiryId = searchParams.get("enquiry_id") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;

    let result: { success: boolean; count?: number; outcomes?: any[]; error?: string };
    try {
      result = await hskSheetsClient.getCallOutcomes({
        enquiry_id: enquiryId,
        limit,
      });
    } catch (err: any) {
      if (err?.message?.includes("Unknown action: getCallOutcomes")) {
        return NextResponse.json({
          success: true,
          count: 0,
          outcomes: [],
          note: "Google Apps Script deployment does not yet include getCallOutcomes. Deploy updated Code.js to sync live Call_Outcomes.",
        });
      }
      throw err;
    }

    if (!result.success) {
      if (result.error?.includes("Unknown action: getCallOutcomes")) {
        return NextResponse.json({
          success: true,
          count: 0,
          outcomes: [],
          note: "Google Apps Script deployment does not yet include getCallOutcomes. Deploy updated Code.js to sync live Call_Outcomes.",
        });
      }
      return NextResponse.json(
        { success: false, error: result.error || "Failed to retrieve call outcomes", outcomes: [], count: 0 },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      count: result.count || (result.outcomes ? result.outcomes.length : 0),
      outcomes: result.outcomes || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load call outcomes";
    return NextResponse.json({ success: false, error: message, outcomes: [], count: 0 }, { status: 500 });
  }
}
