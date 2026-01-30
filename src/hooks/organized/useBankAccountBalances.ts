import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useToast } from '@/features/1-login/hooks/use-toast';

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

  // Fetch bank account balances with bank account info
  // Also calculate real-time balance from transactions to ensure accuracy
  const { data: balances = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['bank-account-balances', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // First, get all bank accounts
      const { data: bankAccounts, error: bankAccountsError } = await supabase
        .from('bank_accounts')
        .select('id, name, account_number, bank_name')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (bankAccountsError) {
        console.error('Error fetching bank accounts:', bankAccountsError);
        throw bankAccountsError;
      }

      // Get stored balances
      const { data: storedBalances, error: balancesError } = await supabase
        .from('bank_account_balances')
        .select('*')
        .eq('organization_id', organizationId);

      if (balancesError) {
        console.error('Error fetching bank account balances:', balancesError);
        throw balancesError;
      }

      // Calculate real-time balance from transactions for each bank account
      const balancesWithRealTime = await Promise.all(
        (bankAccounts || []).map(async (bankAccount: any) => {
          // Get stored balance
          const storedBalance = storedBalances?.find(b => b.bank_account_id === bankAccount.id);
          
          // Calculate income total
          const { data: incomeData } = await supabase
            .from('income_transactions')
            .select('amount')
            .eq('bank_account_id', bankAccount.id)
            .eq('organization_id', organizationId)
            .in('status', ['completed', 'pending']);

          // Calculate expense total
          const { data: expenseData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('bank_account_id', bankAccount.id)
            .eq('organization_id', organizationId)
            .eq('status', 'active');

          const totalIncome = incomeData?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
          const totalExpense = expenseData?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;
          const realTimeBalance = totalIncome - totalExpense;

          // Use real-time balance if stored balance exists, otherwise use calculated balance
          const balance = storedBalance ? parseFloat(storedBalance.balance.toString()) : realTimeBalance;

          return {
            id: storedBalance?.id || `temp-${bankAccount.id}`,
            bank_account_id: bankAccount.id,
            organization_id: organizationId,
            balance: balance,
            created_at: storedBalance?.created_at || new Date().toISOString(),
            updated_at: storedBalance?.updated_at || new Date().toISOString(),
            bank_account: bankAccount,
          } as BankAccountBalance;
        })
      );

      return balancesWithRealTime;
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
