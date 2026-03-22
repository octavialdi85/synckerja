import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useToast } from '@/features/1-login/hooks/use-toast';

/** PostgREST default max rows per request; must page or ledger sums are wrong for large orgs. */
const LEDGER_PAGE_SIZE = 1000;

// Types
export interface BankAccountBalance {
  id: string;
  bank_account_id: string;
  organization_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  bank_account?: {
    id: string;
    name: string;
    account_number: string | null;
    bank_name: string | null;
  };
}

export interface BankAccountBalanceHistory {
  id: string;
  bank_account_id: string;
  organization_id: string;
  transaction_type: 'income' | 'expense' | 'manual_adjustment' | 'initial';
  transaction_id: string | null;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

// Hook: useBankAccountBalances
export const useBankAccountBalances = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch bank account balances with bank account info.
  // `balance` shown in UI = ledger: income − expenses − debt_payments (from bank) + internal transfers,
  // aligned with `bank_account_balances` updates from expense/debt flows.
  // Row metadata (id, timestamps) still comes from `bank_account_balances` when present.
  const { data: balances = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['bank-account-balances', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: bankAccounts, error: bankAccountsError } = await supabase
        .from('bank_accounts')
        .select('id, name, account_number, bank_name')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (bankAccountsError) {
        console.error('Error fetching bank accounts:', bankAccountsError);
        throw bankAccountsError;
      }

      const { data: storedBalances, error: balancesError } = await supabase
        .from('bank_account_balances')
        .select('*')
        .eq('organization_id', organizationId);

      if (balancesError) {
        console.error('Error fetching bank account balances:', balancesError);
        throw balancesError;
      }

      const ids = (bankAccounts || []).map((a: { id: string }) => a.id);
      if (ids.length === 0) return [];

      const ledgerByAccount: Record<string, number> = {};
      for (const id of ids) ledgerByAccount[id] = 0;

      const incomeRows: { bank_account_id: string | null; amount: unknown }[] = [];
      let incomeFrom = 0;
      for (;;) {
        const { data: chunk, error: incomeErr } = await supabase
          .from('income_transactions')
          .select('bank_account_id, amount')
          .eq('organization_id', organizationId)
          .in('bank_account_id', ids)
          .in('status', ['completed', 'pending'])
          .range(incomeFrom, incomeFrom + LEDGER_PAGE_SIZE - 1);

        if (incomeErr) {
          console.error('Error fetching income for ledger balance:', incomeErr);
          throw incomeErr;
        }
        const rows = chunk ?? [];
        incomeRows.push(...rows);
        if (rows.length < LEDGER_PAGE_SIZE) break;
        incomeFrom += LEDGER_PAGE_SIZE;
      }

      const expenseRows: { bank_account_id: string | null; amount: unknown }[] = [];
      let expenseFrom = 0;
      for (;;) {
        const { data: chunk, error: expenseErr } = await supabase
          .from('expenses')
          .select('bank_account_id, amount')
          .eq('organization_id', organizationId)
          .in('bank_account_id', ids)
          .eq('status', 'active')
          .range(expenseFrom, expenseFrom + LEDGER_PAGE_SIZE - 1);

        if (expenseErr) {
          console.error('Error fetching expenses for ledger balance:', expenseErr);
          throw expenseErr;
        }
        const rows = chunk ?? [];
        expenseRows.push(...rows);
        if (rows.length < LEDGER_PAGE_SIZE) break;
        expenseFrom += LEDGER_PAGE_SIZE;
      }

      for (const row of incomeRows) {
        const bid = row.bank_account_id as string | null;
        if (bid && bid in ledgerByAccount) {
          ledgerByAccount[bid] += parseFloat(String(row.amount));
        }
      }
      for (const row of expenseRows) {
        const bid = row.bank_account_id as string | null;
        if (bid && bid in ledgerByAccount) {
          ledgerByAccount[bid] -= parseFloat(String(row.amount));
        }
      }

      // New-style internal transfers: principal via bank_transfer_journals (no income row).
      const transferRows: {
        from_bank_account_id: string;
        to_bank_account_id: string;
        amount: unknown;
      }[] = [];
      let transferFrom = 0;
      const idList = ids.join(',');
      const transferFilter = `from_bank_account_id.in.(${idList}),to_bank_account_id.in.(${idList})`;
      for (;;) {
        const { data: chunk, error: transferErr } = await supabase
          .from('bank_transfer_journals')
          .select('from_bank_account_id, to_bank_account_id, amount')
          .eq('organization_id', organizationId)
          .is('income_transaction_id', null)
          .or(transferFilter)
          .range(transferFrom, transferFrom + LEDGER_PAGE_SIZE - 1);

        if (transferErr) {
          console.error('Error fetching bank transfer journals for ledger balance:', transferErr);
          throw transferErr;
        }
        const rows = chunk ?? [];
        transferRows.push(...rows);
        if (rows.length < LEDGER_PAGE_SIZE) break;
        transferFrom += LEDGER_PAGE_SIZE;
      }

      for (const row of transferRows) {
        const fromId = row.from_bank_account_id;
        const toId = row.to_bank_account_id;
        const amt = parseFloat(String(row.amount ?? 0));
        if (!Number.isFinite(amt)) continue;
        if (fromId && fromId in ledgerByAccount) {
          ledgerByAccount[fromId] -= amt;
        }
        if (toId && toId in ledgerByAccount) {
          ledgerByAccount[toId] += amt;
        }
      }

      const debtPaymentRows: { payment_method: string | null; payment_amount: unknown }[] = [];
      let debtFrom = 0;
      for (;;) {
        const { data: chunk, error: debtErr } = await supabase
          .from('debt_payments')
          .select('payment_method, payment_amount')
          .eq('organization_id', organizationId)
          .in('payment_method', ids)
          .range(debtFrom, debtFrom + LEDGER_PAGE_SIZE - 1);

        if (debtErr) {
          console.error('Error fetching debt_payments for ledger balance:', debtErr);
          throw debtErr;
        }
        const rows = chunk ?? [];
        debtPaymentRows.push(...rows);
        if (rows.length < LEDGER_PAGE_SIZE) break;
        debtFrom += LEDGER_PAGE_SIZE;
      }

      for (const row of debtPaymentRows) {
        const bid = row.payment_method as string | null;
        if (bid && bid in ledgerByAccount) {
          ledgerByAccount[bid] -= parseFloat(String(row.payment_amount ?? 0));
        }
      }

      return (bankAccounts || []).map((bankAccount: any) => {
        const storedBalance = storedBalances?.find((b) => b.bank_account_id === bankAccount.id);
        const ledger = ledgerByAccount[bankAccount.id] ?? 0;

        if (storedBalance) {
          return {
            id: storedBalance.id,
            bank_account_id: bankAccount.id,
            organization_id: organizationId,
            balance: ledger,
            created_at: storedBalance.created_at,
            updated_at: storedBalance.updated_at,
            bank_account: bankAccount,
          } as BankAccountBalance;
        }

        return {
          id: `temp-${bankAccount.id}`,
          bank_account_id: bankAccount.id,
          organization_id: organizationId,
          balance: ledger,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          bank_account: bankAccount,
        } as BankAccountBalance;
      });
    },
    enabled: !!organizationId,
  });

  // Get or create balance for a bank account
  const getOrCreateBalance = async (bankAccountId: string): Promise<BankAccountBalance> => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Check if balance exists
    const { data: existingBalance, error: fetchError } = await supabase
      .from('bank_account_balances')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      throw fetchError;
    }

    if (existingBalance) {
      return {
        ...existingBalance,
        balance: parseFloat(existingBalance.balance.toString()),
      } as BankAccountBalance;
    }

    // Create new balance starting from 0
    const { data: newBalance, error: createError } = await supabase
      .from('bank_account_balances')
      .insert({
        bank_account_id: bankAccountId,
        organization_id: organizationId,
        balance: 0,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Create initial history entry
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from('bank_account_balance_history')
      .insert({
        bank_account_id: bankAccountId,
        organization_id: organizationId,
        transaction_type: 'initial',
        amount: 0,
        balance_before: 0,
        balance_after: 0,
        description: 'Initial balance',
        created_by: userData?.user?.id || null,
      });

    return {
      ...newBalance,
      balance: parseFloat(newBalance.balance.toString()),
    } as BankAccountBalance;
  };

  // Update balance (add or subtract)
  const updateBalance = async (
    bankAccountId: string,
    amount: number,
    transactionType: 'income' | 'expense' | 'manual_adjustment',
    transactionId?: string,
    description?: string
  ): Promise<void> => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Get or create balance first (this ensures balance record exists)
    const currentBalance = await getOrCreateBalance(bankAccountId);
    const balanceBefore = currentBalance.balance;
    const balanceAfter = balanceBefore + amount;

    // Prevent negative balance for expenses (optional - you can remove this if you want to allow overdraft)
    if (transactionType === 'expense' && balanceAfter < 0) {
      throw new Error(`Insufficient balance. Available: ${balanceBefore}, Required: ${Math.abs(amount)}`);
    }

    // Update balance
    const { error: updateError } = await supabase
      .from('bank_account_balances')
      .update({
        balance: balanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('bank_account_id', bankAccountId)
      .eq('organization_id', organizationId);

    if (updateError) {
      throw updateError;
    }

    // Create history entry
    const { error: historyError } = await supabase
      .from('bank_account_balance_history')
      .insert({
        bank_account_id: bankAccountId,
        organization_id: organizationId,
        transaction_type: transactionType,
        transaction_id: transactionId || null,
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: description || null,
        created_by: userId || null,
      });

    if (historyError) {
      console.error('Error creating balance history:', historyError);
      // Don't throw - balance update succeeded
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['bank-account-balances', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['bank-account-balance-history', bankAccountId] });
  };

  // Get balance history for a bank account
  const getBalanceHistory = async (bankAccountId: string): Promise<BankAccountBalanceHistory[]> => {
    if (!organizationId) return [];

    const { data, error } = await supabase
      .from('bank_account_balance_history')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching balance history:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      ...item,
      amount: parseFloat(item.amount.toString()),
      balance_before: parseFloat(item.balance_before.toString()),
      balance_after: parseFloat(item.balance_after.toString()),
    })) as BankAccountBalanceHistory[];
  };

  return {
    balances,
    loading,
    refetch,
    getOrCreateBalance,
    updateBalance,
    getBalanceHistory,
  };
};
