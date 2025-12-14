
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface DigitalMarketingEmployee {
  id: string;
  full_name: string;
  email: string;
  job_position_name?: string;
  job_position_id?: string;
  user_id?: string;
}

export const useDigitalMarketingEmployees = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['digital-marketing-employees', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('🚫 No organization ID available');
        return [];
      }

      console.log('🔄 Fetching ALL employees for organization:', organizationId);

      // Query yang lebih sederhana tanpa filter job position untuk memastikan semua employee ter-fetch
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          full_name,
          email,
          user_id,
          job_position_id,
          job_positions(name),
          status,
          employee_status_id
        `)
        .eq('organization_id', organizationId)
        .order('full_name');

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw error;
      }

      console.log('📊 Raw employee data from database:', data);

      // Filter hanya employee yang aktif (status active atau null, atau employee_status_id tidak null)
      const activeEmployees = (data || []).filter(emp => {
        const isActive = !emp.status || emp.status === 'active' || emp.employee_status_id;
        console.log(`👤 Employee ${emp.full_name}: status=${emp.status}, employee_status_id=${emp.employee_status_id}, isActive=${isActive}`);
        return isActive;
      });

      console.log('✅ Active employees found:', activeEmployees.length);

      const employees = activeEmployees.map(employee => ({
        id: employee.id,
        full_name: employee.full_name,
        email: employee.email,
        job_position_name: employee.job_positions?.name || 'Unknown Position',
        job_position_id: employee.job_position_id,
        user_id: employee.user_id
      })) as DigitalMarketingEmployee[];

      console.log('👥 Final processed employees:', employees.map(emp => ({ 
        name: emp.full_name, 
        email: emp.email,
        user_id: emp.user_id,
        job_position: emp.job_position_name 
      })));

      return employees;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Disabled to prevent reload when switching windows
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    retry: 2,
  });
};

