
import { useQuery } from '@tanstack/react-query';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';

export const useExpenseMetrics = () => {
  const { organizationId } = useCurrentOrg();
  
  return useQuery({
    queryKey: ['expense-metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Since expense_transactions table doesn't exist yet, return default values
      // This prevents build errors while maintaining the hook interface
      console.log('expense_transactions table not found, returning default values');
      
      return {
        currentMonthTotal: 0,
        previousMonthTotal: 0,
        yearTotal: 0,
        totalTransactions: 0,
        growthPercentage: 0,
        currentMonthTransactionCount: 0,
      };
    },
    enabled: !!organizationId,
  });
};
