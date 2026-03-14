/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const NEGATIVE_PROMPT_INSTRUCTION = `You are an expert at writing negative prompts for video generation. Your task is to produce a single paragraph of NEGATIVE PROMPT in English.

Given the reference image (attached) and the scene context below, list what the video model should AVOID so that the generated video stays faithful to the intended design and does not show unwanted or corrupted content.

Consider:
1. **Image content**: Any text, logos, or graphics visible in the image. The negative prompt should help avoid misspelled/garbled/corrupted versions of that text, wrong fonts, extra watermarks, or unintended logos.
2. **Super prompt**: Only text explicitly mentioned in the positive super prompt should appear. Anything else (wrong wording, extra text, broken characters) should be in the negative prompt.
3. **Language & narration**: Dialogue/narration language is specified; avoid wrong language or wrong/mumbled dialogue.
4. **Camera movement**: The chosen camera move is specified; avoid other or conflicting camera movements.
5. **Common video artifacts**: Distorted faces, low quality or blur, unnatural hands/fingers, messy or inconsistent background, text artifacts, stretched or deformed glyphs.

Output ONLY the negative prompt paragraph in English. Do not include a title, preamble, or explanation. Write in a single paragraph with semicolons or commas between items (e.g. "DO NOT include: item1; item2; item3.").`;

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

  const jsonResponse = (body: object, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseWithUser = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabaseWithUser.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId = profile?.active_organization_id ?? null;
    if (!orgId) {
      return jsonResponse({ error: "No active organization" }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const imageBase64Raw = body.imageBase64 != null ? String(body.imageBase64).trim() : "";
    const superPrompt = body.superPrompt != null ? String(body.superPrompt).trim() : "";
    const language = body.language != null ? String(body.language).trim() : "";
    const cameraMovement = body.cameraMovement != null ? String(body.cameraMovement).trim() : "";
    const narration = body.narration != null ? String(body.narration).trim() : "";

    if (!imageBase64Raw) {
      return jsonResponse({ error: "Missing imageBase64" }, 400);
    }

    const imageBase64 = imageBase64Raw.includes("base64,")
      ? imageBase64Raw.split("base64,")[1]?.trim() ?? imageBase64Raw
      : imageBase64Raw;

    const maxBase64Length = 5 * 1024 * 1024; // ~5MB base64 (~3.75MB decoded)
    if (imageBase64.length > maxBase64Length) {
      return jsonResponse(
        { error: "Image is too large. Use a smaller image (under ~3MB)." },
        400
      );
    }
    if (imageBase64.length < 100) {
      return jsonResponse(
        { error: "Invalid image data. Please select or generate an image first." },
        400
      );
    }

    const { data: config, error: configError } = await supabaseAdmin
      .from("organization_script_ai_config")
      .select("google_ai_api_key, daily_limit, model, is_active")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (configError || !config) {
      return jsonResponse(
        { error: "Script AI config not found. Configure at Settings > Script AI Generator." },
        400
      );
    }

    if (!config.is_active) {
      return jsonResponse(
        { error: "Script AI is disabled. Enable it in Settings > Script AI Generator." },
        400
      );
    }

    const apiKey = (config.google_ai_api_key ?? "").trim();
    if (!apiKey) {
      return jsonResponse(
        { error: "Google AI API key not configured. Add it in Settings > Script AI Generator." },
        400
      );
    }

    const dailyLimit = Math.max(1, config.daily_limit ?? 50);
    const rawModel = (config.model ?? "gemini-2.5-flash").trim() || "gemini-2.5-flash";
    const deprecatedModels: Record<string, string> = {
      "gemini-1.5-flash": "gemini-2.5-flash",
      "gemini-1.5-flash-latest": "gemini-2.5-flash",
      "gemini-1.5-pro": "gemini-2.5-flash",
      "gemini-2.0-flash": "gemini-2.5-flash",
      "gemini-2.0-flash-exp": "gemini-2.5-flash",
    };
    const model = deprecatedModels[rawModel] ?? rawModel;

    const today = new Date().toISOString().slice(0, 10);
    const { data: usageRow, error: usageError } = await supabaseAdmin
      .from("script_ai_daily_usage")
      .select("id, count")
      .eq("organization_id", orgId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError) {
      console.error("Error fetching usage:", usageError);
      return jsonResponse({ error: "Failed to check usage limit" }, 500);
    }

    const currentCount = usageRow?.count ?? 0;
    if (currentCount >= dailyLimit) {
      return jsonResponse(
        { error: `Daily limit reached (${dailyLimit} per day). Try again tomorrow.` },
        429
      );
    }

    const contextBlock = [
      superPrompt ? `--- SUPER PROMPT (positive) ---\n${superPrompt}` : "",
      language ? `Language: ${language}` : "",
      cameraMovement ? `Camera movement: ${cameraMovement}` : "",
      narration ? `Narration/dialogue: ${narration}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const userPrompt = contextBlock
      ? `${NEGATIVE_PROMPT_INSTRUCTION}\n\n--- SCENE CONTEXT ---\n\n${contextBlock}`
      : NEGATIVE_PROMPT_INSTRUCTION;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const parts: unknown[] = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
      { text: userPrompt },
    ];

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      let errMsg = "Failed to generate negative prompt";
      try {
        const errJson = JSON.parse(errText) as { error?: { message?: string } };
        errMsg = errJson.error?.message ?? errMsg;
      } catch {
        // use default
      }
      return jsonResponse({ error: errMsg }, 500);
    }

    type GeminiPart = { text?: string };
    type GeminiCandidate = { finishReason?: string; content?: { parts?: GeminiPart[] } };
    const geminiData = (await geminiRes.json()) as {
      promptFeedback?: { blockReason?: string };
      candidates?: GeminiCandidate[];
    };

    const blockReason = geminiData?.promptFeedback?.blockReason;
    if (blockReason) {
      return jsonResponse(
        { error: `Content blocked by safety filters (${blockReason}). Try a different image or prompt.` },
        400
      );
    }

    const candidate = geminiData?.candidates?.[0];
    if (!candidate) {
      return jsonResponse(
        { error: "No response from AI. Try again or use a different image." },
        500
      );
    }

    const finishReason = candidate.finishReason ?? "";
    const textPart = candidate.content?.parts?.[0]?.text;
    const negativePrompt = typeof textPart === "string" ? textPart.trim() : "";

    if (finishReason && finishReason !== "STOP" && finishReason !== "END_TURN" && finishReason !== "MAX_TOKENS") {
      return jsonResponse(
        { error: `AI did not complete (${finishReason}). Try again or simplify the prompt.` },
        400
      );
    }
    if (finishReason === "MAX_TOKENS" && !negativePrompt) {
      return jsonResponse(
        { error: "Output was too long (MAX_TOKENS). Try a simpler scene or fewer details in the super prompt." },
        400
      );
    }

    if (!negativePrompt) {
      return jsonResponse(
        { error: "No negative prompt generated. Try again or use a different image." },
        500
      );
    }

    try {
      if (usageRow?.id) {
        await supabaseAdmin
          .from("script_ai_daily_usage")
          .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
          .eq("id", usageRow.id);
      } else {
        await supabaseAdmin.from("script_ai_daily_usage").insert({
          organization_id: orgId,
          usage_date: today,
          count: 1,
        });
      }
    } catch (usageErr) {
      console.error("Usage update failed:", usageErr);
      // still return success; usage is best-effort
    }

    return jsonResponse({ negativePrompt }, 200);
  } catch (err) {
    console.error("generate-scene-negative-prompt error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
