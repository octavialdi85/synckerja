import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { toast } from 'sonner';
import { Debt, CreateDebtData, UpdateDebtData } from '../types';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useBankAccountBalances } from '@/hooks/organized/useBankAccountBalances';
import { deleteDebtWithPaymentRefunds } from '../services/deleteDebtWithPaymentRefunds';

export const useDebts = () => {
  const { t } = useAppTranslation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalInterestYtd, setTotalInterestYtd] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { organizationId } = useCurrentOrg();
  const { updateBalance } = useBankAccountBalances();

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

      const debtList = data || [];
      const debtIds = debtList.map((d: { id: string }) => d.id);

      const totalInterestByDebt: Record<string, number> = {};
      const lastPaymentByDebt: Record<string, string> = {};
      const startOfYear = `${new Date().getFullYear()}-01-01`;
      let ytdInterest = 0;
      if (debtIds.length > 0) {
        const { data: payments } = await supabase
          .from('debt_payments')
          .select('debt_id, interest_amount, payment_date')
          .eq('organization_id', organizationId)
          .in('debt_id', debtIds);
        (payments || []).forEach((p: { debt_id: string; interest_amount: number | null; payment_date: string }) => {
          const amt = p.interest_amount ?? 0;
          totalInterestByDebt[p.debt_id] = (totalInterestByDebt[p.debt_id] ?? 0) + amt;
          const d = p.payment_date;
          if (d && (!lastPaymentByDebt[p.debt_id] || d > lastPaymentByDebt[p.debt_id])) {
            lastPaymentByDebt[p.debt_id] = d;
          }
          if (d && d >= startOfYear) {
            ytdInterest += amt;
          }
        });
      }
      setTotalInterestYtd(ytdInterest);

      const merged = debtList.map((d: Debt) => ({
        ...d,
        total_interest: totalInterestByDebt[d.id] ?? 0,
        last_payment_date: lastPaymentByDebt[d.id] ?? null,
      }));

      setDebts(merged);
    } catch (error: any) {
      console.error('Error fetching debts:', error);
      toast.error(t('debt.error.loadFailed', 'Failed to load debt data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [organizationId]);

  const createDebt = async (debtData: CreateDebtData): Promise<boolean> => {
    if (!organizationId) {
      toast.error(t('debt.error.orgNotFound', 'Organization not found'));
      return false;
    }

    try {
      setIsCreating(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error(t('debt.error.userNotAuth', 'User not authenticated'));
        return false;
      }

      const isOnlineLoan = debtData.debt_type === 'Pinjaman Online';
      
      let calculatedDebtAmount: number;
      let calculatedAvailableLimit: number | null;
      let calculatedPaidAmount: number | null;
      
      if (isOnlineLoan) {
        // For Pinjaman Online (belum dipakai): Total Limit = Available Limit (sama).
        // limit_amount = Total Limit (plafon), available_limit = limit_amount, debt_amount = 0.
        // Debt dan Paid terisi otomatis oleh expense dan Pay Debt modal.
        const totalLimit = debtData.limit_amount;
        calculatedDebtAmount = 0;
        calculatedAvailableLimit = totalLimit; // sama dengan Total Limit ketika baru
        calculatedPaidAmount = 0;
      } else {
        // For other debt types: terpakai = limit - available; debt_amount = terpakai
        calculatedDebtAmount = debtData.debt_amount ?? 0;
        // Pastikan available_limit tidak pernah 0 atau null - gunakan limit_amount sebagai default
        if (debtData.available_limit != null && debtData.available_limit > 0) {
          calculatedAvailableLimit = debtData.available_limit;
        } else {
          calculatedAvailableLimit = debtData.limit_amount; // Full limit (belum ada pemakaian)
        }
        calculatedPaidAmount = debtData.paid_amount || null;
      }

      const { data, error } = await supabase
        .from('debts')
        .insert({
          organization_id: organizationId,
          created_by: userData.user.id,
          debt_name: debtData.debt_name,
          debt_type: debtData.debt_type,
          bank_name: debtData.bank_name || null,
          limit_amount: debtData.limit_amount,
          available_limit: calculatedAvailableLimit, // Selalu ada nilai, tidak pernah null
          debt_amount: calculatedDebtAmount,
          paid_amount: calculatedPaidAmount,
          loan_duration: debtData.loan_duration || null,
          monthly_payment: debtData.monthly_payment || null,
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
      toast.success(t('debt.success.added', 'Debt added successfully'));
      return true;
    } catch (error: any) {
      console.error('Error creating debt:', error);
      toast.error(error.message || t('debt.error.addFailed', 'Failed to add debt'));
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const updateDebt = async (debtData: UpdateDebtData): Promise<boolean> => {
    if (!organizationId) {
      toast.error(t('debt.error.orgNotFound', 'Organization not found'));
      return false;
    }

    try {
      setIsUpdating(true);
      const { id, ...updateData } = debtData;

      // Recalculate debt_amount, available_limit, and paid_amount if needed
      const currentDebt = debts.find(d => d.id === id);
      const debtType = updateData.debt_type ?? currentDebt?.debt_type;
      const isOnlineLoan = debtType === 'Pinjaman Online';
      
      if (updateData.limit_amount !== undefined || updateData.available_limit !== undefined || updateData.debt_amount !== undefined || isOnlineLoan) {
        const newLimit = updateData.limit_amount ?? currentDebt?.limit_amount ?? 0;
        const newAvailable = updateData.available_limit ?? currentDebt?.available_limit;
        const newDebtAmount = updateData.debt_amount ?? currentDebt?.debt_amount ?? 0;
        
        if (isOnlineLoan) {
          // Pinjaman Online: debt_amount dan paid_amount dari trigger/DB, jangan timpa dari form.
          // Hanya update limit_amount; available_limit = limit_amount - debt_amount (sisa plafon).
          const currentDebtAmount = currentDebt?.debt_amount ?? 0;
          updateData.debt_amount = currentDebtAmount; // keep from DB (dari expense)
          updateData.paid_amount = currentDebt?.paid_amount ?? 0; // keep from DB (dari Pay Debt)
          updateData.available_limit = Math.max(0, newLimit - currentDebtAmount);
        } else {
          // Pastikan available_limit tidak pernah 0 atau null
          if (newAvailable != null && newAvailable > 0) {
            updateData.available_limit = newAvailable;
            updateData.debt_amount = newLimit - newAvailable; // terpakai
          } else {
            updateData.available_limit = newLimit; // full limit (belum ada pemakaian)
            updateData.debt_amount = 0;
          }
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
      toast.success(t('debt.success.updated', 'Debt updated successfully'));
      return true;
    } catch (error: any) {
      console.error('Error updating debt:', error);
      toast.error(error.message || t('debt.error.updateFailed', 'Failed to update debt'));
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteDebt = async (debtId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error(t('debt.error.orgNotFound', 'Organization not found'));
      return false;
    }

    try {
      const debt = debts.find((d) => d.id === debtId);
      const result = await deleteDebtWithPaymentRefunds({
        organizationId,
        debtId,
        debtDisplayName: debt?.debt_name ?? 'Debt',
        updateBalance,
      });

      if (!result.ok) {
        toast.error(result.message || t('debt.error.deleteFailed', 'Failed to delete debt'));
        return false;
      }

      setDebts((prev) => prev.filter((d) => d.id !== debtId));
      toast.success(t('debt.success.deleted', 'Debt deleted successfully'));
      return true;
    } catch (error: unknown) {
      console.error('Error deleting debt:', error);
      toast.error(
        error instanceof Error ? error.message : t('debt.error.deleteFailed', 'Failed to delete debt')
      );
      return false;
    }
  };

  return {
    debts,
    totalInterestYtd,
    isLoading,
    isCreating,
    isUpdating,
    createDebt,
    updateDebt,
    deleteDebt,
    refetch: fetchDebts,
  };
};
