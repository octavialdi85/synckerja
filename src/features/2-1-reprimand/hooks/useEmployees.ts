import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { isEmployeeActive } from '@/features/2-1-employees/utils/employeeUtils';

export interface EmployeeData {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  profile_photo_url?: string;
  photo_url?: string;
  status?: string;
  employee_status_id?: string | null;
  employee_status_name?: string | null;
  pending_removal?: boolean | null;
  join_date?: string;
  organization_id: string;
  departments?: { name: string };
  job_positions?: { name: string };
}

export const useEmployees = () => {
  const { organizationId } = useCurrentOrg();

  const { data: employees = [], isLoading, error, refetch } = useQuery({
    queryKey: ['reprimandEmployees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: raw, error } = await supabase
        .from('employees')
        .select(`
          id,
          full_name,
          email,
          employee_id,
          profile_photo_url,
          photo_url,
          employee_status_id,
          pending_removal,
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

      const list = (raw ?? []) as (EmployeeData & { employee_status_id?: string | null })[];
      const statusIds = [...new Set(list.map((e) => e.employee_status_id).filter(Boolean))] as string[];
      const statusNameById = new Map<string, string>();
      if (statusIds.length > 0) {
        const { data: statusRows } = await supabase
          .from('employee_statuses')
          .select('id, name')
          .in('id', statusIds);
        (statusRows ?? []).forEach((s: { id: string; name: string }) => statusNameById.set(s.id, s.name ?? ''));
      }

      const withStatusName: EmployeeData[] = list.map((e) => ({
        ...e,
        employee_status_name: e.employee_status_id ? statusNameById.get(e.employee_status_id) ?? null : null,
      }));

      const activeOnly = withStatusName.filter((e) => isEmployeeActive(e));
      return activeOnly;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    employees,
    isLoading,
    error,
    refetch,
  };
};
