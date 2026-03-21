/// <reference path="../edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const deprecatedModels: Record<string, string> = {
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-flash-latest": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-2.5-flash",
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.0-flash-exp": "gemini-2.5-flash",
};

type IncomingReceiptFile = {
  name?: string;
  mimeType?: string;
  base64?: string;
};

type ParsedResult = {
  expenseName?: string;
  amount?: number;
  createDate?: string;
  description?: string;
  /** Bank transfer ref, invoice no., BI-FAST ref, etc. */
  transactionId?: string;
};

async function callGeminiText(params: {
  apiKey: string;
  model: string;
  prompt: string;
  inlineParts: Array<{ inline_data: { mime_type: string; data: string } }>;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`;
  const geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: params.prompt }, ...params.inlineParts],
        },
      ],
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    let errMsg = "Failed to analyze receipt";
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson?.error?.message ?? errMsg;
    } catch {
      // ignore parse failure
    }
    return { ok: false, error: errMsg };
  }

  const geminiData = await geminiRes.json();
  const textPart = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  const text = typeof textPart === "string" ? textPart.trim() : "";
  if (!text) return { ok: false, error: "No content generated from AI" };
  return { ok: true, text };
}

const jsonResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractJsonObject(text: string): ParsedResult | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as ParsedResult;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as ParsedResult;
    } catch {
      return null;
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseWithUser = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await supabaseWithUser.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .single();
    const organizationId = profile?.active_organization_id ?? null;
    if (!organizationId) return jsonResponse({ error: "No active organization" }, 400);

    const body = await req.json().catch(() => ({}));
    const incomingFiles = Array.isArray(body?.receiptFiles) ? (body.receiptFiles as IncomingReceiptFile[]) : [];
    const receiptFiles = incomingFiles
      .map((f) => ({
        name: safeTrim(f.name),
        mimeType: safeTrim(f.mimeType) || "application/octet-stream",
        base64: safeTrim(f.base64),
      }))
      .filter((f) => f.base64.length > 0)
      .slice(0, 3);

    if (receiptFiles.length === 0) {
      return jsonResponse({ error: "Missing receiptFiles payload" }, 400);
    }

    const ocrText = safeTrim(body?.ocrText);

    const { data: config, error: configError } = await supabaseAdmin
      .from("organization_script_ai_config")
      .select("google_ai_api_key, daily_limit, model, is_active")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (configError || !config) {
      return jsonResponse(
        { error: "Script AI config not found. Configure at Settings > Script AI Generator." },
        400,
      );
    }
    if (!config.is_active) {
      return jsonResponse(
        { error: "Script AI is disabled. Enable it in Settings > Script AI Generator." },
        400,
      );
    }

    const apiKey = safeTrim(config.google_ai_api_key);
    if (!apiKey) {
      return jsonResponse(
        { error: "Google AI API key not configured. Add it in Settings > Script AI Generator." },
        400,
      );
    }

    const dailyLimit = Math.max(1, config.daily_limit ?? 50);
    const rawModel = safeTrim(config.model) || "gemini-2.5-flash";
    const model = deprecatedModels[rawModel] ?? rawModel;
    const today = new Date().toISOString().slice(0, 10);

    const { data: usageRow, error: usageError } = await supabaseAdmin
      .from("script_ai_daily_usage")
      .select("id, count")
      .eq("organization_id", organizationId)
      .eq("usage_date", today)
      .maybeSingle();
    if (usageError) return jsonResponse({ error: "Failed to check usage limit" }, 500);
    const currentCount = usageRow?.count ?? 0;
    if (currentCount >= dailyLimit) {
      return jsonResponse({ error: `Daily limit reached (${dailyLimit} per day). Try again tomorrow.` }, 429);
    }

    const inlineParts = receiptFiles.map((file) => ({
      inline_data: {
        mime_type: file.mimeType,
        data: file.base64,
      },
    }));

    const ocrPrompt = [
      "Extract all readable text from this receipt image/PDF.",
      "Return plain text only.",
      "Keep line breaks for readability.",
      "Do not add extra explanation.",
    ].join("\n");
    const ocrResult = await callGeminiText({ apiKey, model, prompt: ocrPrompt, inlineParts });
    if (!ocrResult.ok) return jsonResponse({ error: ocrResult.error }, 500);
    const combinedOcrText = [ocrResult.text, ocrText].filter((v) => v.length > 0).join("\n\n");

    const extractionPrompt = [
      "You are extracting expense data from receipts.",
      "Use both receipt images/PDF and OCR text context when available.",
      "Return ONLY valid JSON with shape:",
      '{"expenseName":"string","amount":12345,"createDate":"YYYY-MM-DD","description":"string","transactionId":"string"}',
      "Rules:",
      "- amount must be final transaction total amount (not subtotal/fee).",
      "- createDate must be transaction date. If unknown, return empty string.",
      "- expenseName should be merchant or best transaction title.",
      "- description should summarize transaction details briefly.",
      "- transactionId: unique reference visible on the receipt (e.g. BI-FAST ref, transfer reference, invoice number, trace no.). If none, empty string.",
      "- If field not found, return empty string for text/date and 0 for amount.",
      combinedOcrText ? `OCR text:\n${combinedOcrText}` : "OCR text: (empty)",
    ].join("\n");
    const extractionResult = await callGeminiText({ apiKey, model, prompt: extractionPrompt, inlineParts });
    if (!extractionResult.ok) return jsonResponse({ error: extractionResult.error }, 500);
    const parsed = extractJsonObject(extractionResult.text);
    if (!parsed) {
      return jsonResponse({ error: "AI output is not valid JSON" }, 500);
    }

    const amount = typeof parsed.amount === "number"
      ? parsed.amount
      : Number(safeTrim(parsed.amount));
    const normalized: ParsedResult = {
      expenseName: safeTrim(parsed.expenseName),
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : undefined,
      createDate: safeTrim(parsed.createDate),
      description: safeTrim(parsed.description),
      transactionId: safeTrim((parsed as ParsedResult).transactionId),
    };

    if (usageRow?.id) {
      await supabaseAdmin
        .from("script_ai_daily_usage")
        .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq("id", usageRow.id);
    } else {
      await supabaseAdmin.from("script_ai_daily_usage").insert({
        organization_id: organizationId,
        usage_date: today,
        count: 1,
      });
    }

    return jsonResponse({ success: true, data: normalized }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
