/**
 * Relay: Supabase Database Webhook → this URL → forward to Edge Function app-notifications-send-push.
 * Uses Vercel Edge Runtime so DNS may resolve (Node serverless had ENOTFOUND for *.supabase.co).
 *
 * Env (Vercel): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Webhook URL in Supabase: https://<your-vercel-domain>/api/forward-to-send-push
 */

export const config = { runtime: "edge" };

const getEdgeUrl = () => {
  const baseUrl = (process.env.SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  return (baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`) + "/functions/v1/app-notifications-send-push";
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const EDGE_URL = getEdgeUrl();
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!EDGE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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
    const cause =
      err != null && typeof err === "object" && "cause" in err && (err as { cause: unknown }).cause != null
        ? String((err as { cause: unknown }).cause)
        : "";
    return new Response(
      JSON.stringify({
        error: "Relay failed to call Edge Function",
        details: msg,
        cause: cause || undefined,
        hint: "Check SUPABASE_URL and that project is not paused. If still ENOTFOUND, use cron + app-notifications-process-pending instead.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
}
