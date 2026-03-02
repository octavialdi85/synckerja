/**
 * Relay: Supabase Database Webhook → this URL → forward to Edge Function app-notifications-send-push.
 * Use when pg_net gets "Couldn't resolve host name" calling the Edge Function directly.
 *
 * Env (Vercel): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Webhook URL in Supabase: https://<your-vercel-domain>/api/forward-to-send-push
 */

const baseUrl = (process.env.SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const EDGE_URL =
  (baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`) +
  "/functions/v1/app-notifications-send-push";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getRawBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(
  req: import("http").IncomingMessage & { method?: string },
  res: import("http").ServerResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!EDGE_URL || !SERVICE_ROLE_KEY) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      })
    );
    return;
  }

  let body: string;
  try {
    body = await getRawBody(req);
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid body" }));
    return;
  }

  let response: Response;
  try {
    response = await fetch(EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause ? String(err.cause) : "";
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Relay failed to call Edge Function",
        details: msg,
        cause: cause || undefined,
        hint:
          "Check SUPABASE_URL is https://<project-ref>.supabase.co and project is not paused.",
      })
    );
    return;
  }

  const text = await response.text();
  res.statusCode = response.status;
  const contentType = response.headers.get("Content-Type");
  if (contentType) res.setHeader("Content-Type", contentType);
  res.end(text);
}
