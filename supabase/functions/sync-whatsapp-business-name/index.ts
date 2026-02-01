import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const META_GRAPH_VERSION = "v21.0";

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

    const { data: config, error: configError } = await supabase
      .from("organization_whatsapp_config")
      .select("whatsapp_access_token, phone_number_id, whatsapp_business_account_id")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (configError || !config?.whatsapp_access_token?.trim() || !config?.phone_number_id?.trim()) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured or missing Phone Number ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = config.whatsapp_access_token.trim();
    const phoneNumberId = config.phone_number_id.trim();
    const wabaId = config.whatsapp_business_account_id?.trim() || "";

    // 1) GET single phone number WITHOUT fields = default response includes display_phone_number, verified_name (per Meta docs)
    const metaUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}`;
    const metaRes = await fetch(metaUrl, {
      method: "GET",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    const metaData = await metaRes.json().catch(() => ({})) as {
      verified_name?: string;
      name_status?: string;
      display_phone_number?: string | number;
      error?: { message?: string };
    };

    if (!metaRes.ok) {
      const msg = metaData?.error?.message ?? "Meta API error";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = typeof metaData?.verified_name === "string" ? metaData.verified_name.trim() : null;
    let nameStatus: string | null = typeof metaData?.name_status === "string" ? metaData.name_status.trim() : null;
    let displayPhone: string | null = null;
    if (metaData?.display_phone_number != null) {
      const raw = metaData.display_phone_number;
      displayPhone = typeof raw === "number" ? String(raw) : (typeof raw === "string" ? raw.trim() : null);
      if (displayPhone && /^\d+$/.test(displayPhone)) displayPhone = `+${displayPhone}`;
    }

    // 2) If name_status missing from default, fetch it (beta field)
    if (nameStatus == null) {
      const statusUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}?fields=name_status`;
      const statusRes = await fetch(statusUrl, { method: "GET", headers: { "Authorization": `Bearer ${accessToken}` } });
      const statusData = await statusRes.json().catch(() => ({})) as { name_status?: string };
      if (statusRes.ok && typeof statusData?.name_status === "string") nameStatus = statusData.name_status.trim();
    }

    // 3) Fallback: if still no display_phone_number, get from WABA phone_numbers list
    if (!displayPhone && wabaId) {
      const listUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(wabaId)}/phone_numbers`;
      const listRes = await fetch(listUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      const listData = await listRes.json().catch(() => ({})) as {
        data?: Array<{ id?: string; display_phone_number?: string }>;
        error?: { message?: string };
      };
      if (listRes.ok && Array.isArray(listData?.data)) {
        const match = listData.data.find((p: { id?: string }) => p.id === phoneNumberId);
        const raw = match?.display_phone_number;
        if (raw != null) {
          displayPhone = typeof raw === "string" ? raw.trim() : String(raw);
          if (displayPhone && /^\d+$/.test(displayPhone)) displayPhone = `+${displayPhone}`;
        }
      }
    }

    if (!name) {
      return new Response(JSON.stringify({ error: "Meta did not return verified_name for this phone number" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload: Record<string, unknown> = {
      whatsapp_business_name: name,
      name_status: nameStatus,
      updated_at: new Date().toISOString(),
    };
    if (displayPhone) updatePayload.display_phone_number = displayPhone;

    const { error: updateError } = await supabase
      .from("organization_whatsapp_config")
      .update(updatePayload)
      .eq("organization_id", orgId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update name" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-whatsapp-business-name error:", err);
    return new Response(
      JSON.stringify({ error: "Sync failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
