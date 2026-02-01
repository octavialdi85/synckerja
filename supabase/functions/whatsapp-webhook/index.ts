import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const META_GRAPH_BASE = "https://graph.facebook.com/v18.0";
/** Same bucket as outbound sends (ChatThread) – satu bucket untuk kirim & terima media */
const WHATSAPP_MEDIA_BUCKET = "whatsapp-media";

function getMediaIdAndType(msg: Record<string, unknown>): { id: string; type: string; mime?: string; filename?: string } | null {
  const img = msg.image as { id?: string; mime_type?: string } | undefined;
  if (img?.id) return { id: img.id, type: "image", mime: img.mime_type };
  const vid = msg.video as { id?: string; mime_type?: string } | undefined;
  if (vid?.id) return { id: vid.id, type: "video", mime: vid.mime_type };
  const doc = msg.document as { id?: string; mime_type?: string; filename?: string } | undefined;
  if (doc?.id) return { id: doc.id, type: "document", mime: doc.mime_type, filename: doc.filename };
  const aud = msg.audio as { id?: string; mime_type?: string } | undefined;
  if (aud?.id) return { id: aud.id, type: "audio", mime: aud.mime_type };
  return null;
}

/** Caption dari pesan masuk (penerima kirim gambar/video/dokumen + caption). Meta bisa kirim di objek media atau top-level. */
function getInboundMediaCaption(msg: Record<string, unknown>): string | null {
  const trimCaption = (raw: unknown): string | null => {
    if (raw == null) return null;
    const s = String(raw).trim();
    return s !== "" ? s : null;
  };
  // Top-level caption (beberapa versi payload)
  const top = trimCaption(msg.caption);
  if (top) return top;
  // Di dalam objek media: image.caption, video.caption, document.caption
  for (const key of ["image", "video", "document"] as const) {
    const obj = msg[key];
    if (obj && typeof obj === "object" && obj !== null && "caption" in obj) {
      const c = trimCaption((obj as { caption?: unknown }).caption);
      if (c) return c;
    }
  }
  return null;
}

function extensionFromMimeOrFilename(mime?: string, filename?: string): string {
  if (filename && filename.includes(".")) return filename.replace(/^.*\./, "").toLowerCase().slice(0, 8);
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
    "video/mp4": "mp4", "video/3gpp": "3gp",
    "application/pdf": "pdf",
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/amr": "amr",
  };
  if (mime) return map[mime.toLowerCase()] ?? mime.split("/")[1]?.slice(0, 8) ?? "bin";
  return "bin";
}

async function resolveInboundMediaUrl(
  mediaId: string,
  accessToken: string,
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  waMessageId: string,
  type: string,
  mime?: string,
  filename?: string
): Promise<string | null> {
  try {
    const metaRes = await fetch(`${META_GRAPH_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return null;
    const metaJson = await metaRes.json().catch(() => ({}));
    const downloadUrl = metaJson.url;
    if (!downloadUrl || typeof downloadUrl !== "string") return null;

    const fileRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!fileRes.ok) return null;
    const blob = await fileRes.blob();
    const ext = extensionFromMimeOrFilename(mime, filename);
    const safeId = waMessageId.replace(/\W/g, "_");
    const path = `inbound/${conversationId}/${safeId}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from(WHATSAPP_MEDIA_BUCKET).upload(path, blob, {
      contentType: blob.type || undefined,
      upsert: true,
    });
    if (uploadErr) {
      console.error("Webhook storage upload error:", uploadErr);
      return null;
    }
    const { data: urlData } = supabase.storage.from(WHATSAPP_MEDIA_BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  } catch (e) {
    console.error("resolveInboundMediaUrl error:", e);
    return null;
  }
}

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
                .select("organization_id, whatsapp_access_token")
                .eq("phone_number_id", phoneNumberId)
                .eq("is_active", true)
                .maybeSingle();

              if (configError || !config) {
                console.error("Config not found for phone_number_id:", phoneNumberId, configError);
                continue;
              }

              const orgId = config.organization_id;
              const accessToken = config.whatsapp_access_token ?? "";

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
                if (msg.type === "unsupported") {
                  continue;
                }
                const customerWaId = String(msg.from ?? "");
                const mediaCaption = getInboundMediaCaption(msg as Record<string, unknown>);
                const bodyText =
                  msg.text?.body ?? mediaCaption ?? (msg.type === "text" ? "" : `[${msg.type}]`);
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

                let mediaUrl: string | null = null;
                const mediaInfo = getMediaIdAndType(msg as Record<string, unknown>);
                if (mediaInfo && accessToken) {
                  mediaUrl = await resolveInboundMediaUrl(
                    mediaInfo.id,
                    accessToken,
                    supabase,
                    conv.id,
                    msgId,
                    mediaInfo.type,
                    mediaInfo.mime,
                    mediaInfo.filename
                  );
                  if (!mediaUrl) {
                    console.warn("Inbound media resolution failed (Meta or storage). Message will show [image] + Tampilkan gambar.", { msgId, type: mediaInfo.type });
                  }
                }

                const insertPayload: Record<string, unknown> = {
                  conversation_id: conv.id,
                  direction: "inbound",
                  wa_message_id: msgId,
                  body: bodyText,
                  message_type: msg.type ?? "text",
                  raw_metadata: msg,
                  created_at: timestamp,
                };
                if (mediaUrl) insertPayload.media_url = mediaUrl;

                await supabase.from("whatsapp_messages").insert(insertPayload);
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
