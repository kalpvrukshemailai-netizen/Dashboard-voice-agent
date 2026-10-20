/**
 * HSK Builder Group AI Calling Platform
 * Website Enquiry Intake API Route
 *
 * Endpoint: POST /api/enquiries
 * Handles server-side validation, phone normalization, duplicate suppression,
 * calling window check, and persistence to the Enquiries Google Sheet tab.
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
    const body = await req.json().catch(() => ({}));

    const rawName = String(body.customer_name ?? body.name ?? "").trim();
    const rawPhone = String(body.phone_number ?? body.phone ?? "").trim();
    const projectInterest = String(body.project_interest ?? body.project ?? "General").trim();
    const customerNotes = String(body.customer_notes ?? body.notes ?? "").trim();
    const source = String(body.source ?? "Website").trim();
    const utmCampaign = String(body.utm_campaign ?? body.campaign ?? "").trim();

    // 1. Validation
    if (!rawName) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
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
    // E.164 phone validation (e.g. +91 followed by 10 digits)
    if (!/^\+\d{10,15}$/.test(cleanPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone number format. Please provide a valid 10-digit mobile number.",
        },
        { status: 400 },
      );
    }

    // 2. Calling Window Check
    const inCallingWindow = isCallingWindowOpen();
    const nextWindowOpening = !inCallingWindow ? getNextWindowOpeningTime().toISOString() : null;

    // 3. Persist to Google Sheet
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

    return NextResponse.json({
      success: true,
      enquiry_id: result.enquiry_id,
      is_duplicate: result.is_duplicate || false,
      queue_class: result.queue_class,
      current_status: result.current_status,
      in_calling_window: inCallingWindow,
      next_calling_window_opens_at: nextWindowOpening,
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
