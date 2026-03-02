/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

async function getFcmAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };
  const encoder = new TextEncoder();
  const b64 = (b: Uint8Array) =>
    btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const headerB64 = b64(encoder.encode(JSON.stringify(header)));
  const payloadB64 = b64(encoder.encode(JSON.stringify(payload)));
  const signatureInput = `${headerB64}.${payloadB64}`;
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signatureInput));
  const jwt = `${signatureInput}.${b64(new Uint8Array(sig))}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    }),
  });
  if (!tokenRes.ok) throw new Error(`FCM token failed: ${tokenRes.status} ${await tokenRes.text()}`);
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) throw new Error("No access_token");
  return tokenData.access_token;
}

async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ ok: boolean; status?: number }> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        android: {
          priority: "high",
          notification: { channel_id: "notifications", sound: "default", icon: "ic_notification" },
        },
        apns: { payload: { aps: { sound: "default" } } },
      },
    }),
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}

Deno.serve(async (req: Request) => {
  console.log("app-notifications-process-pending: request", req.method, req.url);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey || auth.slice(7) !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!fcmServiceAccountJson) {
    console.error("app-notifications-process-pending: FCM_SERVICE_ACCOUNT_JSON not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sa = JSON.parse(fcmServiceAccountJson) as { project_id?: string };
  const projectId = sa.project_id ?? Deno.env.get("FCM_PROJECT_ID") ?? "";
  if (!projectId) {
    return new Response(JSON.stringify({ error: "FCM project id not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: rows, error: fetchError } = await supabase
    .from("plan_status_change_notifications")
    .select("id, user_id, title, body, social_media_plan_id")
    .is("push_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (fetchError) {
    console.error("app-notifications-process-pending: fetch error", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pending = (rows ?? []) as {
    id: string;
    user_id: string;
    title: string;
    body: string;
    social_media_plan_id: string;
  }[];

  if (pending.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, processed: 0, message: "No pending notifications" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const accessToken = await getFcmAccessToken(fcmServiceAccountJson);
  let processed = 0;
  const fcmToDelete: string[] = [];

  for (const row of pending) {
    const { data: fcmRows } = await supabase
      .from("fcm_tokens")
      .select("id, token")
      .eq("user_id", row.user_id)
      .eq("context", "general");
    const tokens = (fcmRows ?? []) as { id: string; token: string }[];

    for (const t of tokens) {
      const result = await sendFcmMessage(
        accessToken,
        projectId,
        t.token,
        row.title?.trim() || "Update status",
        row.body?.trim() || "Plan status updated",
        {
          url: "/",
          openNotifications: "true",
          notificationType: "plan_status_change",
          social_media_plan_id: row.social_media_plan_id ?? "",
        }
      );
      if (result.ok) break;
      if (result.status === 404 || result.status === 400) fcmToDelete.push(t.id);
    }

    await supabase
      .from("plan_status_change_notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", row.id);
    processed++;
  }

  if (fcmToDelete.length > 0) {
    await supabase.from("fcm_tokens").delete().in("id", fcmToDelete);
  }

  console.log("app-notifications-process-pending: done", { processed, removedTokens: fcmToDelete.length });
  return new Response(
    JSON.stringify({ ok: true, processed, removedTokens: fcmToDelete.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
