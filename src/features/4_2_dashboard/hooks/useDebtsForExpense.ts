import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { toast } from 'sonner';

export interface DebtForExpense {
  id: string;
  debt_name: string;
  status: string;
  available_limit?: number;
}

export const useDebtsForExpense = () => {
  const [debts, setDebts] = useState<DebtForExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { organizationId } = useCurrentOrg();

  const fetchDebts = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('debts')
        .select('id, debt_name, status, available_limit, limit_amount, used_amount')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('debt_name', { ascending: true });

      if (error) throw error;
      
      // Calculate available_limit if NULL
      const debtsWithLimit = (data || []).map(debt => ({
        ...debt,
        available_limit: debt.available_limit ?? (debt.limit_amount - debt.used_amount)
      }));
      
      setDebts(debtsWithLimit);
    } catch (error: any) {
      console.error('Error fetching debts:', error);
      toast.error('Failed to load debts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [organizationId]);

  return {
    debts,
    isLoading,
    refetch: fetchDebts,
  };
};
