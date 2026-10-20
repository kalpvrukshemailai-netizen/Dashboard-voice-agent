const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

if (!APPS_SCRIPT_URL) {
  // Route handlers call assertAppsScriptUrl() so local builds can still succeed.
}

export function assertAppsScriptUrl() {
  if (!APPS_SCRIPT_URL) {
    throw new Error("Missing GOOGLE_APPS_SCRIPT_URL in .env.local");
  }
  return APPS_SCRIPT_URL;
}

export async function callAppsScript(payload: Record<string, unknown>) {
  const url = assertAppsScriptUrl();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Apps Script returned a non-JSON response (${response.status}).`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(String(data.error ?? `Apps Script request failed (${response.status})`));
  }

  return data;
}
