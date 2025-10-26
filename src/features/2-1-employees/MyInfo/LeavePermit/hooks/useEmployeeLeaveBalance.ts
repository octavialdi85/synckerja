import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

// Type definition for the RPC function result
interface LeaveBalanceResult {
  total_allocated: number;
  total_used: number;
  remaining_balance: number;
  expired_days: number;
  calculation_date: string;
}

export const useEmployeeLeaveBalance = () => {
  const { data: employeeData } = useCurrentEmployee();
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['employee-leave-balance', employeeData?.id],
    queryFn: async () => {
      if (!employeeData?.id) {
        throw new Error('No employee found');
      }

      console.log('📊 Fetching leave balance for employee:', employeeData.id);
      console.log('📊 Employee organization:', employeeData.organization_id);
      console.log('📊 Employee current leave_balance:', employeeData.leave_balance);

      try {
        // Always calculate using the updated RPC function for accurate data
        console.log('📊 Calculating leave balance for employee:', employeeData.id);
        
        const { data: balanceResult, error: balanceError } = await supabase
          .rpc('calculate_employee_leave_balance', {
            employee_id_param: employeeData.id
          });

        if (!balanceError && balanceResult) {
          console.log('✅ Leave balance calculated successfully:', balanceResult);
          const result = balanceResult as unknown as LeaveBalanceResult;
          return {
            totalAnnualLeave: result.total_allocated,
            usedLeaveDays: result.total_used,
            remainingLeave: result.remaining_balance,
            expiredDays: result.expired_days,
            calculationDate: result.calculation_date
          };
        }

        console.error('❌ Error calculating leave balance:', balanceError);
        throw balanceError || new Error('Failed to calculate leave balance');
      } catch (error) {
        console.warn('⚠️ Falling back to legacy calculation method');
        
        // Fallback to legacy calculation if new method fails
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;

        const { data: leaveRequests, error: requestsError } = await supabase
          .from('leave_requests')
          .select('total_days, leave_type')
          .eq('employee_id', employeeData.id)
          .eq('status', 'approved')
          .gte('start_date', startOfYear)
          .lte('end_date', endOfYear);

        if (requestsError) {
          console.error('❌ Error fetching leave requests:', requestsError);
          throw requestsError;
        }

        const usedLeaveDays = leaveRequests?.reduce((total, leave) => {
          return total + (leave.total_days || 0);
        }, 0) || 0;

        const totalAnnualLeave = leavePolicy?.annual_leave_days || 12;
        const remainingLeave = Math.max(0, totalAnnualLeave - usedLeaveDays);

        console.log('✅ Legacy leave balance calculated:', { usedLeaveDays, remainingLeave, totalAnnualLeave });
        
        return {
          totalAnnualLeave,
          usedLeaveDays,
          remainingLeave,
          expiredDays: 0,
          calculationDate: new Date().toISOString().split('T')[0]
        };
      }
    },
    enabled: !!employeeData?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
