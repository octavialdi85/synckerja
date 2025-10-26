import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface AvailableEmployee {
  id: string;
  full_name: string;
  email: string;
}

export const useAvailableEmployees = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['available-employees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('Fetching available employees for organization:', organizationId);

      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, status')
        .eq('organization_id', organizationId)
        .or('status.eq.active,status.is.null') // Include both active and null status
        .order('full_name');

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      console.log('Available employees fetched:', data?.length || 0, data);
      return (data as AvailableEmployee[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};




