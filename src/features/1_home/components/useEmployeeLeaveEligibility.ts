import { useQuery } from '@tanstack/react-query';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';

export interface LeaveEligibility {
  isEligible: boolean;
  reason?: string;
  remainingDays: number;
  annualLeaveEntitlement: number;
}

export const useEmployeeLeaveEligibility = (employeeId?: string | null) => {
  const { data: currentEmployee } = useCurrentEmployee();
  const effectiveEmployeeId = employeeId || currentEmployee?.id;

  return useQuery({
    queryKey: ['employeeLeaveEligibility', effectiveEmployeeId],
    queryFn: async (): Promise<LeaveEligibility> => {
      // Placeholder implementation
      // TODO: Implement actual leave eligibility check from database
      return {
        isEligible: true,
        reason: undefined,
        remainingDays: 12,
        annualLeaveEntitlement: 12
      };
    },
    enabled: !!effectiveEmployeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

