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
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: { ...corsHeaders, "Content-Length": "2" } });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId?.trim() || !appSecret?.trim()) {
      console.error("meta-oauth-exchange: META_APP_ID or META_APP_SECRET not set");
      return new Response(
        JSON.stringify({ error: "Meta OAuth not configured (META_APP_ID / META_APP_SECRET)." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseWithUser = createClient(supabaseUrl, serviceRoleKey, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabaseWithUser.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId = profile?.active_organization_id ?? null;
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "No active organization. Select an organization first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({})) as { code?: string; redirect_uri?: string };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri.trim() : "";

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing code (OAuth authorization code)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing redirect_uri (must match Meta app callback URL)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl, { method: "GET" });
    const tokenData = await tokenRes.json().catch(() => ({})) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { message?: string; code?: number };
    };

    if (!tokenRes.ok || tokenData?.error) {
      const errMsg = tokenData?.error?.message ?? "Meta token exchange failed";
      console.error("meta-oauth-exchange: token exchange failed", errMsg);
      return new Response(
        JSON.stringify({ error: errMsg, code: tokenData?.error?.code }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = tokenData?.access_token?.trim() ?? "";
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "No access_token in Meta response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange for long-lived token (60 days) if short-lived
    const exchangeUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(accessToken)}`;
    const longRes = await fetch(exchangeUrl, { method: "GET" });
    const longData = await longRes.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
    if (longRes.ok && longData?.access_token?.trim()) {
      accessToken = longData.access_token.trim();
    }

    const { data: existing, error: selectErr } = await supabaseAdmin
      .from("organization_meta_config")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle();

    const rowExists = !selectErr && existing != null;

    if (rowExists) {
      const { error: updateErr } = await supabaseAdmin
        .from("organization_meta_config")
        .update({
          meta_access_token: accessToken,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId);

      if (updateErr) {
        console.error("meta-oauth-exchange: update failed", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to save token." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const verifyToken = crypto.randomUUID().replace(/-/g, "");
      const insertPayload: Record<string, unknown> = {
        organization_id: orgId,
        meta_access_token: accessToken,
        verify_token: verifyToken,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };
      const { error: insertErr } = await supabaseAdmin.from("organization_meta_config").insert(insertPayload);

      if (insertErr) {
        if (insertErr.code === "23505") {
          const { error: updateErr } = await supabaseAdmin
            .from("organization_meta_config")
            .update({
              meta_access_token: accessToken,
              updated_at: new Date().toISOString(),
            })
            .eq("organization_id", orgId);
          if (updateErr) {
            console.error("meta-oauth-exchange: update after conflict failed", updateErr);
            return new Response(
              JSON.stringify({ error: "Failed to save token." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.error("meta-oauth-exchange: insert failed", insertErr);
          return new Response(
            JSON.stringify({ error: "Failed to save token." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Token saved. You can now load Instagram accounts." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("meta-oauth-exchange: error", err);
    return new Response(
      JSON.stringify({ error: "Internal error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
