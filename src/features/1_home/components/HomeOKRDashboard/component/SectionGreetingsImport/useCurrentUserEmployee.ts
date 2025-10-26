
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/1-login/contexts/AuthContext';
import { useCurrentOrg } from '../../hooks/useCurrentOrg';

const isDev = import.meta.env.DEV;
const shouldLog = isDev && Math.random() < 0.02; // Only log 2% in dev

export const useCurrentUserEmployee = () => {
  const { user } = useAuth();
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['current-user-employee', user?.id, organizationId],
    queryFn: async () => {
      if (!user?.id || !organizationId) {
        return null;
      }

      // Get the employee record for the current organization
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .or('status.is.null,status.eq.active') // Handle both null and active status
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (employeeError) {
        console.error('❌ Error fetching employee:', employeeError);
        throw employeeError;
      }

      if (!employee) {
        return null;
      }

      // Get related data
      const [departmentData, jobPositionData, profileData] = await Promise.all([
        employee.department_id ? supabase
          .from('departments')
          .select('name')
          .eq('id', employee.department_id)
          .maybeSingle() : Promise.resolve({ data: null }),
        employee.job_position_id ? supabase
          .from('job_positions')
          .select('name')
          .eq('id', employee.job_position_id)
          .maybeSingle() : Promise.resolve({ data: null }),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      const result = {
        ...employee,
        department_name: departmentData.data?.name || null,
        job_position_name: jobPositionData.data?.name || null,
        profile_name: profileData.data?.full_name || employee.full_name || 'User',
        profile_photo_url: employee.profile_photo_url // Ensure this is the primary photo URL
      };

      if (shouldLog) {
        console.log('✅ useCurrentUserEmployee:', result.full_name, 'in', result.department_name);
      }
      
      return result;
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 30 * 1000, // 30 seconds - much shorter for debugging
    gcTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
};
