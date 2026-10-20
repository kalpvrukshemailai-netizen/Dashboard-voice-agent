/**
 * ElevenLabs Webhook Signature Verification
 *
 * Follows the official ElevenLabs webhook signature contract:
 * Header: ElevenLabs-Signature: t=<timestamp>,v0=<hash>
 * Hash: HMAC-SHA256(secret, `${t}.${rawBody}`)
 */

import crypto from "node:crypto";

export interface VerificationResult {
  isValid: boolean;
  timestamp?: number;
  error?: string;
}

export function verifyElevenLabsWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined = process.env.ELEVENLABS_WEBHOOK_SECRET,
  toleranceSeconds: number = 300, // 5 minutes tolerance
): VerificationResult {
  // If secret is not configured, log warning and allow in dev / test mode only
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { isValid: false, error: "Missing ELEVENLABS_WEBHOOK_SECRET in production" };
    }
    return { isValid: true };
  }

  if (!signatureHeader) {
    return { isValid: false, error: "Missing ElevenLabs-Signature header" };
  }

  // Parse header: t=1234567890,v0=abcdef...
  const parts = signatureHeader.split(",");
  let timestampStr: string | null = null;
  let signatureHash: string | null = null;

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestampStr = value;
    if (key === "v0") signatureHash = value;
  }

  if (!timestampStr || !signatureHash) {
    return { isValid: false, error: "Malformed ElevenLabs-Signature header format" };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { isValid: false, error: "Invalid timestamp in signature header" };
  }

  // Check replay tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return {
      isValid: false,
      timestamp,
      error: `Webhook timestamp expired or out of tolerance (diff: ${Math.abs(now - timestamp)}s > ${toleranceSeconds}s)`,
    };
  }

  // Compute expected HMAC SHA-256
  const signedPayload = `${timestampStr}.${rawBody}`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time comparison
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const providedBuffer = Buffer.from(signatureHash, "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return { isValid: false, timestamp, error: "Signature length mismatch" };
  }

  const match = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  if (!match) {
    return { isValid: false, timestamp, error: "Signature hash mismatch" };
  }

  return { isValid: true, timestamp };
}

/**
 * Helper to generate valid signatures in tests
 */
export function generateMockElevenLabsSignature(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): string {
  const signedPayload = `${timestamp}.${rawBody}`;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v0=${hash}`;
}
