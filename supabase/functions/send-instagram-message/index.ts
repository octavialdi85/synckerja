/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const META_GRAPH_VERSION = "v18.0";

Deno.serve(async (req: Request) => {
  console.log("send-instagram-message: request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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
      console.log("send-instagram-message: missing or invalid Authorization");
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
      console.log("send-instagram-message: invalid token", userError?.message);
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

    let orgId = profile?.active_organization_id ?? null;

    const body = await req.json().catch(() => ({}));
    const to = body.to != null ? String(body.to).trim() : "";
    const text = body.text != null ? String(body.text).trim().slice(0, 1000) : "";
    const conversationId = body.conversation_id != null ? String(body.conversation_id).trim() : null;
    const replyToMid = body.reply_to_wa_message_id != null ? String(body.reply_to_wa_message_id).trim() : null;

    console.log("send-instagram-message: payload", {
      to: to ? `${to.slice(0, 6)}...` : "",
      textLen: text.length,
      conversationId: conversationId ?? null,
      replyToMid: replyToMid ?? null,
    });

    if (!to) {
      console.log("send-instagram-message: missing to (recipient PSID)");
      return new Response(
        JSON.stringify({
          error: "Penerima tidak tersedia (ID Instagram kosong). Pilih percakapan yang valid.",
          code: "MISSING_TO",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!text) {
      console.log("send-instagram-message: missing text");
      return new Response(
        JSON.stringify({
          error: "Pesan tidak boleh kosong.",
          code: "MISSING_TEXT",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userOrgs } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id);
    const orgIds = (userOrgs ?? []).map((r: { organization_id: string }) => r.organization_id);

    const tryOrg = async (oid: string) => {
      const { data, error } = await supabase
        .from("organization_meta_config")
        .select("organization_id, meta_access_token, meta_business_manager_id, instagram_business_account_id, facebook_page_id")
        .eq("organization_id", oid)
        .eq("is_active", true)
        .not("instagram_business_account_id", "is", null)
        .maybeSingle();
      if (!error && data?.meta_access_token?.trim()) return { config: data, orgId: oid };
      return null;
    };

    type ConfigRow = {
      organization_id: string;
      meta_access_token: string;
      meta_business_manager_id: string | null;
      instagram_business_account_id: string | null;
      facebook_page_id: string | null;
    };
    let config: ConfigRow | null = null;
    if (orgId) {
      config = (await tryOrg(orgId))?.config ?? null;
    }
    if (!config && orgIds.length > 0) {
      for (const oid of orgIds) {
        if (oid === orgId) continue;
        const r = await tryOrg(oid);
        if (r) {
          config = r.config;
          orgId = r.orgId;
          break;
        }
      }
    }

    if (!config) {
      console.log("send-instagram-message: no org config with Instagram", {
        activeOrgId: orgId ?? null,
        orgIdsTried: orgIds?.length ?? 0,
      });
      return new Response(
        JSON.stringify({
          error: "Instagram belum terhubung untuk organisasi ini. Buka halaman Connect Instagram dan sambungkan akun Instagram bisnis.",
          code: "INSTAGRAM_NOT_CONFIGURED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    orgId = config.organization_id;
    const storedToken = config.meta_access_token.trim();
    const igAccountId = (config.instagram_business_account_id ?? "").trim();
    const businessId = (config.meta_business_manager_id ?? "").trim() || null;

    // Send API requires Page access token. Resolve pageId + token: User token → /me/accounts; System User → /{businessId}/owned_pages.
    let pageId: string | null = (config.facebook_page_id ?? "").trim() || null;
    let tokenToUse: string = storedToken;
    let pageTokenResolved = false;

    const fields = "id,instagram_business_account{id},access_token";

    function pickPage(
      pages: Array<{ id?: string; access_token?: string; instagram_business_account?: { id?: string } }>
    ): void {
      const page = pages.find((p) => String(p?.instagram_business_account?.id ?? "") === igAccountId);
      if (page?.id) {
        pageId = String(page.id);
        if (typeof page?.access_token === "string" && page.access_token.trim()) {
          tokenToUse = page.access_token.trim();
          pageTokenResolved = true;
          console.log("send-instagram-message: using Page token", { pageId: pageId.slice(0, 8) + "..." });
        }
      }
    }

    if (igAccountId) {
      // 1) User token: GET /me/accounts (returns Pages + access_token per Page)
      const meUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=${encodeURIComponent(fields)}`;
      const accRes = await fetch(meUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${storedToken}` },
      });
      const accData = await accRes.json().catch(() => ({})) as {
        data?: Array<{ id?: string; access_token?: string; instagram_business_account?: { id?: string } }>;
        error?: { message?: string; code?: number };
      };
      console.log("send-instagram-message: /me/accounts", {
        ok: accRes.ok,
        status: accRes.status,
        dataLength: Array.isArray(accData?.data) ? accData.data.length : 0,
        error: accData?.error?.message ?? null,
      });
      if (Array.isArray(accData?.data)) pickPage(accData.data);

      // 2) System User (Business Manager): GET /{businessId}/owned_pages when /me/accounts empty or no token
      if (!pageTokenResolved && businessId) {
        const ownedUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(businessId)}/owned_pages?fields=${encodeURIComponent(fields)}`;
        const ownedRes = await fetch(ownedUrl, {
          method: "GET",
          headers: { "Authorization": `Bearer ${storedToken}` },
        });
        const ownedData = await ownedRes.json().catch(() => ({})) as {
          data?: Array<{ id?: string; access_token?: string; instagram_business_account?: { id?: string } }>;
          error?: { message?: string; code?: number };
        };
        console.log("send-instagram-message: /owned_pages (System User)", {
          ok: ownedRes.ok,
          status: ownedRes.status,
          dataLength: Array.isArray(ownedData?.data) ? ownedData.data.length : 0,
          error: ownedData?.error?.message ?? null,
        });
        if (Array.isArray(ownedData?.data)) pickPage(ownedData.data);
      }
    }

    if (!pageId) {
      console.log("send-instagram-message: no page ID (set facebook_page_id di Connect Instagram atau pastikan token punya akses Page)");
      return new Response(
        JSON.stringify({
          error: businessId
            ? "Tidak dapat mengambil Page/Instagram. Pastikan System User di Business Manager punya akses ke Page & Instagram, dan Meta Business Manager ID sudah diisi di Connect WhatsApp."
            : "Tidak dapat mengambil Page/Instagram. Pastikan token di Connect WhatsApp/Connect Instagram adalah User access token dari akun yang mengelola Page & Instagram, atau gunakan System User + isi Meta Business Manager ID.",
          code: "MISSING_PAGE_ID",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hadPageIdFromConfig = ((config.facebook_page_id ?? "").trim() || null) !== null;
    if (igAccountId && !pageTokenResolved && !hadPageIdFromConfig) {
      console.log("send-instagram-message: no Page token resolved; send would fail with 190");
      return new Response(
        JSON.stringify({
          error: businessId
            ? "System User token tidak mengembalikan access_token untuk Page. Di Business Manager pastikan System User punya role yang mengizinkan akses Page & Instagram, dan generate token dengan permission pages_show_list / instagram_manage_messages."
            : "Token harus User access token dengan permission pages_show_list, atau gunakan System User + Meta Business Manager ID.",
          code: "PAGE_TOKEN_REQUIRED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaPayload: Record<string, unknown> = {
      recipient: { id: to },
      message: { text },
    };
    if (replyToMid) {
      metaPayload.reply_to = { mid: replyToMid };
    }

    const metaUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/messages`;
    console.log("send-instagram-message: calling Meta API", { url: metaUrl, recipientId: to.slice(0, 8) + "..." });

    let metaRes: Response;
    let metaData: { recipient_id?: string; message_id?: string; error?: { message?: string; code?: number; error_subcode?: number } };
    try {
      metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      });
      const rawBody = await metaRes.text();
      metaData = (() => {
        try {
          return (rawBody ? JSON.parse(rawBody) : {}) as typeof metaData;
        } catch {
          return {};
        }
      })();
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Meta API request failed";
      console.error("send-instagram-message: Meta fetch error", msg);
      return new Response(
        JSON.stringify({
          error: "Gagal menghubungi Meta API. Cek koneksi atau token di Connect Instagram.",
          code: "META_FETCH_ERROR",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("send-instagram-message: Meta response", {
      ok: metaRes.ok,
      status: metaRes.status,
      message_id: metaData?.message_id ?? null,
      error: metaData?.error?.message ?? null,
    });

    if (!metaRes.ok) {
      const rawMsg = metaData?.error?.message ?? "Meta API error";
      const code = metaData?.error?.code;
      const subcode = metaData?.error?.error_subcode;
      // 551 = outside 24h messaging window (freeform only within 24h of user message)
      const errMsg =
        code === 551 || subcode === 551
          ? "Tidak bisa mengirim: percakapan di luar jendela 24 jam. Pengguna harus mengirim pesan dalam 24 jam terakhir agar Anda bisa membalas pesan bebas (bukan template)."
          : rawMsg;
      console.log("send-instagram-message: Meta API error", { code, subcode, message: rawMsg });
      return new Response(
        JSON.stringify({
          error: errMsg,
          details: metaData,
          code: code ?? undefined,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = metaData?.message_id ?? null;

    if (conversationId && messageId) {
      const now = new Date().toISOString();
      const insertPayload: Record<string, unknown> = {
        conversation_id: conversationId,
        direction: "outbound",
        wa_message_id: messageId,
        platform_message_id: messageId,
        channel: "instagram",
        body: text,
        message_type: "text",
        raw_metadata: metaData,
        status: "sent",
        created_at: now,
      };
      if (replyToMid) insertPayload.reply_to_wa_message_id = replyToMid;

      let insertResult = await supabase
        .from("whatsapp_messages")
        .insert(insertPayload)
        .select()
        .single();

      if (insertResult.error && /column|does not exist/i.test(insertResult.error.message ?? "")) {
        const fallbackPayload: Record<string, unknown> = {
          conversation_id: conversationId,
          direction: "outbound",
          wa_message_id: messageId,
          body: text,
          message_type: "text",
          raw_metadata: metaData,
          status: "sent",
          created_at: now,
        };
        if (replyToMid) fallbackPayload.reply_to_wa_message_id = replyToMid;
        insertResult = await supabase
          .from("whatsapp_messages")
          .insert(fallbackPayload)
          .select()
          .single();
      }

      if (insertResult.error) {
        console.error("send-instagram-message: whatsapp_messages insert error", insertResult.error);
      } else {
        await supabase.rpc("sync_conversation_last_message", { p_conversation_id: conversationId });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message_id: messageId,
          message: insertResult.data ?? null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("send-instagram-message: error", errMsg, err);
    return new Response(
      JSON.stringify({
        error: "Gagal mengirim pesan Instagram. Coba lagi atau cek Connect Instagram.",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
