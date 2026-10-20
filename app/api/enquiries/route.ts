/**
 * HSK Builder Group AI Calling Platform
 * Website Enquiry Intake API Route (Hardened)
 *
 * Endpoint: POST /api/enquiries
 * Handles server-side validation, E.164 phone normalization, duplicate suppression,
 * calling window check, persistence to Enquiries Google Sheet tab, and intake fast path.
 */

import { NextResponse } from "next/server";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";
import {
  normalizePhoneNumber,
  isCallingWindowOpen,
  getNextWindowOpeningTime,
} from "@/lib/hsk-sheets-schema";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    const rawName = String(body.customer_name ?? body.name ?? "").trim();
    const rawPhone = String(body.phone_number ?? body.phone ?? "").trim();
    const projectInterest = String(body.project_interest ?? body.project ?? "General").trim();
    const customerNotes = String(body.customer_notes ?? body.notes ?? "").trim();
    const source = String(body.source ?? "Website").trim();
    const utmCampaign = String(body.utm_campaign ?? body.campaign ?? "").trim();

    // 1. Rigorous Validation
    if (!rawName || rawName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Customer name is required (minimum 2 characters)" },
        { status: 400 },
      );
    }

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 },
      );
    }

    const cleanPhone = normalizePhoneNumber(rawPhone);
    // E.164 phone validation (e.g. +91 followed by 10 digits for India)
    if (!/^\+\d{10,15}$/.test(cleanPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone number format. Please provide a valid 10-digit mobile number.",
        },
        { status: 400 },
      );
    }

    // 2. Calling Hours Gate Check (9:00 AM - 10:00 PM IST)
    const inCallingWindow = isCallingWindowOpen();
    const nextWindowOpening = !inCallingWindow ? getNextWindowOpeningTime().toISOString() : null;

    // 3. Persist to Google Sheet (or Test Double)
    const result = await hskSheetsClient.createEnquiry({
      customer_name: rawName,
      phone_number: cleanPhone,
      project_interest: projectInterest,
      customer_notes: customerNotes,
      source,
      utm_campaign: utmCampaign,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to persist enquiry" },
        { status: 500 },
      );
    }

    // 4. Fast-Path Opportunity Evaluation
    // If inside calling window and not a duplicate, check if dialer is available for immediate intake
    let fastPathEligible = false;
    if (inCallingWindow && !result.is_duplicate) {
      const stateRes = await hskSheetsClient.getSystemState();
      const isLocked = stateRes?.data?.DIALER_LOCK?.locked === true;
      fastPathEligible = !isLocked;
    }

    return NextResponse.json({
      success: true,
      enquiry_id: result.enquiry_id,
      is_duplicate: result.is_duplicate || false,
      queue_class: result.queue_class,
      current_status: result.current_status,
      in_calling_window: inCallingWindow,
      next_calling_window_opens_at: nextWindowOpening,
      fast_path_eligible: fastPathEligible,
      message: result.is_duplicate
        ? "Existing pending enquiry recognized"
        : inCallingWindow
        ? "Enquiry received. Added to FRESH queue for outbound calling."
        : "Enquiry received outside calling hours (9 AM - 10 PM IST). Added to overnight BACKLOG queue.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const queueClass = searchParams.get("queue_class") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const result = await hskSheetsClient.getEnquiries({
      status,
      queue_class: queueClass,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve enquiries";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
