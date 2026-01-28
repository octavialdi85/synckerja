import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { toast } from 'sonner';
import { Debt, CreateDebtData, UpdateDebtData } from '../types';

export const useDebts = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { organizationId } = useCurrentOrg();

  const fetchDebts = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDebts(data || []);
    } catch (error: any) {
      console.error('Error fetching debts:', error);
      toast.error('Gagal memuat data hutang');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [organizationId]);

  const createDebt = async (debtData: CreateDebtData): Promise<boolean> => {
    if (!organizationId) {
      toast.error('Organization tidak ditemukan');
      return false;
    }

    try {
      setIsCreating(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('User tidak terautentikasi');
        return false;
      }

      // Hutang = Jumlah Terpakai (bukan limit - used)
      const calculatedDebtAmount = debtData.debt_amount || debtData.used_amount;
      
      // Calculate available_limit if not provided (limit - used)
      const calculatedAvailableLimit = debtData.available_limit !== undefined 
        ? debtData.available_limit 
        : (debtData.limit_amount - debtData.used_amount);

      const { data, error } = await supabase
        .from('debts')
        .insert({
          organization_id: organizationId,
          created_by: userData.user.id,
          debt_name: debtData.debt_name,
          debt_type: debtData.debt_type,
          bank_name: debtData.bank_name || null,
          limit_amount: debtData.limit_amount,
          available_limit: calculatedAvailableLimit || null,
          used_amount: debtData.used_amount,
          debt_amount: calculatedDebtAmount,
          interest_rate: debtData.interest_rate || null,
          due_date: debtData.due_date || null,
          minimum_payment: debtData.minimum_payment || null,
          description: debtData.description || null,
          status: debtData.status || 'active',
        })
        .select()
        .single();

      if (error) throw error;

      setDebts(prev => [data, ...prev]);
      toast.success('Hutang berhasil ditambahkan');
      return true;
    } catch (error: any) {
      console.error('Error creating debt:', error);
      toast.error(error.message || 'Gagal menambahkan hutang');
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const updateDebt = async (debtData: UpdateDebtData): Promise<boolean> => {
    if (!organizationId) {
      toast.error('Organization tidak ditemukan');
      return false;
    }

    try {
      setIsUpdating(true);
      const { id, ...updateData } = debtData;

      // Recalculate debt_amount and available_limit if limit_amount or used_amount changed
      if (updateData.limit_amount !== undefined || updateData.used_amount !== undefined || updateData.available_limit !== undefined) {
        const currentDebt = debts.find(d => d.id === id);
        const newLimit = updateData.limit_amount ?? currentDebt?.limit_amount ?? 0;
        const newUsed = updateData.used_amount ?? currentDebt?.used_amount ?? 0;
        const newAvailable = updateData.available_limit ?? currentDebt?.available_limit;
        
        // If available_limit is provided, recalculate used_amount
        if (newAvailable !== undefined && newAvailable !== null) {
          updateData.used_amount = newLimit - newAvailable;
          // Hutang = Jumlah Terpakai
          updateData.debt_amount = newLimit - newAvailable;
        } else {
          // Hutang = Jumlah Terpakai (bukan limit - terpakai)
          updateData.debt_amount = newUsed;
          updateData.available_limit = newLimit - newUsed;
        }
      }

      const { data, error } = await supabase
        .from('debts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      setDebts(prev => prev.map(d => d.id === id ? data : d));
      toast.success('Hutang berhasil diperbarui');
      return true;
    } catch (error: any) {
      console.error('Error updating debt:', error);
      toast.error(error.message || 'Gagal memperbarui hutang');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteDebt = async (debtId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error('Organization tidak ditemukan');
      return false;
    }

    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debtId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      setDebts(prev => prev.filter(d => d.id !== debtId));
      toast.success('Hutang berhasil dihapus');
      return true;
    } catch (error: any) {
      console.error('Error deleting debt:', error);
      toast.error(error.message || 'Gagal menghapus hutang');
      return false;
    }
  };

  return {
    debts,
    isLoading,
    isCreating,
    isUpdating,
    createDebt,
    updateDebt,
    deleteDebt,
    refetch: fetchDebts,
  };
};
