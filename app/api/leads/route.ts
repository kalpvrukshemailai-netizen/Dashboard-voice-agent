import { NextResponse } from "next/server";
import { hskSheetsClient } from "@/lib/hsk-sheets-client";
import { EnquiryRecord } from "@/lib/hsk-sheets-schema";
import { Lead, CallStatus, FALLBACK_DEMO_LEADS } from "@/lib/google-sheets";

function mapHskEnquiryToLead(enq: EnquiryRecord, idx: number): Lead {
  let callStatus: CallStatus = "Pending";
  if (enq.current_status === "CALLING") callStatus = "Calling";
  else if (enq.current_status === "QUALIFIED" || enq.current_status === "DISQUALIFIED") callStatus = "Completed";
  else if (enq.current_status === "FAILED_TECHNICAL" || enq.current_status === "NOT_ANSWERED" || enq.current_status === "DO_NOT_CALL") callStatus = "Failed";

  const isInterested =
    enq.qualification_status === "INTERESTED"
      ? true
      : enq.qualification_status === "NOT_INTERESTED"
      ? false
      : null;

  return {
    row: idx + 2,
    name: enq.customer_name,
    phone: enq.phone_number,
    company: "HSK Prospect",
    notes: enq.customer_notes || "",
    callStatus,
    interested: isInterested,
    interestStatus: enq.qualification_status || null,
    propertyInterest: enq.project_interest || "HSK Builder Group",
    budgetRange: null,
    preferredLocation: null,
    timeline: null,
    nextStepType:
      enq.current_status === "QUALIFIED"
        ? "Schedule Site Visit"
        : enq.current_status === "RETRY_SCHEDULED"
        ? "Pending Retry"
        : null,
    interestReason: enq.error_details || null,
    conversationId: enq.active_session_id || enq.latest_outcome_id || null,
    calledAt: enq.last_call_at || null,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;

    const result = await hskSheetsClient.getEnquiries({ limit });
    const enquiries = (result.enquiries as EnquiryRecord[]) || [];

    if (enquiries.length > 0) {
      const mappedLeads = enquiries.map((enq, idx) => mapHskEnquiryToLead(enq, idx));
      return NextResponse.json({
        success: true,
        isDemo: false,
        source: "google_sheet",
        leads: mappedLeads,
      });
    }

    return NextResponse.json({
      success: true,
      isDemo: true,
      source: "demo_fallback",
      leads: FALLBACK_DEMO_LEADS,
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
    const limit = body.limit ? Number(body.limit) : 100;

    const result = await hskSheetsClient.getEnquiries({ limit });
    const enquiries = (result.enquiries as EnquiryRecord[]) || [];

    if (enquiries.length > 0) {
      const mappedLeads = enquiries.map((enq, idx) => mapHskEnquiryToLead(enq, idx));
      return NextResponse.json({
        success: true,
        isDemo: false,
        source: "google_sheet",
        leads: mappedLeads,
      });
    }

    return NextResponse.json({
      success: true,
      isDemo: true,
      source: "demo_fallback",
      leads: FALLBACK_DEMO_LEADS,
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
