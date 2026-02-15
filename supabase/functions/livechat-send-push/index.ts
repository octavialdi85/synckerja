/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const APP_ORIGIN = Deno.env.get("LIVECHAT_APP_ORIGIN") ?? "";
const VAPID_KEYS_ENV = "VAPID_KEYS";
const CONTACT_EMAIL = Deno.env.get("VAPID_CONTACT_EMAIL") ?? "mailto:support@example.com";

type DbWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: unknown;
};

function ticketIdFromConversationId(conversationId: string, table: string): string {
  const raw = String(conversationId).replace(/-/g, "").slice(0, 8).toUpperCase();
  if (table === "email_messages") return `EMAIL-${raw}`;
  if (table === "instagram_messages") return `IG-${raw}`;
  return `WA-${raw}`;
}

function previewText(body: string | null | undefined, maxLen: number): string {
  const s = (body ?? "").trim().replace(/\s+/g, " ");
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "…";
}

Deno.serve(async (req: Request) => {
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
    const table = payload?.table ?? "";
    const record = payload?.record ?? {};

    if (payload?.type !== "INSERT" || !["whatsapp_messages", "instagram_messages", "email_messages"].includes(table)) {
      console.log("livechat-send-push: skipped", { table, type: payload?.type });
      return new Response(JSON.stringify({ ok: true, skipped: "not_insert_or_unknown_table" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const direction = typeof record.direction === "string" ? record.direction : "";
    if (direction !== "inbound") {
      console.log("livechat-send-push: skipped not_inbound", { table });
      return new Response(JSON.stringify({ ok: true, skipped: "not_inbound" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationId = record.conversation_id as string | undefined;
    if (!conversationId) {
      console.log("livechat-send-push: skipped no_conversation_id", { table });
      return new Response(JSON.stringify({ ok: true, skipped: "no_conversation_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let organizationId: string;
    let senderName: string;
    const ticketId = ticketIdFromConversationId(conversationId, table);

    if (table === "whatsapp_messages") {
      const { data: conv, error: convErr } = await supabase
        .from("whatsapp_conversations")
        .select("organization_id, customer_name")
        .eq("id", conversationId)
        .single();
      if (convErr || !conv) {
        console.log("livechat-send-push: skipped conversation_not_found", { table, conversationId });
        return new Response(JSON.stringify({ ok: true, skipped: "conversation_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      organizationId = (conv as { organization_id: string }).organization_id;
      senderName = ((conv as { customer_name?: string }).customer_name ?? "WhatsApp").trim() || "Customer";
    } else if (table === "instagram_messages") {
      const { data: conv, error: convErr } = await supabase
        .from("instagram_conversations")
        .select("organization_id, customer_name")
        .eq("id", conversationId)
        .single();
      if (convErr || !conv) {
        console.log("livechat-send-push: skipped conversation_not_found", { table, conversationId });
        return new Response(JSON.stringify({ ok: true, skipped: "conversation_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      organizationId = (conv as { organization_id: string }).organization_id;
      senderName = ((conv as { customer_name?: string }).customer_name ?? "Instagram").trim() || "Customer";
    } else {
      const { data: conv, error: convErr } = await supabase
        .from("email_conversations")
        .select("organization_id, from_display_name, from_email")
        .eq("id", conversationId)
        .single();
      if (convErr || !conv) {
        console.log("livechat-send-push: skipped conversation_not_found", { table, conversationId });
        return new Response(JSON.stringify({ ok: true, skipped: "conversation_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const c = conv as { organization_id: string; from_display_name?: string; from_email?: string };
      organizationId = c.organization_id;
      senderName = (c.from_display_name ?? c.from_email ?? "Email").trim() || "Customer";
    }

    const bodyText = (record.body as string) ?? (record.caption as string) ?? "";
    const bodyPreview = previewText(bodyText, 72);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("active_organization_id", organizationId);
    const userIds = (profiles ?? []).map((p: { user_id: string }) => p.user_id);
    if (userIds.length === 0) {
      console.log("livechat-send-push: skipped no_users_in_org", { organizationId });
      return new Response(JSON.stringify({ ok: true, skipped: "no_users_in_org" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (!subscriptions?.length) {
      console.log("livechat-send-push: no subscriptions for users", { userIds: userIds.length });
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidKeysJson = Deno.env.get(VAPID_KEYS_ENV);
    if (!vapidKeysJson) {
      console.error("livechat-send-push: VAPID_KEYS secret not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let vapidKeys: CryptoKeyPair;
    try {
      const exported = JSON.parse(vapidKeysJson) as { publicKey: JsonWebKey; privateKey: JsonWebKey };
      vapidKeys = await webpush.importVapidKeys(exported, { extractable: false });
    } catch (e) {
      console.error("livechat-send-push: invalid VAPID_KEYS", e);
      return new Response(JSON.stringify({ error: "Invalid VAPID keys" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appServer = await webpush.ApplicationServer.new({
      contactInformation: CONTACT_EMAIL,
      vapidKeys,
    });

    const baseUrl = APP_ORIGIN || "https://app.profitloop.id";
    const url = `${baseUrl}/operations/consultant/all/livechat?ticket_id=${encodeURIComponent(ticketId)}`;
    const title = `Pesan baru dari ${senderName}`;

    let totalUnread = 0;
    try {
      const [waRes, emailRes] = await Promise.all([
        supabase.rpc("get_whatsapp_unread_counts", { p_organization_id: organizationId }),
        supabase.rpc("get_email_unread_counts", { p_organization_id: organizationId }),
      ]);
      const sum = (rows: { unread_count?: number }[] | null) =>
        (rows ?? []).reduce((s, r) => s + (Number(r?.unread_count) || 0), 0);
      totalUnread = sum(waRes.data ?? []) + sum(emailRes.data ?? []);
      if (totalUnread < 1) totalUnread = 1;
    } catch {
      totalUnread = 1;
    }

    const payloadStr = JSON.stringify({ title, body: bodyPreview, url, badge: totalUnread });

    const toDelete: string[] = [];
    for (const sub of subscriptions as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        });
        await subscriber.pushTextMessage(payloadStr, { urgency: webpush.Urgency.High });
      } catch (err) {
        const res = err && typeof err === "object" && "response" in err ? (err as { response: Response }).response : null;
        if (res && (res.status === 410 || res.status === 404)) {
          toDelete.push(sub.id);
        } else {
          console.error("livechat-send-push: push failed", sub.endpoint?.slice(0, 50), err);
        }
      }
    }

    if (toDelete.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", toDelete);
    }

    const sent = subscriptions.length - toDelete.length;
    console.log("livechat-send-push: done", { table, sent, removed: toDelete.length, title: `Pesan baru dari ${senderName}` });
    return new Response(
      JSON.stringify({ ok: true, sent, removed: toDelete.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("livechat-send-push error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
