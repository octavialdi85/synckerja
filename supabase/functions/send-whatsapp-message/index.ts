import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const META_API_BASE = "https://graph.facebook.com/v18.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId = profile?.active_organization_id;
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "No active organization. Set active organization in settings.", code: "NO_ORG" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const to = body.to != null ? String(body.to).replace(/\D/g, "") : "";
    const text = body.text != null ? String(body.text).trim() : "";
    const conversationId = body.conversation_id ?? null;
    const mediaType = body.media_type != null ? String(body.media_type).toLowerCase().trim() : "";
    const mediaLink = body.media_link != null ? String(body.media_link).trim() : "";
    const caption = body.caption != null ? String(body.caption).trim().slice(0, 1024) : "";
    const replyToWaMessageId = body.reply_to_wa_message_id != null ? String(body.reply_to_wa_message_id).trim() : null;
    const replyToBody = body.reply_to_body != null ? String(body.reply_to_body).trim().slice(0, 500) : null;
    const replyToMessageType = body.reply_to_message_type != null ? String(body.reply_to_message_type).trim().slice(0, 20) : null;
    const replyToSender = body.reply_to_sender != null ? String(body.reply_to_sender).trim().slice(0, 120) : null;

    const isMedia = mediaType === "image" || mediaType === "video" || mediaType === "document";
    const hasText = text.length > 0;
    const hasMedia = isMedia && mediaLink.length > 0;

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing to (customer WhatsApp number)", code: "MISSING_TO" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!hasText && !hasMedia) {
      const hint =
        body.media_type != null || body.media_link != null
          ? "media_type must be image|video|document and media_link must be a non-empty URL"
          : "Provide text and/or media (media_type + media_link)";
      return new Response(
        JSON.stringify({ error: `Missing text or media. ${hint}`, code: "MISSING_CONTENT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: config, error: configError } = await supabase
      .from("organization_whatsapp_config")
      .select("whatsapp_access_token, phone_number_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !config?.whatsapp_access_token || !config?.phone_number_id) {
      return new Response(
        JSON.stringify({
          error:
            "WhatsApp not configured for this organization. Connect WhatsApp in Operations → Consultant → WhatsApp Connect.",
          code: "WHATSAPP_NOT_CONFIGURED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaUrl = `${META_API_BASE}/${config.phone_number_id}/messages`;
    let metaBody: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
    };
    if (replyToWaMessageId) {
      metaBody.context = { message_id: replyToWaMessageId };
    }

    if (hasMedia) {
      const mediaPayload: { link: string; caption?: string; filename?: string } = { link: mediaLink };
      if (caption) mediaPayload.caption = caption;
      if (mediaType === "document") mediaPayload.filename = mediaLink.split("/").pop()?.split("?")[0] || "document";
      metaBody.type = mediaType;
      metaBody[mediaType] = mediaPayload;
    } else {
      metaBody.type = "text";
      metaBody.text = { body: text };
    }

    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.whatsapp_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaBody),
    });

    const metaData = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      const metaError = metaData?.error;
      const metaMsg = metaError?.message ?? metaData?.error_message ?? "Meta API error";
      const code = metaError?.code;
      const subcode = metaError?.error_subcode;
      console.error("Meta API error:", metaRes.status, metaData);

      // Meta code 100 + subcode 33 = object doesn't exist / missing permissions / unsupported operation (Phone Number ID or token)
      const userHint =
        code === 100 && (subcode === 33 || /does not exist|missing permissions|does not support/i.test(metaMsg))
          ? "Periksa di Meta: Phone Number ID dan Access Token harus dari App & WABA yang sama. Generate token baru (System User) dan pastikan nomor terdaftar di WhatsApp → API Setup."
          : metaMsg;

      return new Response(
        JSON.stringify({
          error: userHint,
          details: metaData,
          code,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waMessageId = metaData.messages?.[0]?.id ?? null;

    if (conversationId && waMessageId) {
      const storedBody = hasMedia ? (caption || `[${mediaType}]`) : text;
      const lastBody = storedBody.slice(0, 200);
      const now = new Date().toISOString();
      const insertPayload: Record<string, unknown> = {
        conversation_id: conversationId,
        direction: "outbound",
        wa_message_id: waMessageId,
        body: storedBody,
        message_type: hasMedia ? mediaType : "text",
        raw_metadata: metaData,
        status: "sent",
        reply_to_wa_message_id: replyToWaMessageId ?? null,
        reply_to_body: replyToBody ?? null,
        reply_to_message_type: replyToMessageType ?? null,
        reply_to_sender: replyToSender ?? null,
      };
      if (hasMedia && mediaLink) insertPayload.media_url = mediaLink;
      const { data: insertedMessage, error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert(insertPayload)
        .select()
        .single();
      if (insertError) {
        console.error("whatsapp_messages insert error:", insertError);
      }
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: now,
          last_message_body: lastBody,
          updated_at: now,
        })
        .eq("id", conversationId);

      return new Response(
        JSON.stringify({
          success: true,
          message_id: waMessageId,
          message: insertedMessage ?? null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: waMessageId, message: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-whatsapp-message error:", err);
    return new Response(
      JSON.stringify({ error: "Send failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
