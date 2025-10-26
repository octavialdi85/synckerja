import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from './useCurrentOrg';

export const useEmployeeCount = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['employee-count', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching employee count:', error);
        throw error;
      }

      return data?.length || 0;
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};