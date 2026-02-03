import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Declare Deno global for IDE when edge-runtime.d.ts is not resolved */
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

/** Meta Instagram webhook entry (object.entry[]) – bisa pakai messaging, value, atau changes */
interface InstagramWebhookEntry {
  id?: string | number;
  time?: number;
  messaging?: InstagramMessagingEvent[];
  value?: { messaging?: InstagramMessagingEvent[]; messages?: InstagramMessagingEvent[]; sender?: unknown; message?: unknown };
  changes?: { field?: string; value?: { messaging?: InstagramMessagingEvent[] } }[];
}
/** Meta Instagram Messaging webhook event (entry.messaging[]). Meta kadang pakai "from" instead of "sender". */
interface InstagramMessagingEvent {
  sender?: { id?: string | number };
  from?: { id?: string | number };
  recipient?: { id?: string | number };
  timestamp?: number;
  message?: InstagramMessage;
}
/** Meta Instagram message object */
interface InstagramMessage {
  mid?: string;
  text?: string;
  is_echo?: boolean;
  attachments?: { type?: string }[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const META_GRAPH_BASE = "https://graph.facebook.com/v18.0";
/** Same bucket as outbound sends (ChatThread) – satu bucket untuk kirim & terima media */
const WHATSAPP_MEDIA_BUCKET = "whatsapp-media";

/** Fetch Instagram user profile (name, username) via Meta User Profile API. Returns display name or error. */
async function fetchInstagramUserDisplayName(
  igScopedUserId: string,
  accessToken: string
): Promise<{ name: string } | { error: string }> {
  try {
    const url = `${META_GRAPH_BASE}/${encodeURIComponent(igScopedUserId)}?fields=name,username`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json().catch(() => ({}))) as { name?: string; username?: string; error?: { message?: string; code?: number } };
    if (data?.error) {
      const errMsg = data.error.message ?? JSON.stringify(data.error);
      return { error: errMsg };
    }
    const name = typeof data?.name === "string" ? data.name.trim() : null;
    const username = typeof data?.username === "string" ? data.username.trim() : null;
    if (name) return { name };
    if (username) return { name: `@${username}` };
    return { error: "no name or username in response" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

/** Frasa + kata satuan yang mengindikasikan permintaan kontak. On/off via env WHATSAPP_BLOCK_CONTACT_REQUESTS. */
const CONTACT_REQUEST_PHRASES: readonly string[] = [
  "nomor", "wa", "whatsapp", "hp", "telepon", "telpon", "tlp", "tlpn", "telephone", "email", "kontak", "contact",
  "nomor hp", "nomor telepon", "nomor wa", "nomor whatsapp", "no hp", "no telepon", "no wa", "no whatsapp",
  "number wa", "whatsapp number", "hp kamu", "telepon kamu", "wa kamu", "kirim nomor", "beri nomor", "bagi nomor",
  "share nomor", "kontak kamu", "kontak anda", "nomor kontak", "no kontak", "bisa wa", "bisa chat wa", "chat wa dong",
  "wa saja", "hubungi wa", "whatsapp saja", "dm wa", "invite wa", "add wa", "nomor untuk dihubungi",
  "nomor yang bisa dihubungi", "no yang bisa dihubungi",
  "email kamu", "email anda", "alamat email", "e-mail", "kirim email", "beri email", "bagi email", "share email",
  "kontak email", "email untuk konfirmasi", "email untuk dihubungi", "dm email", "send email", "your email", "email address",
  "cara menghubungi", "cara hubungi", "bagaimana menghubungi", "how to contact", "contact you", "hubungi kamu",
  "nomor atau email", "no atau email", "line kamu", "id line", "telegram", "ig kamu", "instagram kamu", "sosmed", "media sosial",
  "minta nomor wa", "minta nomor", "berapa nomor", "apa nomor", "bisa minta nomor", "boleh minta nomor", "bisa minta kontak", "boleh minta kontak",
  "bisa minta email", "boleh minta email", "bisa kasih nomor", "boleh kasih nomor", "bisa share nomor", "boleh share nomor",
  "what's your number", "what's your email", "whatsapp number", "phone number", "contact number",
  "can i get your number", "can i get your email", "give me your number", "give me your email",
  "send me your number", "send me your email", "share your number", "share your email",
  "drop your number", "drop your email", "dm your number", "dm your email",
];

function messageContainsContactRequest(text: string | null | undefined): boolean {
  if (text == null || text === "") return false;
  const normalized = text.toLowerCase().trim().replace(/\s+/g, " ");
  if (normalized.length === 0) return false;
  return CONTACT_REQUEST_PHRASES.some((phrase) => normalized.includes(phrase));
}

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
  // Log every request immediately so Dashboard shows activity (Meta GET verification + POST webhooks)
  const url = new URL(req.url);
  console.log("whatsapp-webhook request:", req.method, url.pathname, req.method === "GET" ? "query=" + url.searchParams.toString().slice(0, 80) : "");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

      if (mode !== "subscribe" || !token || !challenge) {
        console.log("Webhook GET: verification missing params", { mode, hasToken: !!token, hasChallenge: !!challenge });
        return new Response("Missing params", { status: 400, headers: corsHeaders });
      }

      console.log("Webhook GET: verification (hub.mode=subscribe), checking verify_token...");
      const { data: config, error } = await supabase
        .from("organization_meta_config")
        .select("id")
        .eq("verify_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !config) {
        console.error("Webhook GET: Verify token not found or DB error", error ?? "no matching config");
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }

      console.log("Webhook GET: verification success, returning challenge");
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const objectType = body?.object ?? "(none)";
      console.log("Webhook POST: object=", objectType, "entryCount=", (body?.entry ?? []).length);

      if (body.object === "whatsapp_business_account") {
        const entries = body.entry ?? [];
        for (const entry of entries) {
          const changes = entry.changes ?? [];
          for (const change of changes) {
            if (change.field === "messages") {
              const value = change.value ?? {};
              const rawPhoneNumberId = value.metadata?.phone_number_id ?? value.phone_number_id;
              const phoneNumberId = rawPhoneNumberId != null ? String(rawPhoneNumberId).trim() || null : null;
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

              // Resolve org + token: organization_whatsapp_accounts first, then fallback organization_meta_config (legacy)
              let orgId: string | null = null;
              let accessToken = "";

              const { data: accountRow, error: accountError } = await supabase
                .from("organization_whatsapp_accounts")
                .select("organization_id, meta_access_token")
                .eq("phone_number_id", phoneNumberId)
                .eq("is_active", true)
                .maybeSingle();

              if (!accountError && accountRow) {
                orgId = accountRow.organization_id;
                accessToken = (accountRow.meta_access_token ?? "").trim();
              }

              if (!orgId || !accessToken) {
                const { data: metaRow, error: metaError } = await supabase
                  .from("organization_meta_config")
                  .select("organization_id, meta_access_token, phone_number_id")
                  .eq("phone_number_id", phoneNumberId)
                  .eq("is_active", true)
                  .maybeSingle();
                if (!metaError && metaRow?.organization_id) {
                  orgId = metaRow.organization_id;
                  accessToken = (metaRow.meta_access_token ?? "").trim();
                }
              }

              if (!orgId || !accessToken) {
                console.error("Config not found for phone_number_id:", phoneNumberId, accountError ?? null);
                continue;
              }

              if (!accessToken) {
                const { data: orgConfig } = await supabase
                  .from("organization_meta_config")
                  .select("meta_access_token")
                  .eq("organization_id", orgId)
                  .maybeSingle();
                accessToken = (orgConfig?.meta_access_token ?? "").trim();
              }
              if (!accessToken) {
                console.error("No token for org/phone_number_id:", orgId, phoneNumberId);
                continue;
              }

              // Backfill display_phone_number on organization_whatsapp_accounts from webhook metadata
              const rawDisplayNumber = value.metadata?.display_phone_number;
              if (rawDisplayNumber != null) {
                let displayNumber = typeof rawDisplayNumber === "number" ? String(rawDisplayNumber) : (typeof rawDisplayNumber === "string" ? rawDisplayNumber.trim() : "");
                if (displayNumber && /^\d+$/.test(displayNumber)) displayNumber = `+${displayNumber}`;
                if (displayNumber) {
                  await supabase
                    .from("organization_whatsapp_accounts")
                    .update({ display_phone_number: displayNumber, updated_at: new Date().toISOString() })
                    .eq("organization_id", orgId)
                    .eq("phone_number_id", phoneNumberId);
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

              /** Blokir pesan yang meminta kontak. Default ON; set WHATSAPP_BLOCK_CONTACT_REQUESTS=false untuk nonaktifkan. */
              const blockContactRequests = Deno.env.get("WHATSAPP_BLOCK_CONTACT_REQUESTS") !== "false";

              for (const msg of sortedMessages) {
                if (msg.type === "unsupported") {
                  continue;
                }
                const customerWaId = String(msg.from ?? "");
                const mediaCaption = getInboundMediaCaption(msg as Record<string, unknown>);
                const bodyText =
                  msg.text?.body ?? mediaCaption ?? (msg.type === "text" ? "" : `[${msg.type}]`);
                if (blockContactRequests && messageContainsContactRequest(bodyText)) {
                  continue;
                }
                const msgId = msg.id;
                const timestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString();
                const customerName = contactMap[customerWaId] ?? null;

                const lastBody = typeof bodyText === "string" ? bodyText.slice(0, 200) : "";
                const convPayload: Record<string, unknown> = {
                  organization_id: orgId,
                  customer_wa_id: customerWaId,
                  customer_external_id: customerWaId,
                  channel: "whatsapp",
                  phone_number_id: phoneNumberId,
                  last_message_at: timestamp,
                  last_message_body: lastBody,
                  updated_at: timestamp,
                };
                if (customerName) convPayload.customer_name = customerName;

                const { data: existingConv } = await supabase
                  .from("whatsapp_conversations")
                  .select("id")
                  .eq("organization_id", orgId)
                  .eq("customer_wa_id", customerWaId)
                  .eq("channel", "whatsapp")
                  .eq("phone_number_id", phoneNumberId)
                  .maybeSingle();

                let conv: { id: string } | null = null;
                if (existingConv) {
                  const { data: updated } = await supabase
                    .from("whatsapp_conversations")
                    .update({
                      last_message_at: timestamp,
                      last_message_body: lastBody,
                      customer_name: customerName ?? undefined,
                      updated_at: timestamp,
                    })
                    .eq("id", existingConv.id)
                    .select("id")
                    .single();
                  conv = updated;
                } else {
                  const { data: inserted, error: insertErr } = await supabase
                    .from("whatsapp_conversations")
                    .insert(convPayload)
                    .select("id")
                    .single();
                  if (insertErr) {
                    console.error("Conversation insert error", insertErr);
                    continue;
                  }
                  conv = inserted;
                }

                if (!conv) {
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
                  platform_message_id: msgId,
                  channel: "whatsapp",
                  body: bodyText,
                  message_type: msg.type ?? "text",
                  raw_metadata: msg,
                  created_at: timestamp,
                };
                if (mediaUrl) insertPayload.media_url = mediaUrl;

                await supabase.from("whatsapp_messages").insert(insertPayload);
                // Sync last_message from actual latest message so preview is always correct
                await supabase.rpc("sync_conversation_last_message", { p_conversation_id: conv.id });

                // Resolve-cycle tracking: first_inbound_at, re-open to Unread (Open), new cycle when Closed or new conv
                const { data: convRow } = await supabase
                  .from("whatsapp_conversations")
                  .select("lead_status_id, first_inbound_at")
                  .eq("id", conv.id)
                  .single();
                const statusId = convRow?.lead_status_id ?? null;
                const firstInboundAt = convRow?.first_inbound_at ?? null;
                let leadStatusName: string | null = null;
                if (statusId) {
                  const { data: statusRow } = await supabase
                    .from("lead_statuses")
                    .select("name")
                    .eq("id", statusId)
                    .maybeSingle();
                  leadStatusName = (statusRow?.name as string) ?? null;
                }
                const { data: openStatus } = await supabase
                  .from("lead_statuses")
                  .select("id")
                  .eq("name", "Open")
                  .maybeSingle();
                const openStatusId = openStatus?.id ?? null;

                if (firstInboundAt == null) {
                  await supabase
                    .from("whatsapp_conversations")
                    .update({ first_inbound_at: timestamp, updated_at: timestamp })
                    .eq("id", conv.id);
                }

                const isClosed = leadStatusName?.trim().toLowerCase() === "closed";
                const isNewOrReopen = openStatusId && (statusId == null || isClosed);
                console.log("Resolve-cycle:", {
                  conversation_id: conv.id,
                  leadStatusName,
                  isClosed,
                  openStatusId: openStatusId ?? "MISSING",
                  isNewOrReopen,
                });
                if (isNewOrReopen) {
                  const { error: updateErr } = await supabase
                    .from("whatsapp_conversations")
                    .update({ lead_status_id: openStatusId, updated_at: timestamp })
                    .eq("id", conv.id);
                  if (updateErr) console.error("Reopen to Open (Unread) update error:", updateErr);
                  else console.log("Reopened conversation to Open (Unread):", conv.id);
                  const { error: cycleErr } = await supabase.from("whatsapp_conversation_cycles").insert({
                    conversation_id: conv.id,
                    cycle_started_at: timestamp,
                  });
                  if (cycleErr) console.error("New cycle insert error:", cycleErr);
                } else if (isClosed && !openStatusId) {
                  console.warn("Cannot reopen: lead_statuses has no row with name 'Open'. Add Open status in DB.");
                }
              }
            }
          }
        }
      }

      // Instagram: Meta mengirim object="instagram". Pastikan di Meta Developer → Webhooks → Instagram
      // Callback URL = URL whatsapp-webhook ini, Verify Token = sama dengan organization_meta_config.verify_token, subscribe "messages".
      const isInstagramPayload = body.object != null && String(body.object).toLowerCase() === "instagram";
      if (isInstagramPayload) {
        try {
          console.log("Instagram webhook: entered");
          const rawEntry = body.entry;
          const entries = Array.isArray(rawEntry) ? (rawEntry as InstagramWebhookEntry[]) : [];
          const firstEntry = entries[0] != null && typeof entries[0] === "object" ? entries[0] : null;
          const firstEntryKeys = firstEntry ? Object.keys(firstEntry) : [];
          const safeMessagingCount = entries.reduce((n: number, e: InstagramWebhookEntry) => n + (e && typeof e === "object" && Array.isArray(e.messaging) ? e.messaging.length : 0), 0);
          const safeHasChanges = entries.some((e: InstagramWebhookEntry) => e && typeof e === "object" && (e.changes?.length ?? 0) > 0);
          console.log("Instagram webhook: received", {
            entryCount: entries.length,
            firstEntryId: firstEntry?.id ?? null,
            firstEntryKeys,
            messagingCount: safeMessagingCount,
            hasChanges: safeHasChanges,
          });
          let instagramProcessedCount = 0;
          for (const entry of entries) {
            if (!entry || typeof entry !== "object") continue;
            // Meta bisa kirim entry.messaging (DM real) sebagai array ATAU objek tunggal; entry.changes; entry.value
            const rawMessaging = entry.messaging;
            const fromMessaging: InstagramMessagingEvent[] = Array.isArray(rawMessaging)
              ? rawMessaging
              : rawMessaging != null && typeof rawMessaging === "object"
                ? [rawMessaging as InstagramMessagingEvent]
                : [];
            const fromValue: InstagramMessagingEvent[] = [];
            const entryValue = entry.value as Record<string, unknown> | undefined;
            if (entryValue && typeof entryValue === "object") {
              const arr = (entryValue.messaging ?? entryValue.messages) as InstagramMessagingEvent[] | undefined;
              if (Array.isArray(arr) && arr.length > 0) fromValue.push(...arr);
              else if (entryValue.sender != null && entryValue.message != null) {
                fromValue.push(entryValue as unknown as InstagramMessagingEvent);
              }
            }
            const fromChanges: InstagramMessagingEvent[] = [];
            if (entry.changes?.length) {
              for (const ch of entry.changes) {
                if (ch.field !== "messages" || !ch.value) continue;
                const val = ch.value as Record<string, unknown>;
                const arr = (val.messaging ?? val.messages) as InstagramMessagingEvent[] | undefined;
                if (Array.isArray(arr) && arr.length > 0) {
                  fromChanges.push(...arr);
                } else if (val.sender != null && val.message != null) {
                  fromChanges.push(val as unknown as InstagramMessagingEvent);
                }
              }
              if (fromChanges.length === 0 && entry.changes.length > 0) {
                const first = entry.changes[0];
                const val = first?.value as Record<string, unknown> | undefined;
                console.log("Instagram webhook: entry.changes value structure (no events parsed)", {
                  firstChangeField: first?.field,
                  valueKeys: val ? Object.keys(val) : [],
                  hint: "DM asli mungkin pakai struktur value lain; sesuaikan parsing.",
                });
              }
            }
            const messaging = fromMessaging.length > 0 ? fromMessaging : fromValue.length > 0 ? fromValue : fromChanges;
            if (fromMessaging.length > 0) {
              console.log("Instagram webhook: using entry.messaging", { count: fromMessaging.length });
            }
            if (fromValue.length > 0) {
              console.log("Instagram webhook: using entry.value.messaging", { count: fromValue.length });
            }
            if (fromChanges.length > 0) {
              console.log("Instagram webhook: using events from entry.changes", { count: fromChanges.length });
            }
            if (messaging.length === 0) {
              console.log("Instagram webhook: no messaging array found in entry", { entryKeys: Object.keys(entry) });
            } else if (messaging.length > 0) {
              const firstEv = messaging[0] as Record<string, unknown>;
              console.log("Instagram webhook: first event keys", { keys: firstEv ? Object.keys(firstEv) : [] });
            }
            for (const ev of messaging) {
              const eventObj = ev as Record<string, unknown>;
              const event = ev as InstagramMessagingEvent;
              const hasMessageEdit = "message_edit" in eventObj && eventObj.message_edit != null;
              let message = eventObj.message as InstagramMessage | undefined;
              let senderId = (event.sender ?? event.from)?.id != null ? String((event.sender ?? event.from)!.id) : (eventObj.sender as { id?: string | number } | undefined)?.id != null ? String((eventObj.sender as { id: string | number }).id) : "";
              let recipientId = event.recipient?.id != null ? String(event.recipient.id) : (eventObj.recipient as { id?: string | number } | undefined)?.id != null ? String((eventObj.recipient as { id: string | number }).id) : "";

              if (hasMessageEdit && !message) {
                const me = eventObj.message_edit as Record<string, unknown> | undefined;
                const meKeys = me ? Object.keys(me) : [];
                const senderFromMe = (me?.sender as { id?: string | number } | undefined)?.id ?? (me?.from as { id?: string | number } | undefined)?.id;
                const recipientFromMe = (me?.recipient as { id?: string | number } | undefined)?.id;
                if (senderFromMe != null) senderId = String(senderFromMe);
                if (recipientFromMe != null) recipientId = String(recipientFromMe);
                if (!recipientId && entry.id != null) recipientId = String(entry.id);
                const editText = typeof me?.text === "string" ? me.text.trim() : "";
                if (senderId && recipientId && editText) {
                  message = { mid: typeof me?.mid === "string" ? me.mid : undefined, text: editText } as InstagramMessage;
                } else {
                  if (meKeys.length > 0) {
                    console.log("Instagram webhook: message_edit structure", { message_editKeys: meKeys, entryId: entry.id });
                  }
                  continue;
                }
              }

              if (!senderId || !recipientId) {
                if (!hasMessageEdit) {
                  console.log("Instagram webhook: skip event missing sender/recipient", { hasSender: !!senderId, hasRecipient: !!recipientId, eventKeys: Object.keys(eventObj) });
                }
                continue;
              }
              if (!message) {
                if (!hasMessageEdit) {
                  console.log("Instagram webhook: skip event missing message", { eventKeys: Object.keys(eventObj) });
                }
                continue;
              }

              console.log("Instagram webhook: processing event", {
                senderId: senderId.slice(0, 8) + "...",
                recipientId: recipientId.slice(0, 8) + "...",
                isEcho: !!message.is_echo,
                hasText: !!(message.text && String(message.text).trim()),
                hasAttachments: !!(message.attachments && message.attachments.length > 0),
              });

              const isOutbound = message.is_echo === true;
              const msgMid = message.mid;
              let bodyText = (message.text && String(message.text).trim()) ? String(message.text).trim() : "";
              const attachments = message.attachments ?? [];
              if (!bodyText && attachments.length > 0) {
                const firstType = attachments[0]?.type ?? "file";
                bodyText = firstType === "image" ? "[image]" : firstType === "video" ? "[video]" : firstType === "audio" ? "[audio]" : "[file]";
              }
              const timestamp = event.timestamp
                ? new Date(Number(event.timestamp)).toISOString()
                : new Date().toISOString();

              const ourIgId = isOutbound ? senderId : recipientId;
              const customerExternalId = isOutbound ? recipientId : senderId;

              const entryIdStr = entry.id != null ? String(entry.id) : "";
              const possibleOurIds = [ourIgId, entryIdStr, recipientId, senderId].filter(
                (id) => id && id !== "undefined"
              );

              let config: { organization_id: string; meta_access_token: string } | null = null;
              let configError: Error | null = null;
              for (const igId of possibleOurIds) {
                const { data, error } = await supabase
                  .from("organization_meta_config")
                  .select("organization_id, meta_access_token")
                  .eq("instagram_business_account_id", igId)
                  .eq("is_active", true)
                  .maybeSingle();
                if (!error && data) {
                  config = data;
                  break;
                }
                configError = error ?? null;
              }

              if (!config) {
                const { data: fallbackRow, error: fallbackErr } = await supabase
                  .from("organization_meta_config")
                  .select("organization_id, meta_access_token, instagram_business_account_id")
                  .eq("is_active", true)
                  .not("instagram_business_account_id", "is", null)
                  .limit(1)
                  .maybeSingle();
                if (!fallbackErr && fallbackRow?.organization_id && fallbackRow?.meta_access_token) {
                  config = {
                    organization_id: fallbackRow.organization_id,
                    meta_access_token: fallbackRow.meta_access_token,
                  };
                }
              }

              if (!config) {
                console.error("Instagram webhook: config not found. Untuk pesan masuk, recipient.id = ID akun Instagram Anda (mis. 17841445621371498). Pastikan: 1) Meta Developer → Webhooks → Instagram → Callback URL & Verify Token sama dengan WhatsApp, subscribe 'messages'. 2) Di DB organization_meta_config.instagram_business_account_id harus sama dengan recipient.id. recipientId=", recipientId, "possibleOurIds=", possibleOurIds, "error:", configError?.message ?? null);
                continue;
              }

              console.log("Instagram webhook: config found", { orgId: config.organization_id });
              const orgId = config.organization_id;
              const lastBody = bodyText.slice(0, 200);

              // Table has partial unique index (org, customer_wa_id) WHERE channel='instagram', not a full constraint,
              // so ON CONFLICT is not usable. Do select-then-insert-or-update instead.
              const { data: existingConv } = await supabase
                .from("whatsapp_conversations")
                .select("id, customer_name")
                .eq("organization_id", orgId)
                .eq("customer_wa_id", customerExternalId)
                .or("channel.eq.instagram,channel.is.null")
                .maybeSingle();

              let conv: { id: string } | null = null;
              let needsCustomerName = false;
              if (existingConv?.id) {
                const currentName = (existingConv as { customer_name?: string }).customer_name?.trim() ?? "";
                needsCustomerName = !currentName || currentName === "Instagram User";
                const { error: updateErr } = await supabase
                  .from("whatsapp_conversations")
                  .update({
                    last_message_at: timestamp,
                    last_message_body: lastBody,
                    updated_at: timestamp,
                  })
                  .eq("id", existingConv.id);
                if (!updateErr) conv = { id: existingConv.id };
              }
              if (!conv) {
                needsCustomerName = true;
                const { data: inserted, error: insertErr } = await supabase
                  .from("whatsapp_conversations")
                  .insert({
                    organization_id: orgId,
                    customer_wa_id: customerExternalId,
                    customer_external_id: customerExternalId,
                    channel: "instagram",
                    last_message_at: timestamp,
                    last_message_body: lastBody,
                    updated_at: timestamp,
                  })
                  .select("id")
                  .single();
                if (insertErr || !inserted) {
                  console.error("Instagram webhook: conversation insert/update error", insertErr ?? "no row");
                  continue;
                }
                conv = inserted;
              }

              // Tarik nama real dari Meta User Profile API agar tampil nama akun (bukan nomor/****)
              if (needsCustomerName && config.meta_access_token) {
                const profileResult = await fetchInstagramUserDisplayName(customerExternalId, config.meta_access_token);
                if ("name" in profileResult && profileResult.name) {
                  await supabase
                    .from("whatsapp_conversations")
                    .update({ customer_name: profileResult.name, updated_at: timestamp })
                    .eq("id", conv.id);
                  console.log("Instagram webhook: customer_name updated", { conversationId: conv.id, displayName: profileResult.name });
                } else {
                  const errMsg = "error" in profileResult ? profileResult.error : "no name";
                  console.warn("Instagram webhook: profile API could not get name", { conversationId: conv.id, customerId: customerExternalId.slice(0, 8) + "...", reason: errMsg });
                }
              }

              const messageType = attachments.length > 0
                ? (attachments[0]?.type === "image" ? "image" : attachments[0]?.type === "video" ? "video" : attachments[0]?.type === "audio" ? "audio" : "document")
                : "text";

              if (isOutbound && msgMid) {
                const { data: existingOutbound } = await supabase
                  .from("whatsapp_messages")
                  .select("id")
                  .eq("conversation_id", conv.id)
                  .eq("wa_message_id", msgMid)
                  .eq("direction", "outbound")
                  .maybeSingle();
                if (existingOutbound) {
                  await supabase.rpc("sync_conversation_last_message", { p_conversation_id: conv.id });
                  continue;
                }
              }

              const { error: insertMsgError } = await supabase.from("whatsapp_messages").insert({
                conversation_id: conv.id,
                direction: isOutbound ? "outbound" : "inbound",
                wa_message_id: msgMid,
                platform_message_id: msgMid,
                channel: "instagram",
                body: bodyText,
                message_type: messageType,
                raw_metadata: event,
                created_at: timestamp,
              });

              if (insertMsgError) {
                console.error("Instagram webhook: whatsapp_messages insert failed", insertMsgError);
                continue;
              }
              instagramProcessedCount++;
              console.log("Instagram webhook: message saved", { conversationId: conv.id, direction: isOutbound ? "outbound" : "inbound" });

              await supabase.rpc("sync_conversation_last_message", { p_conversation_id: conv.id });

              if (!isOutbound) {
                const { data: convRow } = await supabase
                  .from("whatsapp_conversations")
                  .select("lead_status_id, first_inbound_at")
                  .eq("id", conv.id)
                  .single();
                const statusId = convRow?.lead_status_id ?? null;
                const firstInboundAt = convRow?.first_inbound_at ?? null;
                let leadStatusName: string | null = null;
                if (statusId) {
                  const { data: statusRow } = await supabase
                    .from("lead_statuses")
                    .select("name")
                    .eq("id", statusId)
                    .maybeSingle();
                  leadStatusName = (statusRow?.name as string) ?? null;
                }
                const { data: openStatus } = await supabase
                  .from("lead_statuses")
                  .select("id")
                  .eq("name", "Open")
                  .maybeSingle();
                const openStatusId = openStatus?.id ?? null;

                if (firstInboundAt == null) {
                  await supabase
                    .from("whatsapp_conversations")
                    .update({ first_inbound_at: timestamp, updated_at: timestamp })
                    .eq("id", conv.id);
                }

                const isClosed = leadStatusName?.trim().toLowerCase() === "closed";
                const isNewOrReopen = openStatusId && (statusId == null || isClosed);
                if (isNewOrReopen) {
                  await supabase
                    .from("whatsapp_conversations")
                    .update({ lead_status_id: openStatusId, updated_at: timestamp })
                    .eq("id", conv.id);
                  await supabase.from("whatsapp_conversation_cycles").insert({
                    conversation_id: conv.id,
                    cycle_started_at: timestamp,
                  });
                }
              }
            }
          }
          if (instagramProcessedCount === 0) {
            const hasChanges = entries.some((e: InstagramWebhookEntry) => e && typeof e === "object" && (e.changes?.length ?? 0) > 0);
            const firstEntryRaw = entries[0];
            const firstMessagingRaw = firstEntryRaw && typeof firstEntryRaw === "object" ? (firstEntryRaw as InstagramWebhookEntry).messaging : undefined;
            const firstMessagingArr = Array.isArray(firstMessagingRaw) ? firstMessagingRaw : firstMessagingRaw != null && typeof firstMessagingRaw === "object" ? [firstMessagingRaw] : [];
            const firstEv = firstMessagingArr[0] as Record<string, unknown> | undefined;
            const firstEvKeys = firstEv ? Object.keys(firstEv) : [];
            const hasMessageEdit = firstEv?.message_edit != null;
            const hasMessage = firstEv?.message != null;
            const hint = hasMessageEdit && !hasMessage
              ? "Event ini message_edit (pesan diedit), bukan pesan baru. Kirim pesan baru (bukan edit) ke @akun_instagram untuk tes inbound."
              : hasChanges
                ? "Payload pakai entry.changes – mungkin format lain."
                : "Pastikan event punya sender, recipient, message.";
            console.log("Instagram webhook: no message events processed.", {
              hint,
              entryCount: entries.length,
              firstEntryKeys: firstEntry && typeof firstEntry === "object" ? Object.keys(firstEntry) : [],
              firstMessagingLength: firstMessagingArr.length,
              firstEventKeys: firstEvKeys,
              isMessageEditOnly: hasMessageEdit && !hasMessage,
            });
            if (hasMessageEdit && firstEv?.message_edit != null) {
              try {
                const meStr = JSON.stringify(firstEv.message_edit).slice(0, 800);
                console.log("Instagram webhook: message_edit payload (untuk parsing)", { message_editSample: meStr });
              } catch (_) {}
            }
          }
        } catch (instagramErr) {
          console.error("Instagram webhook: error", instagramErr);
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
