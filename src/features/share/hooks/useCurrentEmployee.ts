
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { useCurrentOrg } from './useCurrentOrg';
import { logger } from '@/config/logger';

export const useCurrentEmployee = () => {
  const { user } = useCurrentUser();
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['current-employee', user?.id, organizationId],
    queryFn: async () => {
      if (!user?.id || !organizationId) {
        logger.userData('useCurrentEmployee: Missing user or organization ID - user:', user?.id, 'org:', organizationId);
        return null;
      }

      logger.userData('useCurrentEmployee: Fetching employee for user:', user.id, 'org:', organizationId);

      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments(id, name),
          job_positions(id, name),
          job_levels(id, name)
        `)
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('useCurrentEmployee: Error fetching employee:', error);
        return null;
      }

      logger.userData('useCurrentEmployee: Employee data fetched successfully:', data?.id);
      return data;
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
