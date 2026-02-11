import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const META_GRAPH_VERSION = "v21.0";
const INSTAGRAM_MEDIA_BUCKET = "whatsapp-media";

function getMessageBody(evt: Record<string, unknown>): { body: string; messageType: string } {
  const msg = evt.message as Record<string, unknown> | undefined;
  if (!msg) return { body: "", messageType: "text" };
  if (msg.is_unsupported) return { body: "[Unsupported]", messageType: "unsupported" };
  if (msg.is_deleted) return { body: "[Deleted]", messageType: "text" };
  const text = typeof msg.text === "string" ? msg.text : (msg.text as { text?: string } | undefined)?.text;
  if (text != null && String(text).trim() !== "") return { body: String(text).trim(), messageType: "text" };
  const attachments = msg.attachments as Array<{ type?: string }> | undefined;
  if (Array.isArray(attachments) && attachments.length > 0) {
    const t = attachments[0]?.type ?? "file";
    return { body: `[${t}]`, messageType: t };
  }
  const quickReply = msg.quick_reply as { payload?: string } | undefined;
  if (quickReply?.payload) return { body: String(quickReply.payload), messageType: "quick_reply" };
  return { body: "[message]", messageType: "text" };
}

/** Create lead for new Instagram conversation (ticket_id IG-xxx). */
async function ensureLeadForNewInstagramConversation(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  convId: string,
  clientName: string,
  title: string,
  customerIgId: string,
  createdByDisplayName: string
): Promise<void> {
  const ticketId = "IG-" + String(convId).replace(/-/g, "").slice(0, 8).toUpperCase();
  const { data: existing } = await supabase.from("leads").select("id").eq("ticket_id", ticketId).maybeSingle();
  if (existing) return;

  const { data: unreadStatus } = await supabase
    .from("lead_statuses")
    .select("id")
    .eq("name", "Unread")
    .limit(1)
    .maybeSingle();
  const statusId = unreadStatus?.id ?? null;
  if (!statusId) {
    console.warn("ensureLeadForNewInstagramConversation: no Unread status, skip lead insert");
    return;
  }

  const safeClient = (clientName && String(clientName).trim()) || "Instagram";
  const safeTitle = (title && String(title).trim().slice(0, 100)) || "Instagram";

  const { error } = await supabase.from("leads").insert({
    ticket_id: ticketId,
    client: safeClient,
    title: safeTitle,
    category: "",
    created_by: "00000000-0000-0000-0000-000000000000",
    created_by_name: createdByDisplayName,
    assignee: "",
    status_id: statusId,
    organization_id: orgId,
    source: "Instagram",
    services: null,
    followup: 0,
    phone_number: null,
  });
  if (error) console.error("ensureLeadForNewInstagramConversation: insert error", error);
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  console.log("[instagram-webhook] ENTRY", req.method, url.pathname);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode !== "subscribe" || !challenge) {
        return new Response("instagram-webhook ok", { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      let verified = false;
      if (token) {
        const { data: igAccount } = await supabase
          .from("organization_instagram_accounts")
          .select("id")
          .eq("verify_token", token)
          .eq("is_active", true)
          .maybeSingle();
        if (igAccount) verified = true;
        if (!verified) {
          const { data: metaByVerify } = await supabase
            .from("organization_meta_config")
            .select("id")
            .eq("verify_token", token)
            .eq("is_active", true)
            .maybeSingle();
          if (metaByVerify) verified = true;
        }
        if (!verified) {
          const { data: metaByIgToken } = await supabase
            .from("organization_meta_config")
            .select("id")
            .eq("instagram_verify_token", token)
            .eq("is_active", true)
            .maybeSingle();
          if (metaByIgToken) verified = true;
        }
      }

      if (!verified) {
        console.error("[instagram-webhook] GET: verify_token not found");
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      console.log("[instagram-webhook] GET: verification success");
      const challengeStr = challenge != null ? String(challenge) : "";
      return new Response(challengeStr, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.object !== "instagram") {
      console.log("[instagram-webhook] POST: object is not instagram, ignoring");
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const igAccountId = entry?.id != null ? String(entry.id).trim() : null;
      const messaging = entry?.messaging ?? [];
      if (!igAccountId || !Array.isArray(messaging) || messaging.length === 0) continue;

      const { data: accountRows, error: accError } = await supabase
        .from("organization_instagram_accounts")
        .select("organization_id, page_access_token, instagram_username, instagram_name")
        .eq("instagram_business_account_id", igAccountId)
        .eq("is_active", true);

      if (accError || !accountRows?.length) {
        console.error("[instagram-webhook] config not found for instagram_business_account_id:", igAccountId, accError ?? "");
        continue;
      }

      const account = accountRows[0] as {
        organization_id: string;
        page_access_token: string | null;
        instagram_username: string | null;
        instagram_name: string | null;
      };
      const orgId = account.organization_id;
      const accessToken = (account.page_access_token ?? "").trim() || null;
      const displayName =
        (account.instagram_username ? "@" + account.instagram_username.trim() : null) ||
        (account.instagram_name ?? "").trim() ||
        "Instagram";

      for (const evt of messaging) {
        if (evt.message?.is_echo) continue;
        const senderId = evt.sender?.id != null ? String(evt.sender.id) : null;
        const recipientId = evt.recipient?.id != null ? String(evt.recipient.id) : null;
        if (!senderId || recipientId !== igAccountId) continue;

        const mid = evt.message?.mid != null ? String(evt.message.mid) : null;
        const ts = evt.timestamp != null ? new Date(Number(evt.timestamp)).toISOString() : new Date().toISOString();
        const { body: bodyText, messageType } = getMessageBody(evt as Record<string, unknown>);
        const lastBody = bodyText.slice(0, 200);

        const convPayload = {
          organization_id: orgId,
          instagram_business_account_id: igAccountId,
          customer_ig_id: senderId,
          customer_external_id: senderId,
          last_message_at: ts,
          last_message_body: lastBody,
          last_message_direction: "inbound",
          last_message_status: null as string | null,
          first_inbound_at: null as string | null,
          last_inbound_at: ts,
          updated_at: ts,
        };

        const { data: existingConv } = await supabase
          .from("instagram_conversations")
          .select("id, first_inbound_at")
          .eq("organization_id", orgId)
          .eq("instagram_business_account_id", igAccountId)
          .eq("customer_ig_id", senderId)
          .maybeSingle();

        let conv: { id: string; first_inbound_at: string | null } | null = null;
        if (existingConv) {
          const { data: updated } = await supabase
            .from("instagram_conversations")
            .update({
              last_message_at: ts,
              last_message_body: lastBody,
              last_message_direction: "inbound",
              last_inbound_at: ts,
              updated_at: ts,
            })
            .eq("id", existingConv.id)
            .select("id, first_inbound_at")
            .single();
          conv = updated;
        } else {
          const ticketId = "IG-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
          const { data: openStatus } = await supabase.from("lead_statuses").select("id").eq("name", "Open").maybeSingle();
          const { data: unreadStatus } = await supabase.from("lead_statuses").select("id").eq("name", "Unread").maybeSingle();
          const leadStatusId = openStatus?.id ?? unreadStatus?.id ?? null;

          const { data: inserted, error: insertErr } = await supabase
            .from("instagram_conversations")
            .insert({
              ...convPayload,
              ticket_id: ticketId,
              lead_status_id: leadStatusId,
              first_inbound_at: ts,
            })
            .select("id, first_inbound_at")
            .single();
          if (insertErr) {
            console.error("[instagram-webhook] conversation insert error", insertErr);
            continue;
          }
          conv = inserted;
          await ensureLeadForNewInstagramConversation(
            supabase,
            orgId,
            conv!.id,
            "Instagram contact",
            lastBody || "Instagram",
            senderId,
            displayName
          );
        }

        if (!conv || !mid) continue;

        await supabase.from("instagram_messages").insert({
          conversation_id: conv.id,
          direction: "inbound",
          platform_message_id: mid,
          body: bodyText,
          message_type: messageType,
          raw_metadata: evt,
          created_at: ts,
        });

        if (!existingConv?.first_inbound_at && conv.first_inbound_at) {
          await supabase
            .from("instagram_conversations")
            .update({ first_inbound_at: ts, updated_at: ts })
            .eq("id", conv.id);
        }

        console.log("[instagram-webhook] message saved", { convId: conv.id, mid });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[instagram-webhook] error", err);
    return new Response(JSON.stringify({ error: "Webhook failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
