/**
 * HSK Builder Group AI Calling Platform
 * Server-Side Route Authorization Helpers
 */

export function verifyWorkerAuthorization(authHeader?: string | null): boolean {
  const cronSecret =
    process.env.CRON_SECRET ||
    process.env.SCHEDULER_SECRET ||
    process.env.INTERNAL_API_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return false; // Stricter: Always require secret to be configured
  }

  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export function verifyAdminAuthorization(authHeader?: string | null): boolean {
  const adminSecret =
    process.env.ADMIN_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    process.env.CRON_SECRET;

  if (!adminSecret) {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return false; // Stricter: Always require secret to be configured
  }

  if (!authHeader) return false;
  return authHeader === `Bearer ${adminSecret}`;
}

export function validateEnquiryInput(body: any): { isValid: boolean; error?: string; cleanData?: any } {
  if (!body || typeof body !== "object") {
    return { isValid: false, error: "Invalid JSON request body" };
  }

  const rawName = String(body.customer_name ?? body.name ?? "").trim();
  const rawPhone = String(body.phone_number ?? body.phone ?? "").trim();
  const projectInterest = String(body.project_interest ?? body.project ?? "General").trim();
  const customerNotes = String(body.customer_notes ?? body.notes ?? "").trim();

  if (!rawName || rawName.length < 2) {
    return { isValid: false, error: "Customer name is required (minimum 2 characters)" };
  }

  if (!rawPhone) {
    return { isValid: false, error: "Phone number is required" };
  }

  return {
    isValid: true,
    cleanData: {
      customer_name: rawName,
      raw_phone: rawPhone,
      project_interest: projectInterest,
      customer_notes: customerNotes,
    },
  };
}
