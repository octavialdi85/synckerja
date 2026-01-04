
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getOptimizedCurrentOrganizationId } from './useOptimizedCurrentOrg';

export type Employee = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  photo_url?: string;
  department_id?: string;
  job_position_id?: string;
  job_level_id?: string;
  branch_id?: string;
  employee_status_id?: string;
  status?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  join_date?: string;
  employee_id?: string;
  // Additional fields from joins
  department_name?: string;
  job_position_name?: string;
  job_level_name?: string;
  branch_name?: string;
  employee_status_name?: string;
  is_organization_owner?: boolean;
  pending_removal?: boolean;
  pending_removal_reason?: string | null;
  pending_removal_date?: string | null;
};

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees-optimized'],
    queryFn: async () => {
      console.log('Fetching employees with optimized queries...');

      const { organizationId } = await getOptimizedCurrentOrganizationId();
      console.log('Current organization ID:', organizationId);

      // First get employees without JOINs to avoid relation errors
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      // Get organization data once for ownership check
      const { data: organization } = await supabase
        .from('organizations')
        .select('user_id')
        .eq('id', organizationId)
        .single();

      // Get related data separately for each employee
      const enrichedEmployees = await Promise.all(
        (employees || []).map(async (emp: any) => {
          const isOwner = emp.user_id && organization && emp.user_id === (organization as any)?.user_id;
          
          // Get related data separately to avoid JOIN issues
          const [departmentData, jobPositionData, jobLevelData, branchData, employeeStatusData] = await Promise.all([
            emp.department_id ? supabase.from('departments').select('name').eq('id', emp.department_id).maybeSingle() : Promise.resolve({ data: null }),
            emp.job_position_id ? supabase.from('job_positions').select('name').eq('id', emp.job_position_id).maybeSingle() : Promise.resolve({ data: null }),
            emp.job_level_id ? supabase.from('job_levels').select('name').eq('id', emp.job_level_id).maybeSingle() : Promise.resolve({ data: null }),
            emp.branch_id ? supabase.from('branches').select('name').eq('id', emp.branch_id).maybeSingle() : Promise.resolve({ data: null }),
            emp.employee_status_id ? supabase.from('employee_statuses').select('name').eq('id', emp.employee_status_id).maybeSingle() : Promise.resolve({ data: null })
          ]);
          
          // Enhanced logging for status debugging
          const statusName = employeeStatusData.data?.name;
          const rawStatus = emp.status;
          console.log(`Employee ${emp.full_name}:`, {
            raw_status: rawStatus,
            employee_status_id: emp.employee_status_id,
            employee_status_name: statusName,
            pending_removal: emp.pending_removal,
            final_status_name: statusName || rawStatus || null
          });
          
          return {
            ...emp,
            is_organization_owner: isOwner,
            // Use consistent naming and proper fallbacks
            department_name: departmentData.data?.name || null,
            job_position_name: jobPositionData.data?.name || null,
            job_level_name: jobLevelData.data?.name || null,
            branch_name: branchData.data?.name || null,
            // IMPORTANT: Prioritize employee_status_name from employee_statuses table, fallback to status field
            // This ensures we use the same data source as the detail page
            employee_status_name: statusName || rawStatus || null,
            // Ensure pending_removal fields are included
            pending_removal: emp.pending_removal ?? false,
            pending_removal_reason: emp.pending_removal_reason || null,
            pending_removal_date: emp.pending_removal_date || null,
          } as Employee;
        })
      );

      console.log('Optimized employees fetched:', enrichedEmployees.length);
      return enrichedEmployees;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for employee data
    gcTime: 20 * 60 * 1000, // 20 minutes cache
  });
};
