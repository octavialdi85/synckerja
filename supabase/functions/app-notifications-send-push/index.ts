/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type DbWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: unknown;
};

async function getFcmAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
    project_id?: string;
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
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signatureInput)
  );
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
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`FCM token exchange failed: ${tokenRes.status} ${err}`);
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) throw new Error("No access_token in FCM token response");
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
  const bodyPayload = {
    message: {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: {
        priority: "high",
        notification: {
          channel_id: "notifications",
          sound: "default",
          icon: "ic_notification",
        },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(bodyPayload),
  });
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status };
}

Deno.serve(async (req: Request) => {
  // Log every request immediately to verify webhook reaches this function
  console.log("app-notifications-send-push: request received", req.method, req.url);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as DbWebhookPayload;
    const type = payload?.type ?? "";
    const table = payload?.table ?? "";
    const record = (payload?.record ?? {}) as Record<string, unknown>;

    // Log every invocation so we can confirm webhook is calling this function
    console.log("app-notifications-send-push: invoked", {
      type,
      table,
      hasRecord: !!payload?.record,
      ...(table === "daily_task_notifications" && {
        recordType: record.type,
        recordTitle: record.title,
        recordBody: record.body,
        recordUserId: record.user_id,
      }),
    });

    if (type !== "INSERT" || !["review_comment_notifications", "completion_approvals", "plan_status_change_notifications", "daily_task_notifications"].includes(table)) {
      console.log("app-notifications-send-push: skipped", { table, type });
      return new Response(JSON.stringify({ ok: true, skipped: "not_insert_or_unknown_table" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let targetUserId: string | null = null;
    let title: string;
    let body: string;
    let dataPayload: Record<string, string> = { url: "/", openNotifications: "true" };

    if (table === "review_comment_notifications") {
      targetUserId = typeof record.user_id === "string" ? record.user_id : null;
      const planTitle = typeof record.plan_title === "string" ? record.plan_title.trim() : "";
      const commenter = typeof record.commenter_display_name === "string" ? record.commenter_display_name.trim() : "";
      title = "Notifikasi komentar";
      body = planTitle ? `Komentar baru pada review: ${planTitle}` : commenter ? `Komentar baru dari ${commenter}` : "Komentar baru pada review";
      dataPayload = { url: "/", openNotifications: "true", notificationType: "review_comment" };
    } else if (table === "completion_approvals") {
      const status = typeof record.status === "string" ? record.status : "";
      if (status !== "pending") {
        console.log("app-notifications-send-push: completion_approvals skipped status", status);
        return new Response(JSON.stringify({ ok: true, skipped: "status_not_pending" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const assignerEmployeeId = record.assigner_employee_id as string | undefined;
      if (!assignerEmployeeId) {
        console.log("app-notifications-send-push: completion_approvals no assigner_employee_id");
        return new Response(JSON.stringify({ ok: true, skipped: "no_assigner_employee_id" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("user_id")
        .eq("id", assignerEmployeeId)
        .single();
      if (empErr || !emp) {
        console.log("app-notifications-send-push: assigner employee not found", assignerEmployeeId);
        return new Response(JSON.stringify({ ok: true, skipped: "assigner_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = (emp as { user_id: string }).user_id;
      title = "Pending approval";
      body = "Item baru menunggu persetujuan Anda";
      dataPayload = { url: "/", openNotifications: "true", notificationType: "tasks" };
    } else if (table === "plan_status_change_notifications") {
      targetUserId = typeof record.user_id === "string" ? record.user_id : null;
      title = typeof record.title === "string" && record.title.trim() ? record.title.trim() : "Update status";
      body = typeof record.body === "string" && record.body.trim() ? record.body.trim() : "Plan status updated";
      const planId = typeof record.social_media_plan_id === "string" ? record.social_media_plan_id : "";
      dataPayload = { url: "/", openNotifications: "true", notificationType: "plan_status_change", social_media_plan_id: planId };
    } else if (table === "daily_task_notifications") {
      targetUserId = typeof record.user_id === "string" ? record.user_id : null;
      const notifTitle = typeof record.title === "string" ? record.title.trim() : "";
      const notifBody = typeof record.body === "string" ? record.body.trim() : "";
      title = notifTitle || "Daily Task update";
      body = notifBody || "Daily Task update";
      const dailyTaskId = typeof record.daily_task_id === "string" ? record.daily_task_id : "";
      const taskStepId = typeof record.task_step_id === "string" ? record.task_step_id : "";
      const taskStepsToStepsId = typeof record.task_steps_to_steps_id === "string" ? record.task_steps_to_steps_id : "";
      const viewVal = typeof record.view === "string" ? record.view : "";
      dataPayload = { url: "/", openNotifications: "true", notificationType: "daily_task", daily_task_id: dailyTaskId, task_step_id: taskStepId, task_steps_to_steps_id: taskStepsToStepsId, view: viewVal };
    } else {
      return new Response(JSON.stringify({ ok: true, skipped: "unknown_table" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!targetUserId) {
      console.log("app-notifications-send-push: no target user_id", { table });
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Untuk daily_task_notifications: ambil email penerima agar log bisa dipakai debug (Milda vs Octa)
    let targetUserEmail: string | null = null;
    if (table === "daily_task_notifications") {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(targetUserId);
        targetUserEmail = user?.email ?? null;
      } catch {
        // ignore
      }
    }

    const { data: fcmRows } = await supabase
      .from("fcm_tokens")
      .select("id, token")
      .eq("user_id", targetUserId)
      .eq("context", "general");
    const fcmTokensList = (fcmRows ?? []) as { id: string; token: string }[];

    if (fcmTokensList.length === 0) {
      console.log("app-notifications-send-push: no tokens", { targetUserId });
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataPayloadFinal = dataPayload;

    const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!fcmServiceAccountJson) {
      console.error("app-notifications-send-push: FCM_SERVICE_ACCOUNT_JSON not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sa = JSON.parse(fcmServiceAccountJson) as { project_id?: string };
    const projectId = sa.project_id ?? Deno.env.get("FCM_PROJECT_ID") ?? "";
    if (!projectId) {
      console.error("app-notifications-send-push: FCM project id not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getFcmAccessToken(fcmServiceAccountJson);
    let sent = 0;
    const fcmToDelete: string[] = [];
    for (const row of fcmTokensList) {
      const result = await sendFcmMessage(accessToken, projectId, row.token, title, body, dataPayloadFinal);
      if (result.ok) {
        sent++;
      } else if (result.status === 404 || result.status === 400) {
        fcmToDelete.push(row.id);
      }
    }
    if (fcmToDelete.length > 0) {
      await supabase.from("fcm_tokens").delete().in("id", fcmToDelete);
    }

    if (table === "plan_status_change_notifications" && typeof record.id === "string" && record.id) {
      await supabase
        .from("plan_status_change_notifications")
        .update({ push_sent_at: new Date().toISOString() })
        .eq("id", record.id);
    }

    console.log("app-notifications-send-push: done", {
      table,
      targetUserId,
      ...(table === "daily_task_notifications" && {
        notificationType: record.type,
        title,
        body,
        targetUserEmail: targetUserEmail ?? "(email not resolved)",
      }),
      sent,
      removed: fcmToDelete.length,
    });
    return new Response(
      JSON.stringify({ ok: true, sent, removed: fcmToDelete.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("app-notifications-send-push error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
