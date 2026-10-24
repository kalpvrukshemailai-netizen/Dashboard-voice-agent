/**
 * HSK Builder Group AI Calling Platform
 * Autonomous Hands-Free Outbound Dialer Daemon
 *
 * Runs continuously in the background.
 * Every 8 seconds:
 * 1. Syncs completed conversations and recordings from ElevenLabs into Google Sheets.
 * 2. Checks the enquiry queue; if an enquiry is pending and the dialer is free,
 *    IMMEDIATELY initiates an outbound phone call via ElevenLabs + Exotel.
 */

const CRON_SECRET = process.env.CRON_SECRET || "c7b9e0f34a81467295d2c88f115a3e9b";
const isProdFlag = process.argv.includes("--prod") || process.argv.includes("--vercel");
const VERCEL_PRODUCTION_URL = "https://dashboard-voice-agent-git-main-shauryap001s-projects.vercel.app";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (isProdFlag ? VERCEL_PRODUCTION_URL : "http://localhost:3000");

let isRunning = false;

async function autoDialerTick() {
  if (isRunning) return;
  isRunning = true;

  try {
    // Step 1: Sync finished conversations from ElevenLabs to Google Sheets & release locks
    await fetch(`${BASE_URL}/api/calls/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => null);

    // Step 2: Trigger queue worker to claim next pending lead and place outbound call
    const workerRes = await fetch(`${BASE_URL}/api/scheduler/worker`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    if (workerRes.ok) {
      const data = await workerRes.json();
      if (data.action === "CALL_INITIATED") {
        console.log(`[Auto-Dialer] 📞 CALL PLACED: Enquiry ${data.enquiry_id} | Conv: ${data.conversation_id} | CallSID: ${data.call_sid}`);
      }
    }
  } catch (err) {
    // Ignore transient network errors during server reboot
  } finally {
    isRunning = false;
  }
}

console.log(`[Auto-Dialer Daemon] Started. Target server: ${BASE_URL}`);
console.log("[Auto-Dialer Daemon] Continuously monitoring queue and auto-dialing every 8 seconds...");
setInterval(autoDialerTick, 8000);
autoDialerTick();
