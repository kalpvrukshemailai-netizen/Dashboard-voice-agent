/**
 * HSK Builder Group AI Calling Platform
 * System State & Operator Monitoring Endpoint
 *
 * GET /api/system/state: Returns dialer lock, active session, heartbeat, and calling window status
 * POST /api/system/state: Allows operator lock release or manual trigger
 */

import { NextResponse } from "next/server";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";
import { isCallingWindowOpen, getNextWindowOpeningTime } from "@/lib/hsk-sheets-schema";

export async function GET() {
  try {
    const stateRes = await hskSheetsClient.getSystemState();
    const inWindow = isCallingWindowOpen();
    const nextWindow = !inWindow ? getNextWindowOpeningTime().toISOString() : null;

    return NextResponse.json({
      success: true,
      calling_window_open: inWindow,
      next_calling_window_opens_at: nextWindow,
      timezone: "Asia/Kolkata",
      system_state: stateRes.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch system state";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (action === "release_lock") {
      const sessionId = body.session_id ? String(body.session_id) : undefined;
      const res = await hskSheetsClient.releaseDialerLock(sessionId);
      return NextResponse.json(res);
    }

    if (action === "reconcile_locks") {
      const res = await hskSheetsClient.reconcileStaleLocks();
      return NextResponse.json(res);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported: release_lock, reconcile_locks" },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "State modification error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
