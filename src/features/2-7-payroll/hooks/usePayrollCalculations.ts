import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PayrollCalculation {
  id: string;
  employee_id: string;
  payroll_run_id: string;
  payroll_period_id: string;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
  take_home_pay: number;
  payment_status: string;
  calculation_status: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
  
  // Employee details
  employee?: {
    id: string;
    full_name: string;
    employee_id: string;
    department_name?: string;
  };
  
  // Payroll period details
  payroll_period?: {
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
    pay_date: string;
    status: string;
  };
}

export const usePayrollCalculations = (organizationId?: string) => {
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayrollCalculations = async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('employee_payroll_calculations')
        .select(`
          *,
          employees!employee_id (
            id,
            full_name,
            employee_id,
            departments!department_id (
              name
            )
          ),
          payroll_periods!payroll_period_id (
            id,
            period_name,
            start_date,
            end_date,
            pay_date,
            status
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: PayrollCalculation[] = (data || []).map(item => ({
        id: item.id,
        employee_id: item.employee_id,
        payroll_run_id: item.payroll_run_id,
        payroll_period_id: item.payroll_period_id,
        basic_salary: item.basic_salary || 0,
        total_allowances: item.total_allowances || 0,
        total_deductions: item.total_deductions || 0,
        gross_pay: item.gross_pay || 0,
        net_pay: item.net_pay || 0,
        take_home_pay: item.take_home_pay || 0,
        payment_status: item.payment_status || 'pending',
        calculation_status: item.calculation_status || 'pending',
        payment_date: item.payment_date,
        created_at: item.created_at,
        updated_at: item.updated_at,
        employee: item.employees ? {
          id: item.employees.id,
          full_name: item.employees.full_name,
          employee_id: item.employees.employee_id,
          department_name: item.employees.departments?.name
        } : undefined,
        payroll_period: item.payroll_periods ? {
          id: item.payroll_periods.id,
          period_name: item.payroll_periods.period_name,
          start_date: item.payroll_periods.start_date,
          end_date: item.payroll_periods.end_date,
          pay_date: item.payroll_periods.pay_date,
          status: item.payroll_periods.status
        } : undefined
      }));

      setCalculations(formattedData);
    } catch (err) {
      console.error('Error fetching payroll calculations:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollCalculations();
  }, [organizationId]);

  return {
    calculations,
    isLoading,
    error,
    refetch: fetchPayrollCalculations
  };
};
