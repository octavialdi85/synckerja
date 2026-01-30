import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { toast } from 'sonner';

export interface DebtForExpense {
  id: string;
  debt_name: string;
  status: string;
  debt_type?: string;
  available_limit?: number;
  limit_amount?: number;
  debt_amount?: number;
  paid_amount?: number;
  remaining_debt?: number;
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
        .select('id, debt_name, status, debt_type, available_limit, limit_amount, debt_amount, paid_amount, remaining_debt')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('debt_name', { ascending: true });

      if (error) throw error;
      
      const debtsWithLimit = (data || []).map(debt => {
        const limit = debt.limit_amount ?? 0;
        const isPinjamanOnline = debt.debt_type === 'Pinjaman Online';
        let available: number;
        if (isPinjamanOnline) {
          // remaining = sisa hutang. Available = limit - remaining. Bertambah setelah bayar.
          const remaining = debt.remaining_debt ?? Math.max(0, (debt.debt_amount ?? 0) - (debt.paid_amount ?? 0));
          available = Math.max(0, limit - remaining);
        } else {
          const fallback = limit;
          available = Math.max(0, debt.available_limit ?? fallback);
        }
        return { ...debt, available_limit: available };
      });
      
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
