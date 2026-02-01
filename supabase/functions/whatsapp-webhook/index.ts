import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode !== "subscribe" || !token || !challenge) {
        return new Response("Missing params", { status: 400, headers: corsHeaders });
      }

      const { data: config, error } = await supabase
        .from("organization_whatsapp_config")
        .select("id")
        .eq("verify_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !config) {
        console.error("Verify token not found:", error);
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }

      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      console.log("WhatsApp webhook POST:", JSON.stringify(body));

      if (body.object === "whatsapp_business_account") {
        const entries = body.entry ?? [];
        for (const entry of entries) {
          const changes = entry.changes ?? [];
          for (const change of changes) {
            if (change.field === "messages") {
              const value = change.value ?? {};
              const phoneNumberId = value.metadata?.phone_number_id ?? value.phone_number_id;
              const contacts = value.contacts ?? [];
              const messages = value.messages ?? [];
              const statuses = value.statuses ?? [];

              // Handle status updates (delivered, read)
              for (const st of statuses) {
                const waMessageId = st.id;
                const status = st.status; // sent | delivered | read
                const statusTimestamp = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString();
                if (!waMessageId || !status) continue;
                await supabase
                  .from("whatsapp_messages")
                  .update({ status, status_updated_at: statusTimestamp })
                  .eq("wa_message_id", waMessageId);
              }

              if (!phoneNumberId || messages.length === 0) continue;

              const { data: config, error: configError } = await supabase
                .from("organization_whatsapp_config")
                .select("organization_id")
                .eq("phone_number_id", phoneNumberId)
                .eq("is_active", true)
                .maybeSingle();

              if (configError || !config) {
                console.error("Config not found for phone_number_id:", phoneNumberId, configError);
                continue;
              }

              const orgId = config.organization_id;

              // Backfill display_phone_number from webhook metadata (works in dev & live; Meta sends it in every message)
              const rawDisplayNumber = value.metadata?.display_phone_number;
              if (rawDisplayNumber != null) {
                let displayNumber = typeof rawDisplayNumber === "number" ? String(rawDisplayNumber) : (typeof rawDisplayNumber === "string" ? rawDisplayNumber.trim() : "");
                if (displayNumber && /^\d+$/.test(displayNumber)) displayNumber = `+${displayNumber}`;
                if (displayNumber) {
                  await supabase
                    .from("organization_whatsapp_config")
                    .update({ display_phone_number: displayNumber, updated_at: new Date().toISOString() })
                    .eq("organization_id", orgId);
                }
              }

              const contactMap: Record<string, string> = {};
              for (const c of contacts) {
                if (c.wa_id && c.profile?.name) contactMap[c.wa_id] = c.profile.name;
              }

              // Process oldest first so the last upsert sets last_message_at/last_message_body to the latest message
              const sortedMessages = [...messages].sort(
                (a, b) => (Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0))
              );

              for (const msg of sortedMessages) {
                const customerWaId = String(msg.from ?? "");
                const bodyText = msg.text?.body ?? (msg.type === "text" ? "" : `[${msg.type}]`);
                const msgId = msg.id;
                const timestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString();
                const customerName = contactMap[customerWaId] ?? null;

                const lastBody = typeof bodyText === "string" ? bodyText.slice(0, 200) : "";
                const convPayload: Record<string, unknown> = {
                  organization_id: orgId,
                  customer_wa_id: customerWaId,
                  last_message_at: timestamp,
                  last_message_body: lastBody,
                  updated_at: timestamp,
                };
                if (customerName) convPayload.customer_name = customerName;

                const { data: conv, error: convError } = await supabase
                  .from("whatsapp_conversations")
                  .upsert(convPayload, { onConflict: "organization_id,customer_wa_id", ignoreDuplicates: false })
                  .select("id")
                  .single();

                if (convError || !conv) {
                  console.error("Conversation upsert error:", convError);
                  continue;
                }

                await supabase.from("whatsapp_messages").insert({
                  conversation_id: conv.id,
                  direction: "inbound",
                  wa_message_id: msgId,
                  body: bodyText,
                  message_type: msg.type ?? "text",
                  raw_metadata: msg,
                  created_at: timestamp,
                });
                // Sync last_message from actual latest message so preview is always correct
                await supabase.rpc("sync_conversation_last_message", { p_conversation_id: conv.id });
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Webhook failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
