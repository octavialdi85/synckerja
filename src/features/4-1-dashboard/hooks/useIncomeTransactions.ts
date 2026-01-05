
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { IncomeTransactionWithRelations, CreateIncomeTransactionData } from '../types';

export const useIncomeTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { organizationId } = useCurrentOrg();

  const { data: incomeTransactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['income-transactions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('income_transactions')
        .select(`
          *,
          income_types(name),
          income_categories(name),
          services(name),
          sub_services(name)
        `)
        .eq('organization_id', organizationId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data as IncomeTransactionWithRelations[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (newTransaction: CreateIncomeTransactionData) => {
      if (!user?.id || !organizationId) {
        throw new Error('User not authenticated or no organization selected');
      }

      let receipt_file_path = null;
      let receipt_file_name = null;
      let receipt_file_size = null;
      let receipt_mime_type = null;

      // Handle file upload if present
      if (newTransaction.receipt_file) {
        const file = newTransaction.receipt_file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('income-receipts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        receipt_file_path = filePath;
        receipt_file_name = file.name;
        receipt_file_size = file.size;
        receipt_mime_type = file.type;
      } else if (newTransaction.receipt_url) {
        // Fallback: use existing receipt URL from sales activity
        const url = newTransaction.receipt_url.trim();
        if (url) {
          receipt_file_path = url;
          try {
            const parsed = new URL(url);
            const last = parsed.pathname.split('/').pop() || 'receipt';
            receipt_file_name = decodeURIComponent(last);
          } catch {
            receipt_file_name = 'receipt';
          }
          // Size and mime type are unknown for external URLs
          receipt_file_size = null;
          receipt_mime_type = null;
        }
      }

      // Remove receipt_file and receipt_url from the data before inserting
      const { receipt_file, receipt_url, ...transactionData } = newTransaction;

      const { data, error } = await supabase
        .from('income_transactions')
        .insert({
          ...transactionData,
          organization_id: organizationId,
          user_id: user.id,
          created_by: user.id,
          receipt_file_path,
          receipt_file_name,
          receipt_file_size,
          receipt_mime_type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-transactions'] });
      // Also trigger sales activities refetch since they might be related
      queryClient.invalidateQueries({ queryKey: ['sales-activities'] });
      toast({
        title: "Success",
        description: "Income transaction created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create income transaction",
        variant: "destructive",
      });
      console.error('Error creating income transaction:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncomeTransactionWithRelations> & { id: string }) => {
      const { data, error } = await supabase
        .from('income_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-transactions'] });
      toast({
        title: "Success",
        description: "Income transaction updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update income transaction",
        variant: "destructive",
      });
      console.error('Error updating income transaction:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('income_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-transactions'] });
      toast({
        title: "Success",
        description: "Income transaction deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete income transaction",
        variant: "destructive",
      });
      console.error('Error deleting income transaction:', error);
    },
  });

  return {
    incomeTransactions,
    isLoading,
    error,
    refetch,
    createIncomeTransaction: createMutation.mutate,
    updateIncomeTransaction: updateMutation.mutate,
    deleteIncomeTransaction: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
