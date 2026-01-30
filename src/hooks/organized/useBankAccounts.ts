import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useToast } from '@/features/1-login/hooks/use-toast';

// Types
export interface BankAccount {
  id: string;
  name: string;
  account_number: string | null;
  bank_name: string | null;
  account_holder: string | null;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateBankAccountData {
  name: string;
  account_number?: string;
  bank_name?: string;
  account_holder?: string;
}

export interface UpdateBankAccountData {
  name?: string;
  account_number?: string;
  bank_name?: string;
  account_holder?: string;
  is_active?: boolean;
}

// Hook: useBankAccounts
export const useBankAccounts = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['bank-accounts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching bank accounts:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organizationId,
  });

  // Create bank account
  const createBankAccountMutation = useMutation({
    mutationFn: async (bankAccountData: CreateBankAccountData) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          name: bankAccountData.name,
          account_number: bankAccountData.account_number || null,
          bank_name: bankAccountData.bank_name || null,
          account_holder: bankAccountData.account_holder || null,
          organization_id: organizationId,
          is_active: true,
          created_by: userId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating bank account:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', organizationId] });
      toast({
        title: 'Success',
        description: 'Bank account created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bank account',
        variant: 'destructive',
      });
    },
  });

  // Update bank account
  const updateBankAccountMutation = useMutation({
    mutationFn: async ({ id, data: bankAccountData }: { id: string; data: UpdateBankAccountData }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update({
          ...bankAccountData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating bank account:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', organizationId] });
      toast({
        title: 'Success',
        description: 'Bank account updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bank account',
        variant: 'destructive',
      });
    },
  });

  // Delete bank account (hard delete - permanently removes from database)
  const deleteBankAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if bank account is used in any transactions
      const { data: incomeTransactions } = await supabase
        .from('income_transactions')
        .select('id')
        .eq('bank_account_id', id)
        .limit(1);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('bank_account_id', id)
        .limit(1);

      const { data: debtPayments } = await supabase
        .from('debt_payments')
        .select('id')
        .eq('payment_method', id)
        .limit(1);

      // If bank account is used in transactions, prevent deletion
      if ((incomeTransactions && incomeTransactions.length > 0) || 
          (expenses && expenses.length > 0) || 
          (debtPayments && debtPayments.length > 0)) {
        throw new Error('Cannot delete bank account that is used in transactions. Please use soft delete (set inactive) instead.');
      }

      // Hard delete - permanently remove from database
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting bank account:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['bank-account-balances', organizationId] });
      toast({
        title: 'Success',
        description: 'Bank account deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bank account',
        variant: 'destructive',
      });
    },
  });

  return {
    bankAccounts: bankAccounts as BankAccount[],
    loading,
    refetch,
    createBankAccount: createBankAccountMutation.mutateAsync,
    updateBankAccount: (id: string, data: UpdateBankAccountData) => 
      updateBankAccountMutation.mutateAsync({ id, data }),
    deleteBankAccount: deleteBankAccountMutation.mutateAsync,
  };
};
