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
const VALID_ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9", "custom"] as const;
type AspectRatio = (typeof VALID_ASPECT_RATIOS)[number];

function parseAspectRatio(value: unknown): AspectRatio {
  if (typeof value === "string" && VALID_ASPECT_RATIOS.includes(value as AspectRatio)) {
    return value as AspectRatio;
  }
  return "1:1";
}

function parseCustomSize(body: Record<string, unknown>): { width: number; height: number; unit: string } | null {
  const w = body.customWidth != null ? Number(body.customWidth) : NaN;
  const h = body.customHeight != null ? Number(body.customHeight) : NaN;
  const unit = body.customUnit != null && typeof body.customUnit === "string" && ["px", "in", "mm", "cm"].includes(String(body.customUnit).toLowerCase())
    ? String(body.customUnit).toLowerCase()
    : "px";
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || w > 99999 || h < 1 || h > 99999) return null;
  return { width: Math.round(w), height: Math.round(h), unit };
}

// Supported by Gemini image models (e.g. 2.5 Flash Image). Map custom size to nearest for generationConfig.aspectRatio.
const SUPPORTED_ASPECT_RATIOS: { value: string; ratio: number }[] = [
  { value: "1:1", ratio: 1 },
  { value: "2:3", ratio: 2 / 3 },
  { value: "3:2", ratio: 3 / 2 },
  { value: "3:4", ratio: 3 / 4 },
  { value: "4:3", ratio: 4 / 3 },
  { value: "4:5", ratio: 4 / 5 },
  { value: "5:4", ratio: 5 / 4 },
  { value: "9:16", ratio: 9 / 16 },
  { value: "16:9", ratio: 16 / 9 },
  { value: "21:9", ratio: 21 / 9 },
];
function customSizeToAspectRatio(width: number, height: number): string {
  const r = width / height;
  let best = SUPPORTED_ASPECT_RATIOS[0];
  let bestDiff = Math.abs(r - best.ratio);
  for (const { value, ratio } of SUPPORTED_ASPECT_RATIOS) {
    const diff = Math.abs(r - ratio);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = { value, ratio };
    }
  }
  return best.value;
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

    type CharRefSlot = { imageBase64: string; mimeType: string; description?: string };
    type CharacterStructuredRefItem = {
      head?: CharRefSlot;
      clothes?: CharRefSlot[];
      logo?: CharRefSlot;
      foot?: CharRefSlot;
      accessories?: CharRefSlot[];
    };
    type CharacterTextPartItem = { faceHair?: string; clothing?: string; foot?: string; accessories?: string };
    const characterStructuredReferences: CharacterStructuredRefItem[] = [];
    const characterStructuredReferencesRaw = body.characterStructuredReferences;
    if (Array.isArray(characterStructuredReferencesRaw) && characterStructuredReferencesRaw.length > 0) {
      for (const item of characterStructuredReferencesRaw) {
        const entry: CharacterStructuredRefItem = {};
        if (item?.head?.imageBase64 != null && String(item.head.imageBase64).trim() !== "") {
          const desc = item.head.description != null && String(item.head.description).trim() !== "" ? String(item.head.description).trim() : undefined;
          entry.head = { imageBase64: String(item.head.imageBase64).trim(), mimeType: item.head.mimeType != null && String(item.head.mimeType).trim() !== "" ? String(item.head.mimeType).trim() : "image/jpeg", ...(desc ? { description: desc } : {}) };
        }
        if (Array.isArray(item?.clothes) && item.clothes.length > 0) {
          entry.clothes = [];
          for (const c of item.clothes) {
            if (c?.imageBase64 != null && String(c.imageBase64).trim() !== "") {
              const desc = c.description != null && String(c.description).trim() !== "" ? String(c.description).trim() : undefined;
              entry.clothes!.push({ imageBase64: String(c.imageBase64).trim(), mimeType: c.mimeType != null && String(c.mimeType).trim() !== "" ? String(c.mimeType).trim() : "image/jpeg", ...(desc ? { description: desc } : {}) });
            }
          }
        }
        if (item?.logo?.imageBase64 != null && String(item.logo.imageBase64).trim() !== "") {
          const desc = item.logo.description != null && String(item.logo.description).trim() !== "" ? String(item.logo.description).trim() : undefined;
          entry.logo = { imageBase64: String(item.logo.imageBase64).trim(), mimeType: item.logo.mimeType != null && String(item.logo.mimeType).trim() !== "" ? String(item.logo.mimeType).trim() : "image/jpeg", ...(desc ? { description: desc } : {}) };
        }
        if (item?.foot?.imageBase64 != null && String(item.foot.imageBase64).trim() !== "") {
          const desc = item.foot.description != null && String(item.foot.description).trim() !== "" ? String(item.foot.description).trim() : undefined;
          entry.foot = { imageBase64: String(item.foot.imageBase64).trim(), mimeType: item.foot.mimeType != null && String(item.foot.mimeType).trim() !== "" ? String(item.foot.mimeType).trim() : "image/jpeg", ...(desc ? { description: desc } : {}) };
        }
        if (Array.isArray(item?.accessories) && item.accessories.length > 0) {
          entry.accessories = [];
          for (const a of item.accessories) {
            if (a?.imageBase64 != null && String(a.imageBase64).trim() !== "") {
              const desc = a.description != null && String(a.description).trim() !== "" ? String(a.description).trim() : undefined;
              entry.accessories!.push({ imageBase64: String(a.imageBase64).trim(), mimeType: a.mimeType != null && String(a.mimeType).trim() !== "" ? String(a.mimeType).trim() : "image/jpeg", ...(desc ? { description: desc } : {}) });
            }
          }
        }
        characterStructuredReferences.push(entry);
      }
    }
    const characterTextParts: CharacterTextPartItem[] = [];
    const characterTextPartsRaw = body.characterTextParts;
    if (Array.isArray(characterTextPartsRaw) && characterTextPartsRaw.length > 0) {
      for (const item of characterTextPartsRaw) {
        characterTextParts.push({
          faceHair: item?.faceHair != null && String(item.faceHair).trim() !== "" ? String(item.faceHair).trim() : undefined,
          clothing: item?.clothing != null && String(item.clothing).trim() !== "" ? String(item.clothing).trim() : undefined,
          foot: item?.foot != null && String(item.foot).trim() !== "" ? String(item.foot).trim() : undefined,
          accessories: item?.accessories != null && String(item.accessories).trim() !== "" ? String(item.accessories).trim() : undefined,
        });
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
    for (let i = 0; i < characterStructuredReferences.length; i++) {
      const n = i + 1;
      const struct = characterStructuredReferences[i];
      if (struct.head) {
        const headInstr = struct.head.description ? ` User instruction for this reference: ${struct.head.description}. Follow this instruction when drawing.\n\n` : "";
        parts.push({
          text:
            `MANDATORY — Character ${n} – Head. This image is the EXACT reference for this character's head. You MUST copy the hair from this image exactly: hair TEXTURE (curly, wavy, straight, kinky—if the reference shows curly hair, draw CURLY hair; if wavy, draw wavy; do NOT flatten to straight or swept-back), hair color, hair volume, hair shape, and hairstyle MUST match. Draw Character ${n} with this exact hair (and face if visible in the reference). If the reference shows only hair (e.g. isolated on white background), apply that exact hair texture and style to the character—do NOT replace with different hair from the design description. Do NOT add hats/caps that would hide this hair unless the reference itself shows headwear. Face/hair text in the design description must NOT override the reference: use it only when the reference shows obscured face (mask, helmet) or to refine skin; never use it to change hair texture or style.${headInstr}`,
        });
        parts.push({
          inlineData: { mimeType: struct.head.mimeType, data: struct.head.imageBase64 },
        });
      }
      if (struct.clothes && struct.clothes.length > 0) {
        for (let c = 0; c < struct.clothes.length; c++) {
          const slot = struct.clothes[c];
          const clothesInstr = slot.description ? ` User instruction for this reference: ${slot.description}. Follow this instruction when drawing.\n\n` : "";
          parts.push({
            text:
              `MANDATORY — Character ${n} – Clothes (${c === 0 ? "top/torso" : "bottom/legs"}). This image shows the EXACT garment the character MUST wear. You MUST draw Character ${n} wearing this exact item: same design, color, material, and style (e.g. armor, shirt, dress). Do NOT replace with other clothing from the design description. Copy this garment onto the character.${clothesInstr}`,
          });
          parts.push({
            inlineData: { mimeType: slot.mimeType, data: slot.imageBase64 },
          });
        }
      }
      if (struct.logo) {
        const logoInstr = struct.logo.description ? ` User instruction for this reference: ${struct.logo.description}. Follow this instruction when drawing.\n\n` : "";
        parts.push({
          text:
            `MANDATORY — Character ${n} – Logo on chest (ON THE CHARACTER'S CLOTHING ONLY). The following image is the EXACT logo that MUST appear ON Character ${n}'s BAU/shirt/jacket—on the CHEST area of the garment (left chest or right chest). This logo is PART OF THE CHARACTER'S OUTFIT. You MUST draw it ON the character's clothing. Do NOT put this logo in the design header, top of the image, center of the layout, or as a watermark. It must appear ONLY on the character's shirt/jacket/armor—nowhere else. Left chest or right chest only. You MUST use this exact logo image on the character's clothes; do not replace or omit it, and do not move it to the design/layout.${logoInstr}`,
        });
        parts.push({
          inlineData: { mimeType: struct.logo.mimeType, data: struct.logo.imageBase64 },
        });
      }
      if (struct.foot) {
        const footInstr = struct.foot.description ? ` User instruction for this reference: ${struct.foot.description}. Follow this instruction when drawing.\n\n` : "";
        parts.push({
          text:
            `MANDATORY — Character ${n} – Foot/shoes. This image shows the EXACT footwear the character MUST wear. You MUST draw Character ${n} wearing these exact shoes/boots. Do NOT replace with other footwear. Copy this footwear onto the character.${footInstr}`,
        });
        parts.push({
          inlineData: { mimeType: struct.foot.mimeType, data: struct.foot.imageBase64 },
        });
      }
      if (struct.accessories && struct.accessories.length > 0) {
        for (let a = 0; a < struct.accessories.length; a++) {
          const slot = struct.accessories[a];
          const accInstr = slot.description ? ` User instruction for this reference: ${slot.description}. Follow this instruction when drawing (e.g. how to wear, how to hold, or how to show the item).\n\n` : "";
          parts.push({
            text:
              `MANDATORY — Character ${n} – Accessories ${a + 1}. This image shows an EXACT accessory the character MUST wear or use (can be worn on body or held in hand). You MUST draw Character ${n} with this exact accessory (e.g. jewelry, glasses, hat, bag, prop). Do NOT replace with other accessories. Copy this accessory onto the character.${accInstr}`,
          });
          parts.push({
            inlineData: { mimeType: slot.mimeType, data: slot.imageBase64 },
          });
        }
      }
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
          "Do NOT use any other logo or brand name from reference images; replace any existing logo with this one. " +
          "NOTE: If you were also given 'Character N – Logo on chest' images earlier, those are for the CHARACTER'S CLOTHING ONLY (on the character's baju/shirt). Do not use those character logos in the design header—keep them on the character's chest. This company logo is separate and goes in the design layout.\n\n",
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
    const customSize = parseCustomSize(body);
    // Jangan kirim aspectRatio ke generationConfig: gemini-3-pro-image-preview tidak mendukung field ini (400 Unknown name "aspectRatio").
    // Orientasi dan ukuran custom tetap diarahkan lewat prompt (customSizePrefix + LANDSCAPE/PORTRAIT/SQUARE).
    const numCharRefs = characterReferences.length;
    if (numCharRefs > 0) {
      const charLabels = Array.from({ length: numCharRefs }, (_, i) => `Character ${i + 1}`).join(", ");
      let charRulesText =
        `You have been given ${numCharRefs} character reference photo(s) in order (${charLabels}). ` +
        "Use each person's face and body for the corresponding character in the design description below.\n\n" +
        "MANDATORY CHARACTER RULES — follow exactly:\n" +
        "1) EXPRESSION: Use the exact facial expression specified (e.g. Sad = sorrowful, downcast, no smile; Happy = smiling, joyful; Angry = tense, frown; Neutral = calm, no strong emotion). Do NOT default to a happy or smiling expression unless the description says Happy or similar.\n" +
        "2) BODY POSE: If specified, the character's body must match (e.g. Sitting = seated; Standing = upright; Walking = mid-step; Running = in motion). If not specified, choose a natural pose.\n" +
        "3) HAND GESTURE: If specified, the character's hands/arms must match (e.g. Pointing up = arm raised; Arms crossed = arms folded; Waving = hand waving). If not specified, choose a natural gesture.\n" +
        "For characters where Expression, Body pose, or Hand gesture is not specified, you may choose a natural option. For any that IS specified, you MUST depict it clearly. Do not ignore or override the user's choices.\n\n";
      if (characterStructuredReferences.length > 0) {
        charRulesText +=
          "CRITICAL — STRUCTURED HEAD, CLOTHING, LOGO, FOOT, ACCESSORIES:\n" +
          "When 'Character N – Head' image is provided, the character's head and hair MUST match that reference exactly: hair TEXTURE (curly must stay curly, wavy stay wavy, straight stay straight—do not change to a different texture), hair style, color, volume, and shape. Do NOT replace or hide it with different hair or headwear from the design description. " +
          "The images labeled 'Character N – Clothes', 'Character N – Logo on chest', 'Character N – Foot', and 'Character N – Accessories' are REFERENCE PHOTOS of the exact garments, logo on chest, shoes, and accessories that character MUST wear or use in the generated image. " +
          "IMPORTANT: 'Character N – Logo on chest' means the logo goes ON THAT CHARACTER'S BAU (shirt/jacket)—on the chest of the garment. Do NOT put the Character N – Logo in the design header, top of image, or anywhere in the layout; it must appear ONLY on that character's clothing. " +
          "You MUST draw each character wearing the EXACT clothing (and if Logo is provided, draw that EXACT logo ON the character's CHEST area of the clothing—left chest or right chest, on the baju only), the EXACT footwear, and EXACT accessories shown in those reference images—same design, color, material, and style (e.g. if the reference shows armor, the character must wear that armor; if a logo is provided, that logo must appear on the chest of the outfit only, not in the design; if boots, those boots; if a hat or jewelry, that exact accessory). " +
          "Do NOT ignore these reference images. Do NOT substitute with generic items or with text descriptions. " +
          "The character's outfit (including logo on chest when provided), shoes, and accessories in the final image MUST match what is in the uploaded Clothes, Logo, Foot, and Accessories reference images. " +
          "HEAD: When Character N – Head image is provided, it is MANDATORY. Copy the hair from that image: same texture (curly/wavy/straight), style, color, volume, shape. If the reference has curly hair, the output MUST have curly hair—do not draw straight or swept-back hair instead. Use face/hair text only for obscured face (mask, helmet) or skin—never to override the reference hair.\n\n";
      }
      parts.push({ text: charRulesText });
    }
    const customSizePrefix =
      aspectRatio === "custom" && customSize
        ? (() => {
            const { width: w, height: h, unit } = customSize;
            const orientation =
              w > h
                ? "OUTPUT ORIENTATION: LANDSCAPE (horizontal). The image MUST be WIDER than it is TALL. Width is the longer side; the canvas is horizontal. Do NOT output a portrait or square image."
                : h > w
                  ? "OUTPUT ORIENTATION: PORTRAIT (vertical). The image MUST be TALLER than it is WIDE. Height is the longer side; the canvas is vertical. Do NOT output a landscape or square image."
                  : "OUTPUT ORIENTATION: SQUARE. Width equals height. The canvas must be square.";
            return `MANDATORY — CUSTOM SIZE: ${orientation}\n\nThe generated image MUST be exactly ${w} × ${h} ${unit} (width × height). Aspect ratio MUST be ${w}:${h}. Do NOT use any other dimensions or aspect ratio. Compose the entire layout to fit this exact size; the output dimensions and orientation are non-negotiable.\n\n`;
          })()
        : "";
    const effectiveAspectRatio = aspectRatio === "custom" && !customSize ? "1:1" : aspectRatio;
    const characterInstruction =
      numCharRefs > 0
        ? referenceImageBase64 !== ""
          ? `Generate the image in aspect ratio ${effectiveAspectRatio}. The first attached image is the design reference. The next ${numCharRefs} image(s) are character references.${characterStructuredReferences.length > 0 ? " REMINDER: Character N – Head, Clothes, Logo on chest, Foot, and Accessories images above are MANDATORY. Character N – Logo must be placed ON THE CHARACTER'S BAU (shirt/jacket chest only)—NOT in the design header or layout. For Head: copy the hair from the reference exactly—same texture (if reference has curly hair, draw curly hair; do not draw straight or swept-back). Draw the exact outfit with logo on the character's clothes, and exact shoes and accessories; do not replace with other items from the design description." : ""}\n\nIMPORTANT: In the design description below, each character has optional fields: Expression, Body pose, Hand gesture. Whatever is specified MUST be drawn exactly—e.g. Expression: Sad means that character must look sad (sorrowful face, no smile); Body pose: Sitting means that character must be seated; Hand gesture: Pointing up means that character's hand/arm must be pointing upward. Do not substitute a generic happy pose when the user chose a different expression or gesture.\n\n${companyLogoBase64 !== "" ? "Use the provided company logo in the design; do not use any logo from the reference image.\n\n" : ""}Design description:\n\n`
          : `Generate the image in aspect ratio ${effectiveAspectRatio}. The attached image(s) are character references in order.${characterStructuredReferences.length > 0 ? " REMINDER: Character N – Head, Clothes, Logo on chest, Foot, and Accessories images above are MANDATORY. Character N – Logo must be placed ON THE CHARACTER'S BAU (shirt/jacket chest only)—NOT in the design header or layout. For Head: copy the hair from the reference exactly—same texture (if reference has curly hair, draw curly hair; do not draw straight or swept-back). Draw the exact outfit with logo on the character's clothes, and exact shoes and accessories; do not replace with other items from the design description." : ""}\n\nIMPORTANT: In the design description below, each character has optional fields: Expression, Body pose, Hand gesture. Whatever is specified MUST be drawn exactly—e.g. Expression: Sad means that character must look sad (sorrowful face, no smile); Body pose: Sitting means that character must be seated; Hand gesture: Pointing up means that character's hand/arm must be pointing upward. Do not substitute a generic happy pose when the user chose a different expression or gesture.\n\n${companyLogoBase64 !== "" ? "Use the provided company logo in the design.\n\n" : ""}Design description:\n\n`
        : `Generate the image in aspect ratio ${effectiveAspectRatio}.${companyLogoBase64 !== "" ? " Use the provided company logo visibly in the design." : ""}\n\n`;

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
    const characterTextBlock =
      characterTextParts.length > 0
        ? characterTextParts
            .map((p, i) => {
              const n = i + 1;
              const lines: string[] = [];
              if (p.faceHair) lines.push(`Character ${n} – Face/hair: ${p.faceHair}`);
              if (p.clothing) lines.push(`Character ${n} – Clothing: ${p.clothing}`);
              if (p.foot) lines.push(`Character ${n} – Foot/shoes: ${p.foot}`);
              if (p.accessories) lines.push(`Character ${n} – Accessories: ${p.accessories}`);
              return lines.join("\n");
            })
            .filter((s) => s.length > 0)
            .join("\n\n")
        : "";
    const promptFinal = characterTextBlock ? characterTextBlock + "\n\n" + prompt : prompt;
    parts.push({ text: customSizePrefix + characterInstruction + promptFinal });

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
