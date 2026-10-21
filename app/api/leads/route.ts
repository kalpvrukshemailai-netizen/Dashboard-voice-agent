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
    enquiryId: enq.enquiry_id,
    queueClass: enq.queue_class,
    attemptSequenceCount: enq.attempt_sequence_count,
    customerNoAnswerCount: enq.customer_no_answer_count,
    nextRetryAt: enq.next_retry_at,
    latestOutcomeId: enq.latest_outcome_id,
    latestDisposition: enq.latest_disposition,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isExplicitDemo = searchParams.get("demo") === "true";
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;

  if (isExplicitDemo) {
    return NextResponse.json({
      success: true,
      isDemo: true,
      source: "demo_sample",
      leads: FALLBACK_DEMO_LEADS,
      count: FALLBACK_DEMO_LEADS.length,
    });
  }

  try {
    const result = await hskSheetsClient.getEnquiries({ limit });

    if (result && result.success) {
      const enquiries = (result.enquiries as EnquiryRecord[]) || [];
      const mappedLeads = enquiries.map((enq, idx) => mapHskEnquiryToLead(enq, idx));
      return NextResponse.json({
        success: true,
        isDemo: false,
        source: "google_sheet",
        leads: mappedLeads,
        count: mappedLeads.length,
      });
    }

    return NextResponse.json(
      {
        success: false,
        isDemo: false,
        source: "google_sheet",
        error: result?.error || "Google Sheets returned unsuccessful response",
        leads: [],
        count: 0,
      },
      { status: 502 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to load leads from Google Sheets";
    return NextResponse.json(
      {
        success: false,
        isDemo: false,
        source: "google_sheet",
        error: errMsg,
        leads: [],
        count: 0,
      },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const isExplicitDemo = body.demo === true;
  const limit = body.limit ? Number(body.limit) : 100;

  if (isExplicitDemo) {
    return NextResponse.json({
      success: true,
      isDemo: true,
      source: "demo_sample",
      leads: FALLBACK_DEMO_LEADS,
      count: FALLBACK_DEMO_LEADS.length,
    });
  }

  try {
    const result = await hskSheetsClient.getEnquiries({ limit });

    if (result && result.success) {
      const enquiries = (result.enquiries as EnquiryRecord[]) || [];
      const mappedLeads = enquiries.map((enq, idx) => mapHskEnquiryToLead(enq, idx));
      return NextResponse.json({
        success: true,
        isDemo: false,
        source: "google_sheet",
        leads: mappedLeads,
        count: mappedLeads.length,
      });
    }

    return NextResponse.json(
      {
        success: false,
        isDemo: false,
        source: "google_sheet",
        error: result?.error || "Google Sheets returned unsuccessful response",
        leads: [],
        count: 0,
      },
      { status: 502 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to load leads from Google Sheets";
    return NextResponse.json(
      {
        success: false,
        isDemo: false,
        source: "google_sheet",
        error: errMsg,
        leads: [],
        count: 0,
      },
      { status: 502 },
    );
  }
}
