import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface EmployeeData {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  profile_photo_url?: string;
  photo_url?: string;
  status?: string;
  join_date?: string;
  organization_id: string;
  departments?: { name: string };
  job_positions?: { name: string };
}

export const useEmployees = () => {
  const { organizationId } = useCurrentOrg();

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['reprimandEmployees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('🔍 Fetching employees for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          full_name,
          email,
          employee_id,
          profile_photo_url,
          photo_url,
          status,
          join_date,
          organization_id,
          departments ( name ),
          job_positions ( name )
        `)
        .eq('organization_id', organizationId)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw error;
      }
      
      console.log('✅ Employees fetched:', data?.length || 0);
      return data as EmployeeData[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    employees,
    isLoading,
    error,
  };
};
