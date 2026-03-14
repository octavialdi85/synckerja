/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const IMAGE_DESCRIPTION_ONE_IMAGE = `You are an expert at describing visual content for video generation. Your task is to produce a single text in English that will be used as a "description from image" so the generated video matches the image exactly.

Given the attached image, output exactly TWO sections in one text block:

1. **--- LAYOUT & COMPOSITION ---**
   Describe: position of all elements in the frame (left, right, center, top, bottom), arrangement and spacing, layout structure. Also describe style: colors, typography/fonts, visual style, composition (e.g. grid, overlapping, symmetry). Everything that must appear in the video exactly as in the image in terms of layout and style.

2. **--- CHARACTER & SCENE ---**
   Describe: any character(s) visible (appearance, expression, pose, clothing), scene elements, props, background elements. Everything that must appear in the video exactly as in the image.

Write in clear English. No title or preamble outside these two section headers. Use paragraphs or short bullet points under each section as needed. The goal is that a video model can use this text to reproduce the image faithfully.`;

const IMAGE_DESCRIPTION_TWO_IMAGES = `You are an expert at describing visual content for video generation. Your task is to produce a single text in English that will be used as a "description from image" so the generated video matches the images exactly.

You are given TWO images:
- **First image**: Focus on LAYOUT & COMPOSITION — position of elements in the frame, arrangement, spacing, layout structure, colors, typography, visual style. Describe everything that must appear in the video exactly as in this image (layout and style).
- **Second image**: Focus on CHARACTER & SCENE — character(s) visible (appearance, expression, pose, clothing), scene elements, props, background. Describe everything that must appear in the video exactly as in this image.

Output exactly TWO sections in one text block:

1. **--- LAYOUT & COMPOSITION ---**
   (From the first image.)

2. **--- CHARACTER & SCENE ---**
   (From the second image.)

Write in clear English. No title or preamble outside these two section headers. Use paragraphs or short bullet points under each section as needed. The goal is that a video model can use this text to reproduce the visuals faithfully.`;

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
    const imageBase64SecondRaw = body.imageBase64Second != null ? String(body.imageBase64Second).trim() : "";

    if (!imageBase64Raw) {
      return jsonResponse({ error: "Missing imageBase64" }, 400);
    }

    const stripBase64 = (raw: string) =>
      raw.includes("base64,") ? raw.split("base64,")[1]?.trim() ?? raw : raw;

    const imageBase64 = stripBase64(imageBase64Raw);
    const maxBase64Length = 5 * 1024 * 1024;
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

    let imageBase64Second = "";
    if (imageBase64SecondRaw.length > 0) {
      imageBase64Second = stripBase64(imageBase64SecondRaw);
      if (imageBase64Second.length > maxBase64Length) {
        return jsonResponse(
          { error: "Second image is too large. Use a smaller image (under ~3MB)." },
          400
        );
      }
      if (imageBase64Second.length >= 100) {
        // use second image
      } else {
        imageBase64Second = "";
      }
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

    const hasSecondImage = imageBase64Second.length >= 100;
    const userPrompt = hasSecondImage ? IMAGE_DESCRIPTION_TWO_IMAGES : IMAGE_DESCRIPTION_ONE_IMAGE;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const parts: unknown[] = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
    ];
    if (hasSecondImage) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64Second,
        },
      });
    }
    parts.push({ text: userPrompt });

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
      let errMsg = "Failed to generate image description";
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
    const imageDescriptionPrompt = typeof textPart === "string" ? textPart.trim() : "";

    if (finishReason && finishReason !== "STOP" && finishReason !== "END_TURN" && finishReason !== "MAX_TOKENS") {
      return jsonResponse(
        { error: `AI did not complete (${finishReason}). Try again or simplify.` },
        400
      );
    }
    if (finishReason === "MAX_TOKENS" && !imageDescriptionPrompt) {
      return jsonResponse(
        { error: "Output was too long (MAX_TOKENS). Try with fewer or smaller images." },
        400
      );
    }

    if (!imageDescriptionPrompt) {
      return jsonResponse(
        { error: "No image description generated. Try again or use a different image." },
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
    }

    return jsonResponse({ imageDescriptionPrompt }, 200);
  } catch (err) {
    console.error("generate-scene-image-description error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
