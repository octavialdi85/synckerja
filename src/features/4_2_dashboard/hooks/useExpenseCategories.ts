
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  expense_type_id: string;
  organization_id?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseCategoryData {
  name: string;
  description?: string;
  expense_type_id: string;
}

export const useExpenseCategories = (expenseTypeId?: string) => {
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { organizationId } = useCurrentOrg();

  const fetchExpenseCategories = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from('expense_categories')
        .select('*')
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .eq('is_active', true);

      if (expenseTypeId) {
        query = query.eq('expense_type_id', expenseTypeId);
      }

      const { data, error } = await query.order('is_default', { ascending: false }).order('name');

      if (error) throw error;
      setExpenseCategories(data || []);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      toast.error('Failed to load expense categories');
    } finally {
      setIsLoading(false);
    }
  };

  const createExpenseCategory = async (categoryData: CreateExpenseCategoryData) => {
    if (!organizationId) {
      toast.error('Organization not found');
      return false;
    }

    try {
      setIsCreating(true);
      const { error } = await supabase
        .from('expense_categories')
        .insert({
          name: categoryData.name,
          description: categoryData.description,
          expense_type_id: categoryData.expense_type_id,
          organization_id: organizationId,
          is_active: true,
          is_default: false,
        });

      if (error) throw error;

      toast.success('Expense category created successfully!');
      await fetchExpenseCategories();
      return true;
    } catch (error) {
      console.error('Error creating expense category:', error);
      toast.error('Failed to create expense category');
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const updateExpenseCategory = async (id: string, categoryData: CreateExpenseCategoryData) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({
          name: categoryData.name,
          description: categoryData.description,
          expense_type_id: categoryData.expense_type_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Expense category updated successfully!');
      await fetchExpenseCategories();
      return true;
    } catch (error) {
      console.error('Error updating expense category:', error);
      toast.error('Failed to update expense category');
      return false;
    }
  };

  const deleteExpenseCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Expense category deleted successfully!');
      await fetchExpenseCategories();
      return true;
    } catch (error) {
      console.error('Error deleting expense category:', error);
      toast.error('Failed to delete expense category');
      return false;
    }
  };

  useEffect(() => {
    fetchExpenseCategories();
  }, [organizationId, expenseTypeId]);

  return {
    expenseCategories,
    isLoading,
    isCreating,
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    refetch: fetchExpenseCategories,
  };
};
