import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const META_API_BASE = "https://graph.facebook.com/v18.0";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      return new Response(JSON.stringify({ error: "No active organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const to = body.to ? String(body.to).replace(/\D/g, "") : "";
    const text = body.text ? String(body.text).trim() : "";
    const conversationId = body.conversation_id ?? null;

    if (!to || !text) {
      return new Response(JSON.stringify({ error: "Missing to or text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config, error: configError } = await supabase
      .from("organization_whatsapp_config")
      .select("whatsapp_access_token, phone_number_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !config?.whatsapp_access_token || !config?.phone_number_id) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured for this organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaUrl = `${META_API_BASE}/${config.phone_number_id}/messages`;
    const metaBody = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    };

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
      const metaMsg = metaData?.error?.message ?? metaData?.error_message ?? "Meta API error";
      console.error("Meta API error:", metaRes.status, metaData);
      return new Response(
        JSON.stringify({
          error: metaMsg,
          details: metaData,
          code: metaData?.error?.code,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waMessageId = metaData.messages?.[0]?.id ?? null;

    if (conversationId && waMessageId) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        wa_message_id: waMessageId,
        body: text,
        message_type: "text",
        raw_metadata: metaData,
        status: "sent",
      });
      const lastBody = typeof text === "string" ? text.slice(0, 200) : "";
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_body: lastBody,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    return new Response(
      JSON.stringify({ success: true, message_id: waMessageId }),
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
