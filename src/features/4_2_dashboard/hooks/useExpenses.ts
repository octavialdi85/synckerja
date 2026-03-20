import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { toast } from 'sonner';
import { useBankAccountBalances } from '@/hooks/organized/useBankAccountBalances';

export const EXPENSES_QUERY_KEY = ['expenses'] as const;

export interface Expense {
  id: string;
  organization_id: string;
  expense_name: string;
  amount: number;
  expense_type: string;
  expense_type_id?: string;
  category: string;
  expense_category_id?: string;
  department?: string;
  withdrawal_from_balance?: string; // Debt ID
  bank_account_id?: string; // Bank account ID
  withdrawal_from_balance_debt?: { id: string; debt_name: string }; // Joined debt data
  withdrawal_from_balance_bank_account?: { id: string; name: string }; // Joined bank account data
  create_date: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  first_payment_date?: string;
  next_payment_date?: string;
  description?: string;
  receipt_url?: string;
  /** Additional receipt URLs when more than one attachment exists (jsonb array in DB). */
  receipt_urls?: string[] | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  purchase_request_id?: string; // When expense was created from payment-process
  bill_source?: 'expense' | 'purchase_request';
  /** Payment row linked to master recurring expense; excluded from reminder bills list. */
  recurring_settlement_for_expense_id?: string | null;
}

export interface CreateExpenseData {
  expense_name: string;
  amount: number;
  expense_type: string;
  category: string;
  department?: string;
  withdrawal_from_balance?: string; // Debt ID for withdrawal from balance
  bank_account_id?: string; // Bank account ID for withdrawal from balance
  create_date: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  first_payment_date?: string;
  description?: string;
  receipt_file?: File;
  /** Multiple receipts (share flow, gallery). Takes precedence over receipt_file when set. */
  receipt_files?: File[];
  purchase_request_id?: string; // Link to purchase request when created from payment-process
  /** When set, inserts a recurring settlement payment (no own next_payment_date schedule). */
  recurring_settlement_for_expense_id?: string | null;
}

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
  const byName = name.endsWith('.jpeg') || name.endsWith('.jpg')
    ? 'jpg'
    : name.endsWith('.png')
      ? 'png'
      : name.endsWith('.webp')
        ? 'webp'
        : name.endsWith('.pdf')
          ? 'pdf'
          : 'bin';

  const mimeByExt = byName === 'jpg'
    ? 'image/jpeg'
    : byName === 'png'
      ? 'image/png'
      : byName === 'webp'
        ? 'image/webp'
        : byName === 'pdf'
          ? 'application/pdf'
          : (rawType || 'application/octet-stream');

  return { extension: byName, mimeType: mimeByExt };
}

function addRecurringInterval(baseDate: Date, recurringFrequency?: string): Date {
  const nextDate = new Date(baseDate);
  switch ((recurringFrequency || '').toLowerCase()) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semiannually':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'annually':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  return nextDate;
}

async function fetchExpensesForOrg(organizationId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_types (
        id,
        name
      )
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const debtIds = data?.filter((exp: any) => exp.withdrawal_from_balance).map((exp: any) => exp.withdrawal_from_balance) || [];
  let debtsMap: Record<string, { id: string; debt_name: string }> = {};

  if (debtIds.length > 0) {
    const { data: debtsData, error: debtsError } = await supabase
      .from('debts')
      .select('id, debt_name')
      .in('id', debtIds);

    if (!debtsError && debtsData) {
      debtsMap = debtsData.reduce(
        (acc, debt) => {
          acc[debt.id] = debt;
          return acc;
        },
        {} as Record<string, { id: string; debt_name: string }>
      );
    }
  }

  const bankAccountIds = data?.filter((exp: any) => exp.bank_account_id).map((exp: any) => exp.bank_account_id) || [];
  let bankAccountsMap: Record<string, { id: string; name: string }> = {};

  if (bankAccountIds.length > 0) {
    const { data: bankAccountsData, error: bankAccountsError } = await supabase
      .from('bank_accounts')
      .select('id, name')
      .in('id', bankAccountIds);

    if (!bankAccountsError && bankAccountsData) {
      bankAccountsMap = bankAccountsData.reduce(
        (acc, bankAccount) => {
          acc[bankAccount.id] = bankAccount;
          return acc;
        },
        {} as Record<string, { id: string; name: string }>
      );
    }
  }

  const transformedData = data?.map((expense: any) => ({
    ...expense,
    receipt_urls: Array.isArray(expense.receipt_urls)
      ? (expense.receipt_urls as string[])
      : null,
    expense_type: expense.expense_types?.name || expense.expense_type || 'Unknown',
    withdrawal_from_balance_debt:
      expense.withdrawal_from_balance && debtsMap[expense.withdrawal_from_balance]
        ? debtsMap[expense.withdrawal_from_balance]
        : null,
    withdrawal_from_balance_bank_account:
      expense.bank_account_id && bankAccountsMap[expense.bank_account_id]
        ? bankAccountsMap[expense.bank_account_id]
        : null,
  }));

  return transformedData || [];
}

export const useExpenses = () => {
  const { updateBalance } = useBankAccountBalances();
  const [isCreating, setIsCreating] = useState(false);
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const queryKey = [...EXPENSES_QUERY_KEY, organizationId] as const;

  const {
    data: expenses = [],
    isLoading,
    isPending,
    refetch,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchExpensesForOrg(organizationId!),
    enabled: !!organizationId,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 min — avoid refetch on mount when revisiting; invalidateQueries after create/delete still refetches
  });

  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load expenses');
    }
  }, [isError, error]);

  const uploadReceiptFile = async (file: File): Promise<string | null> => {
    try {
      const { extension, mimeType } = normalizeReceiptMetadata(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
      const filePath = `${organizationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      const rawMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';
      const detailedMessage = rawMessage.trim() || 'Failed to upload receipt file';
      toast.error(detailedMessage);
      return null;
    }
  };

  const createExpense = async (expenseData: CreateExpenseData) => {
    if (!organizationId) {
      toast.error('Organization not found');
      return false;
    }

    try {
      setIsCreating(true);

      const receiptUrls: string[] = [];
      if (expenseData.receipt_files?.length) {
        for (const f of expenseData.receipt_files) {
          const u = await uploadReceiptFile(f);
          if (!u) return false;
          receiptUrls.push(u);
        }
      } else if (expenseData.receipt_file) {
        const u = await uploadReceiptFile(expenseData.receipt_file);
        if (!u) return false;
        receiptUrls.push(u);
      }
      const receiptUrl = receiptUrls[0] ?? null;
      const receiptUrlsJson =
        receiptUrls.length > 1 ? receiptUrls : null;

      const { data: expenseTypes, error: typeError } = await supabase
        .from('expense_types')
        .select('id')
        .eq('name', expenseData.expense_type)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .maybeSingle();

      if (typeError) {
        console.error('Error finding expense type:', typeError);
      }

      const { data: expenseCategories, error: categoryError } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('name', expenseData.category)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .maybeSingle();

      if (categoryError) {
        console.error('Error finding expense category:', categoryError);
      }

      let nextPaymentDate: string | null = null;
      const isSettlementRow = !!expenseData.recurring_settlement_for_expense_id;
      if (
        !isSettlementRow &&
        expenseData.is_recurring &&
        expenseData.first_payment_date &&
        expenseData.recurring_frequency
      ) {
        const firstPayment = new Date(expenseData.first_payment_date);
        const nextPayment = new Date(firstPayment);

        switch (expenseData.recurring_frequency) {
          case 'daily':
            nextPayment.setDate(nextPayment.getDate() + 1);
            break;
          case 'weekly':
            nextPayment.setDate(nextPayment.getDate() + 7);
            break;
          case 'biweekly':
            nextPayment.setDate(nextPayment.getDate() + 14);
            break;
          case 'monthly':
            nextPayment.setMonth(nextPayment.getMonth() + 1);
            break;
          case 'quarterly':
            nextPayment.setMonth(nextPayment.getMonth() + 3);
            break;
          case 'semiannually':
            nextPayment.setMonth(nextPayment.getMonth() + 6);
            break;
          case 'annually':
            nextPayment.setFullYear(nextPayment.getFullYear() + 1);
            break;
        }
        nextPaymentDate = nextPayment.toISOString().split('T')[0];
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('User not authenticated');
        return false;
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          organization_id: organizationId,
          expense_name: expenseData.expense_name,
          amount: expenseData.amount,
          expense_type: expenseData.expense_type,
          expense_type_id: expenseTypes?.id || null,
          category: expenseData.category,
          expense_category_id: expenseCategories?.id || null,
          department: expenseData.department || null,
          withdrawal_from_balance: expenseData.withdrawal_from_balance || null,
          bank_account_id: expenseData.bank_account_id || null,
          create_date: expenseData.create_date,
          is_recurring: expenseData.is_recurring,
          recurring_frequency: expenseData.recurring_frequency || null,
          first_payment_date: expenseData.first_payment_date || null,
          next_payment_date: isSettlementRow ? null : nextPaymentDate,
          description: expenseData.description || null,
          receipt_url: receiptUrl,
          receipt_urls: receiptUrlsJson,
          created_by: userData.user.id,
          purchase_request_id: expenseData.purchase_request_id || null,
          recurring_settlement_for_expense_id:
            expenseData.recurring_settlement_for_expense_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (expenseData.bank_account_id && data?.id) {
        try {
          await updateBalance(
            expenseData.bank_account_id,
            -expenseData.amount,
            'expense',
            data.id,
            `Expense: ${expenseData.expense_name}`
          );
        } catch (balanceError) {
          console.error('Error updating bank account balance:', balanceError);
        }
      }

      toast.success('Expense created successfully!');

      queryClient.invalidateQueries({ queryKey: ['bank-account-balances', organizationId] });
      queryClient.invalidateQueries({ queryKey });
      return data;
    } catch (error: any) {
      console.error('Error creating expense:', error);

      if (error?.message) {
        if (error.message.includes('Insufficient available limit')) {
          toast.error(error.message);
        } else if (error.message.includes('Cannot use debt with status')) {
          toast.error(error.message);
        } else if (error.message.includes('not found')) {
          toast.error('Selected debt not found. Please refresh and try again.');
        } else {
          toast.error(error.message || 'Failed to create expense');
        }
      } else {
        toast.error('Failed to create expense');
      }

      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!organizationId) {
      toast.error('Organization not found');
      return false;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'deleted' })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast.success('Expense deleted successfully!');
      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast.error(error?.message || 'Failed to delete expense');
      return false;
    }
  };

  const updateRecurringBillAfterPayNow = async (billId: string, paymentDate: string) => {
    if (!organizationId) {
      toast.error('Organization not found');
      return false;
    }

    try {
      const { data: sourceBill, error: sourceError } = await supabase
        .from('expenses')
        .select('id, organization_id, recurring_frequency, next_payment_date')
        .eq('id', billId)
        .eq('organization_id', organizationId)
        .single();

      if (sourceError || !sourceBill) {
        throw sourceError || new Error('Source recurring bill not found');
      }

      const oldDueDate = sourceBill.next_payment_date ? new Date(sourceBill.next_payment_date) : null;
      const currentPaymentDate = new Date(paymentDate);
      const useOldDueDateAsBase = !!oldDueDate && currentPaymentDate.getTime() <= oldDueDate.getTime();
      const baseDate = useOldDueDateAsBase && oldDueDate ? oldDueDate : currentPaymentDate;
      const nextDate = addRecurringInterval(baseDate, sourceBill.recurring_frequency || undefined);
      const nextPaymentDate = nextDate.toISOString().split('T')[0];

      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          status: 'active',
          next_payment_date: nextPaymentDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId)
        .eq('organization_id', organizationId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (error: any) {
      console.error('Error updating recurring bill after paynow:', error);
      toast.error(error?.message || 'Failed to update recurring bill');
      return false;
    }
  };

  return {
    expenses,
    isLoading,
    isCreating,
    createExpense,
    deleteExpense,
    updateRecurringBillAfterPayNow,
    refetch,
  };
};
