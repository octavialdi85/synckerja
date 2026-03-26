import React, { useState } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { PayrollCalculationsTable } from '../calculations/PayrollCalculationsTable';
import { PayrollFilters } from '../components/filters/PayrollFilters';
import { PayrollMetricsCards } from '../components/dashboard/PayrollMetricsCards';
import { PayrollSidebar } from '../components/sidebar/PayrollSidebar';
import { EmployeeDetailView } from '../views/EmployeeDetailView';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { HeaderAndTab } from './HeaderAndTab';
import { AlertTriangle } from 'lucide-react';

type PayrollCalculationLoose = {
  [key: string]: unknown;
  employee_payroll_info_id?: string;
  employee_payroll_info?: unknown;
};

const PayrollCalculationsPage = () => {
  const { organizationId } = useCurrentOrg();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [runBlockedMessage, setRunBlockedMessage] = useState<string | null>(null);

  // Fetch payroll calculations
  const { data: calculations = [], isLoading, refetch } = useQuery({
    queryKey: ['payroll-calculations', organizationId, selectedPayrollRunId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // First, let's check what data actually exists
      console.log('🔍 Debugging payroll data...');
      
      // Check if there are any calculations at all
      const { data: allCalculations, error: allCalcError } = await supabase
        .from('employee_payroll_calculations')
        .select('*')
        .limit(5);
      
      console.log('All calculations in database:', allCalculations);
      console.log('All calculations error:', allCalcError);
      
      // Check payroll runs for this organization
      const { data: payrollRuns, error: runsError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('organization_id', organizationId);
      
      console.log('Payroll runs for organization:', payrollRuns);
      console.log('Payroll runs error:', runsError);
      
      // Check employee payroll info
      const { data: payrollInfo, error: infoError } = await supabase
        .from('employee_payroll_info')
        .select(`
          *,
          employees!inner(
            id, full_name, employee_id, organization_id,
            departments(name),
            job_positions(name)
          )
        `)
        .eq('employees.organization_id', organizationId);
      
      console.log('Employee payroll info:', payrollInfo);
      console.log('Employee payroll info error:', infoError);
      
      let query = supabase
        .from('employee_payroll_calculations')
        .select(`
          *,
          employee_payroll_info(
            employees(
              id, full_name, employee_id, organization_id,
              departments(name),
              job_positions(name)
            )
          ),
          payroll_runs(
            id, run_name, run_date, status,
            payroll_periods(
              id, period_name, start_date, end_date, pay_date
            )
          )
        `);

      if (selectedPayrollRunId) {
        query = query.eq('payroll_run_id', selectedPayrollRunId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Payroll calculations fetch error:', error);
        console.log('Trying alternative query...');
        
        // Try alternative query without complex joins
        const { data: altData, error: altError } = await supabase
          .from('employee_payroll_calculations')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (altError) {
          console.error('Alternative query also failed:', altError);
          throw altError;
        }
        
        console.log('Alternative query data:', altData);
        
        // Try to get employee info separately
        const calculationsWithEmployeeInfo: Array<PayrollCalculationLoose & { employee_payroll_info: unknown }> = [];
        const safeAltData = (altData || []) as unknown as PayrollCalculationLoose[];
        for (const calc of safeAltData) {
          const { data: employeeData } = await supabase
            .from('employee_payroll_info')
            .select(`
              *,
              employees!inner(
                id, full_name, employee_id, organization_id,
                departments(name),
                job_positions(name)
              )
            `)
            .eq('id', calc.employee_payroll_info_id)
            .eq('employees.organization_id', organizationId)
            .single();
          
          if (employeeData) {
            calculationsWithEmployeeInfo.push({
              ...calc,
              employee_payroll_info: employeeData
            });
          }
        }
        
        console.log('Calculations with employee info:', calculationsWithEmployeeInfo);
        return calculationsWithEmployeeInfo;
      }
      
      // Filter by organization_id after fetching
      const safeData = (data || []) as unknown as PayrollCalculationLoose[];
      const filteredData = safeData.filter(calc => {
        const employeePayrollInfo = calc.employee_payroll_info as
          | { employees?: { organization_id?: string } }
          | undefined;
        return employeePayrollInfo?.employees?.organization_id === organizationId;
      });
      
      console.log('Payroll calculations data:', filteredData);
      console.log('Organization ID:', organizationId);
      console.log('Selected Payroll Run ID:', selectedPayrollRunId);
      console.log('Total calculations found:', filteredData.length);
      
      return filteredData;
    },
    enabled: !!organizationId,
  });

  // Calculate tax amounts (simplified)
  const taxAmounts = calculations.reduce((acc: Record<string, number>, calc: any) => {
    acc[calc.id] = calc.total_tax_deductions || 0;
    return acc;
  }, {});

  // Fetch payroll items for selected employee
  const { data: payrollItems = [] } = useQuery<any[]>({
    queryKey: ['payroll-items', selectedEmployee?.id],
    queryFn: async () => {
      if (!selectedEmployee?.id) return [];
      
      const { data, error } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('payroll_calculation_id', selectedEmployee.id);
      
      if (error) {
        console.error('Error fetching payroll items:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!selectedEmployee?.id,
  });

  return <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-h-0">
          {selectedEmployee ? (
            /* Employee Detail View */
            <EmployeeDetailView
              selectedEmployee={selectedEmployee}
              onBack={() => setSelectedEmployee(null)}
              allowanceData={payrollItems.filter(item => item.component_type === 'allowance')}
              deductionData={payrollItems.filter(item => item.component_type === 'deduction')}
              taxData={[]}
              tardinessData={[]}
              attendancePenalties={[]}
            />
          ) : (
            /* Payroll Calculations Table View */
            <div className="h-full grid grid-cols-12 gap-2 min-h-0">
              {/* Left Content - 9 columns on xl screens, full width on smaller */}
              <div className="col-span-9 h-full min-w-0">
                <div className="h-full flex flex-col min-w-0">
              {/* Filters */}
              <div className="flex-shrink-0 mb-2">
                <div className="bg-white border rounded-md p-2">
                  <PayrollFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    paymentFilter={paymentFilter}
                    setPaymentFilter={setPaymentFilter}
                  />
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="flex-shrink-0 mb-2">
                <PayrollMetricsCards 
                  calculations={calculations}
                  selectedPayrollRunId={selectedPayrollRunId}
                />
              </div>

              {runBlockedMessage && (
                <div className="flex-shrink-0 mb-2 border border-amber-200 bg-amber-50 rounded-md px-3 py-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <pre className="text-xs text-amber-900 whitespace-pre-wrap font-sans">{runBlockedMessage}</pre>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="flex-1 min-h-0 min-w-0">
                <div className="h-full min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                  <PayrollCalculationsTable
                    calculations={calculations}
                    taxAmounts={taxAmounts}
                    isLoading={isLoading}
                    onEmployeeSelect={setSelectedEmployee}
                    onRefresh={() => refetch()}
                  />
                </div>
              </div>
                </div>
            </div>

            {/* Right Sidebar - 3 columns on xl screens, full width on smaller */}
            <div className="col-span-3 h-full">
              <div className="h-full flex flex-col">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-120px)]">
                  <PayrollSidebar 
                    selectedPayrollRunId={selectedPayrollRunId}
                    onPayrollRunSelect={setSelectedPayrollRunId}
                    onRunBlocked={setRunBlockedMessage}
                  />
                </div>
              </div>
              </div>
            </div>
          )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>;
};
export default PayrollCalculationsPage;