import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";

export interface ExpenseReceiptAutofillData {
  expenseName?: string;
  amount?: number;
  createDate?: string;
  description?: string;
  /** Bank / invoice reference from receipt (debt payment dedupe). */
  transactionId?: string;
}

export interface AnalyzeExpenseReceiptWithAIResult {
  success: boolean;
  data?: ExpenseReceiptAutofillData;
  error?: string;
}

interface ReceiptFilePayload {
  name: string;
  mimeType: string;
  base64: string;
}

const MAX_FILES = 3;

function normalizeAutofillData(input: unknown): ExpenseReceiptAutofillData | undefined {
  if (!input || typeof input !== "object") return undefined;
  const source = input as Record<string, unknown>;
  const expenseName = typeof source.expenseName === "string" ? source.expenseName.trim() : "";
  const description = typeof source.description === "string" ? source.description.trim() : "";
  const createDate = typeof source.createDate === "string" ? source.createDate.trim() : "";
  const transactionId =
    typeof source.transactionId === "string" ? source.transactionId.trim() : "";
  const amount =
    typeof source.amount === "number"
      ? source.amount
      : typeof source.amount === "string"
        ? Number(source.amount)
        : undefined;

  const normalized: ExpenseReceiptAutofillData = {};
  if (expenseName) normalized.expenseName = expenseName;
  if (description) normalized.description = description;
  if (createDate) normalized.createDate = createDate;
  if (transactionId) normalized.transactionId = transactionId;
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    normalized.amount = amount;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file"));
        return;
      }
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function buildReceiptPayload(files: File[]): Promise<ReceiptFilePayload[]> {
  const limited = files.slice(0, MAX_FILES);
  const payload: ReceiptFilePayload[] = [];
  for (const file of limited) {
    const base64 = await fileToBase64(file);
    payload.push({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      base64,
    });
  }
  return payload;
}

export async function analyzeExpenseReceiptWithAI(params: {
  receiptFiles: File[];
  ocrText?: string;
}): Promise<AnalyzeExpenseReceiptWithAIResult> {
  try {
    const files = params.receiptFiles.filter(Boolean);
    if (files.length === 0) {
      return {
        success: false,
        error: "Tidak ada receipt untuk dianalisis.",
      };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      return {
        success: false,
        error: "Sesi login tidak valid. Silakan login ulang.",
      };
    }

    const receiptFiles = await buildReceiptPayload(files);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-expense-receipt-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiptFiles,
        ocrText: params.ocrText?.trim() || undefined,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return {
        success: false,
        error: "Response server tidak valid. Coba lagi.",
      };
    }

    if (!response.ok) {
      const serverError = typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "";
      return {
        success: false,
        error: serverError || `Analisis receipt gagal (${response.status}).`,
      };
    }

    const data = normalizeAutofillData((payload as { data?: unknown }).data);
    if (!data) {
      return {
        success: false,
        error: "AI belum menemukan data yang bisa diisi otomatis.",
      };
    }

    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return {
        success: false,
        error: "Koneksi gagal. Periksa internet lalu coba lagi.",
      };
    }
    return {
      success: false,
      error: msg || "Analisis receipt gagal.",
    };
  }
}
