
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { toast } from 'sonner';

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
  create_date: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  first_payment_date?: string;
  next_payment_date?: string;
  description?: string;
  receipt_url?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  expense_name: string;
  amount: number;
  expense_type: string;
  category: string;
  department?: string;
  create_date: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  first_payment_date?: string;
  description?: string;
  receipt_file?: File;
}

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { organizationId } = useCurrentOrg();

  const fetchExpenses = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
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
      
      // Transform data to include expense type name
      const transformedData = data?.map(expense => ({
        ...expense,
        expense_type: expense.expense_types?.name || expense.expense_type || 'Unknown'
      }));
      
      setExpenses(transformedData || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadReceiptFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${organizationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to upload receipt file');
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

      let receiptUrl: string | null = null;
      if (expenseData.receipt_file) {
        receiptUrl = await uploadReceiptFile(expenseData.receipt_file);
        if (!receiptUrl) {
          return false; // Upload failed
        }
      }

      // Get the expense type ID from the database
      const { data: expenseTypes, error: typeError } = await supabase
        .from('expense_types')
        .select('id')
        .eq('name', expenseData.expense_type)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .maybeSingle();

      if (typeError) {
        console.error('Error finding expense type:', typeError);
      }

      // Get the expense category ID from the database
      const { data: expenseCategories, error: categoryError } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('name', expenseData.category)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .maybeSingle();

      if (categoryError) {
        console.error('Error finding expense category:', categoryError);
      }

      // Calculate next payment date for recurring expenses
      let nextPaymentDate: string | null = null;
      if (expenseData.is_recurring && expenseData.first_payment_date && expenseData.recurring_frequency) {
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
          create_date: expenseData.create_date,
          is_recurring: expenseData.is_recurring,
          recurring_frequency: expenseData.recurring_frequency || null,
          first_payment_date: expenseData.first_payment_date || null,
          next_payment_date: nextPaymentDate,
          description: expenseData.description || null,
          receipt_url: receiptUrl,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Expense created successfully!');
      await fetchExpenses(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [organizationId]);

  return {
    expenses,
    isLoading,
    isCreating,
    createExpense,
    refetch: fetchExpenses,
  };
};
