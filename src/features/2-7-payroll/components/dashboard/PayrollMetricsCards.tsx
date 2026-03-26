import React from 'react';
import { TrendingUp, DollarSign, Calculator, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';

interface PayrollMetricsCardsProps {
  calculations: any[];
  selectedPayrollRunId?: string | null;
}

export const PayrollMetricsCards = ({ calculations, selectedPayrollRunId }: PayrollMetricsCardsProps) => {
  const { organizationId } = useCurrentOrg();

  const { data: selectedPayrollRun } = useQuery({
    queryKey: ['payroll-run-details', selectedPayrollRunId],
    queryFn: async () => {
      if (!selectedPayrollRunId) return null;
      
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', selectedPayrollRunId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPayrollRunId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Jika ada payroll run yang dipilih, tampilkan data dari payroll_runs table
  const metrics = selectedPayrollRun ? [
    {
      title: 'Total Employees',
      value: selectedPayrollRun.total_employees || 0,
      icon: Calculator,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      subtitle: 'In selected run',
    },
    {
      title: 'Total Gross Pay',
      value: formatCurrency(selectedPayrollRun.total_gross_pay || 0),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtitle: 'In selected run',
    },
    {
      title: 'Total Net Pay',
      value: formatCurrency(selectedPayrollRun.total_net_pay || 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      subtitle: 'In selected run',
    },
    {
      title: 'Total Deductions',
      value: formatCurrency((selectedPayrollRun.total_deductions || 0) + (selectedPayrollRun.total_penalties || 0)),
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      subtitle: 'In selected run',
    },
  ] : [
    // Default metrics dari calculations jika tidak ada payroll run yang dipilih
    {
      title: 'Total Calculations',
      value: calculations?.length || 0,
      icon: Calculator,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      subtitle: 'All calculations',
    },
    {
      title: 'Total Gross Pay',
      value: formatCurrency(calculations?.reduce((sum, calc) => sum + (calc.gross_pay || 0), 0) || 0),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtitle: 'All calculations',
    },
    {
      title: 'Total Net Pay',
      value: formatCurrency(calculations?.reduce((sum, calc) => sum + (calc.net_pay || 0), 0) || 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      subtitle: 'All calculations',
    },
    {
      title: 'Total Deductions',
      value: formatCurrency(calculations?.reduce((sum, calc) => sum + (calc.total_deductions || 0) + (calc.total_penalties || 0), 0) || 0),
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      subtitle: 'All calculations',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className={`${metric.bgColor} ${metric.borderColor} border rounded-md p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">{metric.title}</h3>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900 truncate">{metric.value}</div>
                <div className="text-xs text-gray-600">{metric.subtitle}</div>
              </div>
          </div>
        );
      })}
    </div>
  );
};