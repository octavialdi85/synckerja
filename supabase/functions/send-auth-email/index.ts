/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Send Email Hook for Supabase Auth.
 * When Auth triggers the hook (e.g. password recovery), this function sends the email via Resend.
 * Deploy with: supabase functions deploy send-auth-email --no-verify-jwt
 * Configure in Dashboard: Auth → Hooks → Send Email Hook → URL to this function.
 * Secrets: RESEND_API_KEY, SEND_EMAIL_HOOK_SECRET (from Auth Hooks in Dashboard), RESEND_AUTH_FROM (e.g. "ProfitLoop <noreply@yourdomain.com>")
 */

const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const RESEND_SEND_API = "https://api.resend.com/emails";
const SEND_EMAIL_HOOK_SECRET_ENV = "SEND_EMAIL_HOOK_SECRET";
const RESEND_AUTH_FROM_ENV = "RESEND_AUTH_FROM";

interface HookUser {
  id: string;
  email?: string;
}

interface HookEmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
}

/** Standard Webhooks verification (no external deps). Headers: webhook-id, webhook-timestamp, webhook-signature (or svix-*). */
async function verifyStandardWebhook(
  payload: string,
  headers: Record<string, string>,
  secretRaw: string
): Promise<{ user: HookUser; email_data: HookEmailData }> {
  const id = headers["webhook-id"] ?? headers["svix-id"];
  const timestamp = headers["webhook-timestamp"] ?? headers["svix-timestamp"];
  const sigHeader = headers["webhook-signature"] ?? headers["svix-signature"];
  if (!id || !timestamp || !sigHeader) {
    throw new Error("Missing webhook headers (webhook-id, webhook-timestamp, webhook-signature)");
  }
  const base64Secret = secretRaw.replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
  const secretBytes = Uint8Array.from(atob(base64Secret), (c) => c.charCodeAt(0));
  const signedContent = `${id}.${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent)
  );
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const signatures = sigHeader.split(/\s+/).map((s) => s.replace(/^v1,/, "").trim());
  const ok = signatures.some((s) => s.length === expectedSig.length && timingSafeEqual(s, expectedSig));
  if (!ok) throw new Error("Invalid webhook signature");
  const tolerance = 300;
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Number.isNaN(ts) || Math.abs(now - ts) > tolerance) {
    throw new Error("Webhook timestamp out of tolerance");
  }
  const parsed = JSON.parse(payload) as { user: HookUser; email_data: HookEmailData };
  if (!parsed?.user || !parsed?.email_data) throw new Error("Invalid payload shape");
  return parsed;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hookSecretRaw = Deno.env.get(SEND_EMAIL_HOOK_SECRET_ENV);
  if (!hookSecretRaw) {
    console.error("[send-auth-email] SEND_EMAIL_HOOK_SECRET not set");
    return new Response(
      JSON.stringify({
        error: "Send email hook not configured. Set SEND_EMAIL_HOOK_SECRET in Function secrets (Dashboard → Auth → Hooks).",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const payload = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  let user: HookUser;
  let email_data: HookEmailData;
  try {
    const verified = await verifyStandardWebhook(payload, headers, hookSecretRaw);
    user = verified.user;
    email_data = verified.email_data;
  } catch (err) {
    console.error("[send-auth-email] Webhook verify failed", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const emailActionType = email_data.email_action_type;
  if (emailActionType !== "recovery") {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const toEmail = user.email?.trim();
  if (!toEmail) {
    console.error("[send-auth-email] No user email");
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(email_data.token_hash)}&type=recovery&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

  const fromAddress = Deno.env.get(RESEND_AUTH_FROM_ENV)?.trim() || "ProfitLoop <onboarding@resend.dev>";
  const apiKey = Deno.env.get(RESEND_API_KEY_ENV)?.trim();
  if (!apiKey) {
    console.error("[send-auth-email] RESEND_API_KEY not set");
    return new Response(
      JSON.stringify({
        error: "Email not configured. Set RESEND_API_KEY in Function secrets.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const subject = "Reset your password";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5;">
  <h2>Reset your password</h2>
  <p>Follow this link to set a new password:</p>
  <p><a href="${verifyUrl}" style="color: #ea580c;">Reset password</a></p>
  <p>If you didn't request this, you can ignore this email.</p>
</body>
</html>`;

  const res = await fetch(RESEND_SEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      subject,
      html,
    }),
  });

  const resJson = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    console.error("[send-auth-email] Resend error", res.status, resJson);
    return new Response(
      JSON.stringify({ error: resJson?.message ?? res.statusText ?? "Failed to send email" }),
      {
        status: res.status >= 400 ? res.status : 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
