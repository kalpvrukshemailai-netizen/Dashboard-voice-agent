export type CallStatus = "Pending" | "Calling" | "Completed" | "Failed";

export interface Lead {
  row: number;
  name: string;
  phone: string;
  company: string;
  notes: string;
  callStatus: CallStatus;
  interested: boolean | null;
  interestStatus: string | null;
  propertyInterest: string | null;
  budgetRange: string | null;
  preferredLocation: string | null;
  timeline: string | null;
  nextStepType: string | null;
  interestReason: string | null;
  conversationId: string | null;
  calledAt: string | null;
}

export interface GoogleSheetLeadRaw {
  sheetRow?: number;
  row?: number;
  lead_name?: string;
  name?: string;
  phone?: string;
  company_name?: string;
  company?: string;
  lead_notes?: string;
  notes?: string;
  call_status?: string;
  interested?: boolean | string | number | null;
  interest_status?: string | null;
  property_interest?: string | null;
  budget_range?: string | null;
  preferred_location?: string | null;
  timeline?: string | null;
  next_step_type?: string | null;
  interest_reason?: string | null;
  conversation_id?: string | null;
  called_at?: string | null;
  [key: string]: unknown;
}

export function normalizeCallStatus(val?: unknown): CallStatus {
  if (!val) return "Pending";
  const s = String(val).trim().toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "calling" || s === "in_progress" || s === "in progress") return "Calling";
  if (s === "failed" || s === "busy" || s === "no_answer") return "Failed";
  return "Pending";
}

export function normalizeBoolean(val?: unknown): boolean | null {
  if (val === true || val === "true" || val === 1 || val === "1") return true;
  if (val === false || val === "false" || val === 0 || val === "0") return false;
  return null;
}

export function mapRawLeadToLead(raw: GoogleSheetLeadRaw, fallbackRow: number): Lead {
  const rowNumber = Number(raw.sheetRow ?? raw.row ?? fallbackRow);
  const name = String(raw.lead_name ?? raw.name ?? "").trim();
  const phone = String(raw.phone ?? "").trim();
  const company = String(raw.company_name ?? raw.company ?? "").trim();
  const notes = String(raw.lead_notes ?? raw.notes ?? "").trim();
  const callStatus = normalizeCallStatus(raw.call_status);
  const interested = normalizeBoolean(raw.interested);
  const interestStatus = raw.interest_status ? String(raw.interest_status).trim() : null;
  const propertyInterest = raw.property_interest ? String(raw.property_interest).trim() : null;
  const budgetRange = raw.budget_range ? String(raw.budget_range).trim() : null;
  const preferredLocation = raw.preferred_location ? String(raw.preferred_location).trim() : null;
  const timeline = raw.timeline ? String(raw.timeline).trim() : null;
  const nextStepType = raw.next_step_type ? String(raw.next_step_type).trim() : null;
  const interestReason = raw.interest_reason ? String(raw.interest_reason).trim() : null;
  const conversationId = raw.conversation_id ? String(raw.conversation_id).trim() : null;
  const calledAt = raw.called_at ? String(raw.called_at).trim() : null;

  return {
    row: rowNumber,
    name: name || `Lead #${rowNumber}`,
    phone,
    company,
    notes,
    callStatus,
    interested,
    interestStatus,
    propertyInterest,
    budgetRange,
    preferredLocation,
    timeline,
    nextStepType,
    interestReason,
    conversationId,
    calledAt,
  };
}

export function extractSheetId(input: string): string {
  if (!input) return "";
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input.trim();
}

/**
 * Realistic fallback real estate prospects for demonstration if Google Sheet
 * is temporarily not connected.
 */
export const FALLBACK_DEMO_LEADS: Lead[] = [
  {
    row: 2,
    name: "Rajesh Patel",
    phone: "+91 98250 14820",
    company: "Patel Agro & Chem",
    notes: "Interested in 3-4 BHK luxury apartment or penthouse near SG Highway or Sindhu Bhavan Road.",
    callStatus: "Pending",
    interested: null,
    interestStatus: null,
    propertyInterest: "3-4 BHK Luxury Apartment",
    budgetRange: "₹2.5 Cr - ₹3.5 Cr",
    preferredLocation: "Sindhu Bhavan / SG Highway",
    timeline: "Within 3 Months",
    nextStepType: null,
    interestReason: null,
    conversationId: null,
    calledAt: null,
  },
  {
    row: 3,
    name: "Bhavin Shah",
    phone: "+91 98980 32115",
    company: "Shah Logistics & Warehousing",
    notes: "Looking for commercial plot or industrial warehouse space near Changodar or Sanand.",
    callStatus: "Completed",
    interested: false,
    interestStatus: "NOT INTERESTED",
    propertyInterest: "Commercial Warehouse",
    budgetRange: "₹5 Cr - ₹7 Cr",
    preferredLocation: "Changodar Industrial Area",
    timeline: "More Than 12 Months",
    nextStepType: "No Follow-up",
    interestReason: "Already acquired a warehouse lease in Bavla last week.",
    conversationId: "conv_89a3f21b",
    calledAt: "2026-09-26T06:18:22.000Z",
  },
  {
    row: 4,
    name: "Ananya Sharma",
    phone: "+91 97129 45002",
    company: "Zen Interior Studio",
    notes: "Looking for prime retail showroom or studio space with high street footfall in Bodakdev or Vastrapur.",
    callStatus: "Completed",
    interested: true,
    interestStatus: "INTERESTED",
    propertyInterest: "Commercial High-Street Retail",
    budgetRange: "₹1.8 Cr - ₹2.2 Cr",
    preferredLocation: "Bodakdev",
    timeline: "Immediate",
    nextStepType: "Schedule Site Visit",
    interestReason: "Expanding current studio into flagship design center before festive season.",
    conversationId: "conv_71c4d90e",
    calledAt: "2026-09-26T07:02:15.000Z",
  },
  {
    row: 5,
    name: "Vikramaditya Mehta",
    phone: "+91 98240 66781",
    company: "Mehta Wealth Advisory",
    notes: "Investment in pre-leased commercial office with 7%+ rental yield.",
    callStatus: "Completed",
    interested: true,
    interestStatus: "INTERESTED",
    propertyInterest: "Pre-Leased Commercial Office",
    budgetRange: "₹4.0 Cr - ₹6.0 Cr",
    preferredLocation: "GIFT City / Gandhinagar",
    timeline: "Within 3 Months",
    nextStepType: "Send Investment Teaser",
    interestReason: "Client has surplus capital from private equity exit and seeks fixed passive return.",
    conversationId: "conv_55e2b881",
    calledAt: "2026-09-26T07:14:40.000Z",
  },
  {
    row: 6,
    name: "Pooja Trivedi",
    phone: "+91 99099 87234",
    company: "Self-Employed Architect",
    notes: "Seeking duplex penthouse or weekend villa near Thol or Shilaj.",
    callStatus: "Pending",
    interested: null,
    interestStatus: null,
    propertyInterest: "Weekend Villa / Penthouse",
    budgetRange: "₹2.0 Cr - ₹2.8 Cr",
    preferredLocation: "Shilaj / Thol Road",
    timeline: "3-6 Months",
    nextStepType: null,
    interestReason: null,
    conversationId: null,
    calledAt: null,
  },
  {
    row: 7,
    name: "Nikhil Joshi",
    phone: "+91 98791 23490",
    company: "Joshi Infotech Solutions",
    notes: "Corporate office relocation for 60-seat team, needs fully furnished A-grade floor plate.",
    callStatus: "Pending",
    interested: null,
    interestStatus: null,
    propertyInterest: "Furnished Grade-A IT Office",
    budgetRange: "₹2.5 Lakh/mo (Rent)",
    preferredLocation: "Prahlad Nagar / Corporate Road",
    timeline: "Immediate",
    nextStepType: null,
    interestReason: null,
    conversationId: null,
    calledAt: null,
  },
  {
    row: 8,
    name: "Harishchandra Dave",
    phone: "+91 94260 55192",
    company: "Dave & Sons Textiles",
    notes: "Looking to sell family heritage property or purchase residential plot in Paldi / Ellisbridge.",
    callStatus: "Completed",
    interested: false,
    interestStatus: "NOT READY",
    propertyInterest: "Residential Plot",
    budgetRange: "₹3 Cr - ₹4 Cr",
    preferredLocation: "Paldi",
    timeline: "6-12 Months",
    nextStepType: "Follow Up Next Quarter",
    interestReason: "Family dispute over property partition currently under legal mediation.",
    conversationId: "conv_42f9a11d",
    calledAt: "2026-09-26T05:45:00.000Z",
  },
  {
    row: 9,
    name: "Meera Singhal",
    phone: "+91 98254 77120",
    company: "Singhal Healthcare Diagnostics",
    notes: "Ground floor commercial clinic space with dedicated patient parking and ambulance bay.",
    callStatus: "Pending",
    interested: null,
    interestStatus: null,
    propertyInterest: "Healthcare / Clinic Commercial",
    budgetRange: "₹1.5 Cr - ₹2.0 Cr",
    preferredLocation: "Satellite / Jodhpur Cross Road",
    timeline: "Within 3 Months",
    nextStepType: null,
    interestReason: null,
    conversationId: null,
    calledAt: null,
  },
  {
    row: 10,
    name: "Dharmesh Soni",
    phone: "+91 98982 99401",
    company: "Soni Jewellers Ltd.",
    notes: "High-security luxury penthouse with private plunge pool and 3 covered car parks.",
    callStatus: "Pending",
    interested: null,
    interestStatus: null,
    propertyInterest: "Sky Villa / Penthouse",
    budgetRange: "₹4.5 Cr - ₹6.0 Cr",
    preferredLocation: "Ambli-Bopal Road",
    timeline: "3-6 Months",
    nextStepType: null,
    interestReason: null,
    conversationId: null,
    calledAt: null,
  },
  {
    row: 11,
    name: "Sanjay Goswami",
    phone: "+91 97250 11843",
    company: "Goswami Hospitality Group",
    notes: "Boutique hotel / banquet land parcel near Sanand or Ahmedabad-Gandhinagar highway.",
    callStatus: "Pending",
    interested: null,
    interestStatus: null,
    propertyInterest: "Commercial Hospitality Land",
    budgetRange: "₹8 Cr - ₹12 Cr",
    preferredLocation: "SG Highway Extension",
    timeline: "Just Exploring",
    nextStepType: null,
    interestReason: null,
    conversationId: null,
    calledAt: null,
  },
];
