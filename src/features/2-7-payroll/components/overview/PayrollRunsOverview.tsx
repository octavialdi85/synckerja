import React, { useState } from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Play, Users, DollarSign, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { toast } from 'sonner';
import { isEmployeeEligibleForPayroll } from '@/features/2-1-employees/utils/employeeUtils';

interface PayrollRun {
  id: string;
  run_name: string;
  status: string;
  created_at: string;
  total_employees?: number;
  total_gross_pay?: number;
  total_net_pay?: number;
  total_deductions?: number;
  total_penalties?: number;
  total_taxes?: number;
  payroll_periods: {
    period_name: string;
  } | null;
}

interface PayrollProcessResult {
  success: boolean;
  message: string;
  calculations_created?: number;
}

interface PayrollRunsOverviewProps {
  selectedRunId?: string | null;
  onRunSelect?: (runId: string | null) => void;
  onRunBlocked?: (message: string | null) => void;
}

type PreflightIssue = {
  employeeName: string;
  employeeId: string;
  missing: string[];
};

export const PayrollRunsOverview = ({ selectedRunId, onRunSelect, onRunBlocked }: PayrollRunsOverviewProps) => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const [processingRunId, setProcessingRunId] = useState<string | null>(null);

  const runPayrollPreflight = async (): Promise<{ ok: boolean; issues: PreflightIssue[] }> => {
    if (!organizationId) return { ok: false, issues: [] };

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_id, full_name, employee_status_id, pending_removal')
      .eq('organization_id', organizationId);

    if (employeesError) throw employeesError;

    const statusIds = Array.from(
      new Set((employees || []).map((emp) => emp.employee_status_id).filter(Boolean))
    ) as string[];

    let statusNameById = new Map<string, string>();
    if (statusIds.length > 0) {
      const { data: statuses, error: statusesError } = await supabase
        .from('employee_statuses')
        .select('id, name')
        .in('id', statusIds);

      if (statusesError) throw statusesError;
      statusNameById = new Map((statuses || []).map((status) => [status.id, status.name]));
    }

    const normalizedEmployees = (employees || []).map((emp) => ({
      ...emp,
      employee_status_name: emp.employee_status_id ? statusNameById.get(emp.employee_status_id) || null : null
    }));

    const eligibleEmployees = normalizedEmployees.filter((emp) => isEmployeeEligibleForPayroll(emp));

    if (eligibleEmployees.length === 0) {
      return {
        ok: false,
        issues: [{
          employeeName: 'No eligible employees',
          employeeId: '-',
          missing: ['Employee status must be active or probation']
        }]
      };
    }

    const eligibleIds = eligibleEmployees.map((emp) => emp.id);
    const { data: payrollInfo, error: payrollInfoError } = await supabase
      .from('employee_payroll_info')
      .select('employee_id, basic_salary, ptkp_status, tax_configuration_id')
      .in('employee_id', eligibleIds);

    if (payrollInfoError) throw payrollInfoError;

    const payrollInfoByEmployeeId = new Map((payrollInfo || []).map((info) => [info.employee_id, info]));

    const issues: PreflightIssue[] = [];
    for (const employee of eligibleEmployees) {
      const info = payrollInfoByEmployeeId.get(employee.id);
      const missing: string[] = [];

      if (!info) {
        missing.push('Payroll info');
      } else {
        if (!info.basic_salary || info.basic_salary <= 0) missing.push('Basic salary');
        if (!info.ptkp_status) missing.push('PTKP status');
        if (!info.tax_configuration_id) missing.push('Tax configuration');
      }

      if (missing.length > 0) {
        issues.push({
          employeeName: employee.full_name || 'Unknown Employee',
          employeeId: employee.employee_id || '-',
          missing
        });
      }
    }

    return { ok: issues.length === 0, issues };
  };

  const handleProcessPayroll = async (runId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card selection
    
    try {
      setProcessingRunId(runId);
      toast.loading('Processing payroll calculations...', { id: 'payroll-process' });

      const preflight = await runPayrollPreflight();
      if (!preflight.ok) {
        const detailLines = preflight.issues
          .slice(0, 8)
          .map((issue) => `${issue.employeeName} (${issue.employeeId}): ${issue.missing.join(', ')}`);
        const hasMore = preflight.issues.length > 8;
        const detailMessage = [
          'Run payroll diblokir: lengkapi payroll info dulu.',
          ...detailLines,
          hasMore ? `...dan ${preflight.issues.length - 8} employee lainnya` : ''
        ].filter(Boolean).join('\n');

        onRunBlocked?.(detailMessage);
        toast.error(`Run payroll diblokir. ${preflight.issues.length} employee masih belum lengkap.`, {
          id: 'payroll-process'
        });
        return;
      }

      onRunBlocked?.(null);

      // Call the comprehensive payroll processing function
      console.log('🔄 Processing payroll calculations for run:', runId);
      
      const { data: processResult, error: processError } = await supabase
        .rpc('process_payroll_run', { run_id: runId });
        
      if (processError) {
        console.error('❌ Error in payroll processing:', processError);
        throw processError;
      }
      
      console.log('✅ Payroll processing result:', processResult);

      const result = processResult as unknown as PayrollProcessResult;
      if (result?.success) {
        toast.success(result.message || 'Payroll calculations completed successfully!', { 
          id: 'payroll-process' 
        });
      } else {
        throw new Error(result?.message || 'Payroll processing failed');
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['payroll-runs-overview'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-run-details'] });

    } catch (error) {
      console.error('❌ Error processing payroll:', error);
      toast.error(error.message || 'Failed to process payroll calculations', { 
        id: 'payroll-process' 
      });
    } finally {
      setProcessingRunId(null);
    }
  };

  const { data: runs, isLoading } = useQuery({
    queryKey: ['payroll-runs-overview', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('🔍 Fetching payroll runs for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('payroll_runs')
        .select(`
          *,
          payroll_periods (
            period_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching payroll runs:', error);
        throw error;
      }
      
      console.log('📊 Payroll runs data:', data);
      
      // Check if we have employees with payroll info
      const { data: employeesWithPayroll, error: empError } = await supabase
        .from('employees')
        .select(`
          id, full_name, employee_status_id,
          employee_payroll_info (
            basic_salary
          )
        `)
        .eq('organization_id', organizationId);
        
      if (empError) {
        console.error('❌ Error fetching employees:', empError);
      } else {
        console.log('👥 Employees with payroll info:', employeesWithPayroll);
      }
      
      return data as PayrollRun[];
    },
    enabled: !!organizationId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs?.map((run) => (
        <Card 
          key={run.id} 
          className={`p-3 hover:shadow-sm transition-all cursor-pointer ${
            selectedRunId === run.id 
              ? 'border-blue-500 bg-blue-50/50 shadow-md' 
              : 'hover:border-blue-300'
          }`}
          onClick={() => onRunSelect?.(selectedRunId === run.id ? null : run.id)}
        >
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => handleProcessPayroll(run.id, e)}
                  disabled={processingRunId === run.id}
                >
                  {processingRunId === run.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <Play className="h-4 w-4 text-blue-600" />
                  )}
                </Button>
                <span className="font-medium text-sm">{run.run_name}</span>
              </div>
              <Badge className={getStatusColor(run.status)} variant="secondary">
                {run.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{run.payroll_periods?.period_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 text-gray-500">
                  <Users className="h-3 w-3" />
                  <span>{run.total_employees || 0} eligible employees</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-gray-500">Gross Pay</div>
                  <div className="font-medium text-green-600">{formatCurrency(run.total_gross_pay || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">Deductions</div>
                  <div className="font-medium text-red-600">{formatCurrency(run.total_deductions || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">Net Pay</div>
                  <div className="font-medium text-blue-600">{formatCurrency(run.total_net_pay || 0)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {(!runs || runs.length === 0) && (
        <div className="text-center py-6 text-gray-500">
          <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No payroll runs found</p>
        </div>
      )}
    </div>
  );
};
