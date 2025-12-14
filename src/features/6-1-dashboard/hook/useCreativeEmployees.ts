
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface CreativeEmployee {
  id: string;
  full_name: string;
  email: string;
  user_id?: string;
  job_position_name?: string;
  job_position_id?: string;
}

export const useCreativeEmployees = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['creative-employees', organizationId],
    queryFn: async (): Promise<CreativeEmployee[]> => {
      if (!organizationId) {
        console.log('No organization ID available');
        return [];
      }

      console.log('🔍 Fetching Creative employees for organization:', organizationId);

      try {
        // Get all employees from the organization (removing department filtering)
        const { data: employees, error } = await supabase
          .from('employees')
          .select(`
            id, 
            full_name, 
            email, 
            user_id,
            job_position_id
          `)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('full_name');

        if (error) {
          console.error('❌ Error fetching employees:', error);
          return [];
        }

        const safeEmployees = Array.isArray(employees) ? employees : [];
        console.log('✅ All employees fetched for Creative role:', safeEmployees.length);
        console.log('📋 Raw employees data:', safeEmployees.map(emp => ({
          id: emp.id,
          name: emp.full_name,
          email: emp.email,
          user_id: emp.user_id,
          job_position_id: emp.job_position_id
        })));
        
        // Get job positions for these employees
        const employeesWithPositions = await Promise.all(
          safeEmployees.map(async (emp) => {
            let jobPositionName = 'Unknown Position';
            
            if (emp.job_position_id) {
              const { data: jobPosition } = await supabase
                .from('job_positions')
                .select('name')
                .eq('id', emp.job_position_id)
                .single();
              
              if (jobPosition) {
                jobPositionName = jobPosition.name;
              }
            }
            
            return {
              id: emp.id,
              full_name: emp.full_name,
              email: emp.email,
              user_id: emp.user_id,
              job_position_name: jobPositionName,
              job_position_id: emp.job_position_id
            };
          })
        );

        console.log('🎯 Final creative employees with positions:', employeesWithPositions.map(emp => ({
          id: emp.id,
          name: emp.full_name,
          email: emp.email,
          user_id: emp.user_id,
          job_position_name: emp.job_position_name
        })));

        return employeesWithPositions;
      } catch (error) {
        console.error('Unexpected error in useCreativeEmployees:', error);
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Disabled to prevent reload when switching windows
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    retry: 3,
    retryDelay: 1000,
  });
};

