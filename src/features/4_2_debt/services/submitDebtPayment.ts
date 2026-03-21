import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Payload from DebtPaymentModal → submitDebtPayment / parent handlers. */
export type DebtPaymentModalSubmitPayload = {
  debtId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
  transactionReference?: string;
  receiptFile?: File;
};

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function normalizeReceiptMetadata(file: File): { extension: string; mimeType: string } {
  const rawType = (file.type || '').toLowerCase().trim();
  const byType = MIME_TO_EXT[rawType];
  if (byType) {
    return {
      extension: byType,
      mimeType: rawType === 'image/jpg' ? 'image/jpeg' : rawType,
    };
  }

  const name = (file.name || '').toLowerCase();
  const byName =
    name.endsWith('.jpeg') || name.endsWith('.jpg')
      ? 'jpg'
      : name.endsWith('.png')
        ? 'png'
        : name.endsWith('.webp')
          ? 'webp'
          : name.endsWith('.pdf')
            ? 'pdf'
            : 'bin';

  const mimeByExt =
    byName === 'jpg'
      ? 'image/jpeg'
      : byName === 'png'
        ? 'image/png'
        : byName === 'webp'
          ? 'image/webp'
          : byName === 'pdf'
            ? 'application/pdf'
            : rawType || 'application/octet-stream';

  return { extension: byName, mimeType: mimeByExt };
}

async function uploadDebtPaymentReceipt(
  organizationId: string,
  file: File
): Promise<{ path: string; fileName: string; size: number; mimeType: string } | null> {
  const { extension, mimeType } = normalizeReceiptMetadata(file);
  const storageName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${extension}`;
  const filePath = `${organizationId}/${storageName}`;
  const { error } = await supabase.storage.from('debt-payment-receipts').upload(filePath, file, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) {
    console.error('debt payment receipt upload:', error);
    return null;
  }
  return { path: filePath, fileName: file.name, size: file.size, mimeType };
}

export interface SubmitDebtPaymentParams {
  organizationId: string;
  userId: string;
  debtId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string | null;
  transactionReference?: string | null;
  receiptFile?: File | null;
  debtDisplayName: string;
  updateBalance: (
    bankAccountId: string,
    amount: number,
    transactionType: 'expense',
    transactionId: string | undefined,
    description: string | undefined
  ) => Promise<void>;
  /** e.g. refetchDebts */
  onAfterSuccess?: () => Promise<void>;
  messages: {
    duplicateTransactionRef: string;
    receiptUploadFailed: string;
    paymentInsertFailed: string;
  };
}

/**
 * Insert debt_payments row, optional receipt upload, optional bank balance update.
 */
export async function submitDebtPayment(params: SubmitDebtPaymentParams): Promise<boolean> {
  const {
    organizationId,
    userId,
    debtId,
    paymentAmount,
    paymentDate,
    paymentMethod,
    notes,
    transactionReference,
    receiptFile,
    debtDisplayName,
    updateBalance,
    onAfterSuccess,
    messages,
  } = params;

  let receipt_file_path: string | null = null;
  let receipt_file_name: string | null = null;
  let receipt_file_size: number | null = null;
  let receipt_mime_type: string | null = null;

  if (receiptFile) {
    const uploaded = await uploadDebtPaymentReceipt(organizationId, receiptFile);
    if (!uploaded) {
      toast.error(messages.receiptUploadFailed);
      return false;
    }
    receipt_file_path = uploaded.path;
    receipt_file_name = uploaded.fileName;
    receipt_file_size = uploaded.size;
    receipt_mime_type = uploaded.mimeType;
  }

  const refTrimmed = transactionReference?.trim() ?? null;
  const refForDb = refTrimmed && refTrimmed.length > 0 ? refTrimmed : null;

  const { error: paymentError } = await supabase.from('debt_payments').insert({
    organization_id: organizationId,
    debt_id: debtId,
    created_by: userId,
    payment_amount: paymentAmount,
    payment_date: paymentDate,
    payment_method: paymentMethod || null,
    notes: notes?.trim() ? notes.trim() : null,
    transaction_reference: refForDb,
    receipt_file_path,
    receipt_file_name,
    receipt_file_size,
    receipt_mime_type,
  });

  if (paymentError) {
    const code = (paymentError as { code?: string }).code;
    const msg = String((paymentError as { message?: string }).message ?? '');
    if (
      code === '23505' ||
      /duplicate key/i.test(msg) ||
      /unique constraint/i.test(msg) ||
      /idx_debt_payments_org_transaction_ref/i.test(msg)
    ) {
      toast.error(messages.duplicateTransactionRef);
      return false;
    }
    console.error('debt_payments insert:', paymentError);
    toast.error(messages.paymentInsertFailed);
    return false;
  }

  if (paymentMethod) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(paymentMethod)) {
      try {
        await updateBalance(
          paymentMethod,
          -paymentAmount,
          'expense',
          debtId,
          `Debt Payment: ${debtDisplayName}`
        );
      } catch (e) {
        console.error('updateBalance after debt payment:', e);
        toast.error(
          typeof e === 'object' && e !== null && 'message' in e
            ? String((e as Error).message)
            : messages.paymentInsertFailed
        );
        return false;
      }
    }
  }

  if (onAfterSuccess) {
    await onAfterSuccess();
  }

  return true;
}
