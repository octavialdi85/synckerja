/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Prefer Nano Banana Pro (Gemini 3 Pro Image); fallback to 2.5 Flash Image if unavailable
const IMAGE_MODEL_PRIMARY = "gemini-3-pro-image-preview";
const IMAGE_MODEL_FALLBACK = "gemini-2.5-flash-image";
const VALID_ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;
type AspectRatio = (typeof VALID_ASPECT_RATIOS)[number];

function parseAspectRatio(value: unknown): AspectRatio {
  if (typeof value === "string" && VALID_ASPECT_RATIOS.includes(value as AspectRatio)) {
    return value as AspectRatio;
  }
  return "1:1";
}

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

  console.log("generate-design-image: request received");
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
    const prompt = body.prompt != null ? String(body.prompt).trim() : "";
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const referenceImageBase64 = body.referenceImageBase64 != null ? String(body.referenceImageBase64).trim() : "";
    const referenceImageMimeType =
      body.referenceImageMimeType != null && String(body.referenceImageMimeType).trim() !== ""
        ? String(body.referenceImageMimeType).trim()
        : "image/jpeg";
    const characterReferencesRaw = body.characterReferences;
    const characterReferences: { imageBase64: string; mimeType: string }[] = [];
    if (Array.isArray(characterReferencesRaw) && characterReferencesRaw.length > 0) {
      for (const item of characterReferencesRaw) {
        const b64 = item?.imageBase64 != null ? String(item.imageBase64).trim() : "";
        if (b64 === "") continue;
        const mt = item?.mimeType != null && String(item.mimeType).trim() !== "" ? String(item.mimeType).trim() : "image/jpeg";
        characterReferences.push({ imageBase64: b64, mimeType: mt });
      }
    } else if (body.characterReferenceImageBase64 != null && String(body.characterReferenceImageBase64).trim() !== "") {
      const b64 = String(body.characterReferenceImageBase64).trim();
      const mt = body.characterReferenceMimeType != null && String(body.characterReferenceMimeType).trim() !== ""
        ? String(body.characterReferenceMimeType).trim()
        : "image/jpeg";
      characterReferences.push({ imageBase64: b64, mimeType: mt });
    }
    const companyLogoBase64 =
      body.companyLogoBase64 != null ? String(body.companyLogoBase64).trim() : "";
    const companyLogoMimeType =
      body.companyLogoMimeType != null && String(body.companyLogoMimeType).trim() !== ""
        ? String(body.companyLogoMimeType).trim()
        : "image/png";

    const compositionReferencesRaw = body.compositionReferences;
    const compositionReferences: { imageBase64: string; mimeType: string }[] = [];
    if (Array.isArray(compositionReferencesRaw) && compositionReferencesRaw.length > 0) {
      for (const item of compositionReferencesRaw) {
        const b64 = item?.imageBase64 != null ? String(item.imageBase64).trim() : "";
        if (b64 === "") continue;
        const mt = item?.mimeType != null && String(item.mimeType).trim() !== "" ? String(item.mimeType).trim() : "image/jpeg";
        compositionReferences.push({ imageBase64: b64, mimeType: mt });
      }
    }

    if (!prompt) {
      return jsonResponse({ error: "Missing or empty prompt" }, 400);
    }

    const elementsText = body.elementsText != null ? String(body.elementsText).trim() : "";
    const layoutStyleText = body.layoutStyleText != null ? String(body.layoutStyleText).trim() : "";

    const { data: config, error: configError } = await supabaseAdmin
      .from("organization_script_ai_config")
      .select("google_ai_api_key, daily_limit, is_active")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (configError || !config) {
      return jsonResponse({ error: "Script AI config not found. Configure at Settings > Script AI Generator." }, 400);
    }

    if (!config.is_active) {
      return jsonResponse({ error: "Script AI is disabled. Enable it in Settings > Script AI Generator." }, 400);
    }

    const apiKey = (config.google_ai_api_key ?? "").trim();
    if (!apiKey) {
      return jsonResponse({ error: "Google AI API key not configured. Add it in Settings > Script AI Generator." }, 400);
    }

    const dailyLimit = Math.max(1, config.daily_limit ?? 50);
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
      return jsonResponse({
        error: `Daily limit reached (${dailyLimit} per day). Try again tomorrow.`,
      }, 429);
    }

    const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const generationConfig: Record<string, unknown> = {
      responseModalities: ["TEXT", "IMAGE"],
    };

    const parts: unknown[] = [];
    if (referenceImageBase64 !== "") {
      parts.push({
        inlineData: {
          mimeType: referenceImageMimeType,
          data: referenceImageBase64,
        },
      });
    }
    for (const ref of characterReferences) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.imageBase64,
        },
      });
    }
    if (companyLogoBase64 !== "") {
      parts.push({
        inlineData: {
          mimeType: companyLogoMimeType,
          data: companyLogoBase64,
        },
      });
      parts.push({
        text:
          "The image above is the company logo that MUST appear in the generated design. " +
          "Place the logo in the center (horizontally). Keep the logo SMALL and compact—like a typical header or watermark: it must be clearly readable but should occupy only a small fraction of the image (e.g. no larger than 10–15% of the canvas height). Do not make the logo dominate the layout. " +
          "Ensure the logo has strong contrast with its background (light logo on dark, dark on light, or add outline/glow). " +
          "Do NOT use any other logo or brand name from reference images; replace any existing logo with this one.\n\n",
      });
    }
    for (let i = 0; i < compositionReferences.length; i++) {
      const n = i + 1;
      parts.push({
        text:
          `Reference image ${n} (Gambar ke-${n}). Use this image when the user refers to 'gambar ke ${n}' or 'image ${n}':\n\n`,
      });
      const comp = compositionReferences[i];
      parts.push({
        inlineData: {
          mimeType: comp.mimeType,
          data: comp.imageBase64,
        },
      });
    }
    if (compositionReferences.length > 0) {
      parts.push({
        text:
          "The images above are numbered composition/style references (Gambar ke-1, Gambar ke-2, etc.). When the user's description refers to a number (e.g. 'gambar ke 1', 'image 2', 'masukan gambar ke 1 ke dalam handphone'), use the corresponding reference image. If no number is specified for a reference, use your judgment for composition and style. Generate an image that follows the same composition (layout, arrangement, positioning) and visual style (mood, colors, look) as these references where applicable. Combine with the design description below.\n\n",
      });
    }
    const numCharRefs = characterReferences.length;
    if (numCharRefs > 0) {
      const charLabels = Array.from({ length: numCharRefs }, (_, i) => `Character ${i + 1}`).join(", ");
      parts.push({
        text:
          `You have been given ${numCharRefs} character reference photo(s) in order (${charLabels}). ` +
          "Use each person's face and body for the corresponding character in the design description below.\n\n" +
          "MANDATORY CHARACTER RULES — follow exactly:\n" +
          "1) EXPRESSION: Use the exact facial expression specified (e.g. Sad = sorrowful, downcast, no smile; Happy = smiling, joyful; Angry = tense, frown; Neutral = calm, no strong emotion). Do NOT default to a happy or smiling expression unless the description says Happy or similar.\n" +
          "2) BODY POSE: If specified, the character's body must match (e.g. Sitting = seated; Standing = upright; Walking = mid-step; Running = in motion). If not specified, choose a natural pose.\n" +
          "3) HAND GESTURE: If specified, the character's hands/arms must match (e.g. Pointing up = arm raised; Arms crossed = arms folded; Waving = hand waving). If not specified, choose a natural gesture.\n" +
          "For characters where Expression, Body pose, or Hand gesture is not specified, you may choose a natural option. For any that IS specified, you MUST depict it clearly. Do not ignore or override the user's choices.\n\n",
      });
    }
    const characterInstruction =
      numCharRefs > 0
        ? referenceImageBase64 !== ""
          ? `Generate the image in aspect ratio ${aspectRatio}. The first attached image is the design reference. The next ${numCharRefs} image(s) are character references.\n\nIMPORTANT: In the design description below, each character has optional fields: Expression, Body pose, Hand gesture. Whatever is specified MUST be drawn exactly—e.g. Expression: Sad means that character must look sad (sorrowful face, no smile); Body pose: Sitting means that character must be seated; Hand gesture: Pointing up means that character's hand/arm must be pointing upward. Do not substitute a generic happy pose when the user chose a different expression or gesture.\n\n${companyLogoBase64 !== "" ? "Use the provided company logo in the design; do not use any logo from the reference image.\n\n" : ""}Design description:\n\n`
          : `Generate the image in aspect ratio ${aspectRatio}. The attached image(s) are character references in order.\n\nIMPORTANT: In the design description below, each character has optional fields: Expression, Body pose, Hand gesture. Whatever is specified MUST be drawn exactly—e.g. Expression: Sad means that character must look sad (sorrowful face, no smile); Body pose: Sitting means that character must be seated; Hand gesture: Pointing up means that character's hand/arm must be pointing upward. Do not substitute a generic happy pose when the user chose a different expression or gesture.\n\n${companyLogoBase64 !== "" ? "Use the provided company logo in the design.\n\n" : ""}Design description:\n\n`
        : `Generate the image in aspect ratio ${aspectRatio}.${companyLogoBase64 !== "" ? " Use the provided company logo visibly in the design." : ""}\n\n`;

    if (elementsText !== "") {
      parts.push({
        text:
          "MANDATORY ELEMENTS — The following elements MUST appear in the generated image exactly as specified. Do not omit, replace, or generalize any of these. Include every element listed:\n\n" +
          elementsText +
          "\n\n",
      });
    }
    if (layoutStyleText !== "") {
      parts.push({
        text:
          "MANDATORY COMPOSITION — Everything described below defines the composition to be created in a single frame/image. The composition, arrangement, and layout of the generated image MUST follow this description precisely:\n\n" +
          layoutStyleText +
          "\n\n",
      });
    }
    parts.push({ text: characterInstruction + prompt });

    const modelsToTry = [IMAGE_MODEL_PRIMARY, IMAGE_MODEL_FALLBACK];
    let lastErrorMsg = "Image generation failed";
    let geminiRes: Response | null = null;

    for (const model of modelsToTry) {
      geminiRes = await fetch(geminiUrl(model), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig,
        }),
      });
      if (geminiRes.ok) break;
      const errText = await geminiRes.text();
      console.error(`Gemini API error (${model}):`, geminiRes.status, errText);
      let errMsg = "Image generation failed";
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message ?? errMsg;
      } catch {
        // use default
      }
      lastErrorMsg = errMsg;
      if (geminiRes.status === 404) continue;
      return jsonResponse({ error: lastErrorMsg }, 500);
    }

    if (!geminiRes || !geminiRes.ok) {
      return jsonResponse({ error: lastErrorMsg }, 500);
    }

    let geminiData: unknown;
    try {
      geminiData = await geminiRes.json();
    } catch (parseErr) {
      console.error("Gemini response parse error:", parseErr);
      return jsonResponse({ error: "Invalid response from image API" }, 500);
    }

    const responseParts = (geminiData as { candidates?: Array<{ content?: { parts?: unknown[] } }> })?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(responseParts)) {
      return jsonResponse({ error: "No content generated from AI" }, 500);
    }

    let imageBase64: string | null = null;
    let mimeType = "image/png";
    for (const part of responseParts) {
      const p = part as { inlineData?: { data?: unknown; mimeType?: string }; inline_data?: { data?: unknown; mime_type?: string } };
      const inline = p?.inlineData ?? p?.inline_data;
      if (inline?.data) {
        imageBase64 = typeof inline.data === "string" ? inline.data : null;
        const m = inline as { mimeType?: string; mime_type?: string };
        if (m.mimeType) mimeType = String(m.mimeType);
        else if (m.mime_type) mimeType = String(m.mime_type);
        break;
      }
    }

    if (!imageBase64) {
      return jsonResponse({ error: "AI did not return an image" }, 500);
    }

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

    return jsonResponse({ imageBase64, mimeType }, 200);
  } catch (err) {
    console.error("generate-design-image error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
