import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';

/** Status values that mean the employee is NOT active (resigned, terminated, etc.). */
const NON_ACTIVE_STATUSES = new Set([
  'inactive',
  'terminated',
  'resigned',
  'pending removal',
  'pendingremoval',
]);

function isActiveEmployee(
  status: string | null | undefined,
  statusName: string | null | undefined,
  pendingRemoval: boolean | null | undefined
): boolean {
  if (pendingRemoval === true) return false;
  const fromField = (status ?? '').toString().trim().toLowerCase();
  const fromRelation = (statusName ?? '').toString().trim().toLowerCase();
  const effective = fromField || fromRelation || 'active';
  return !NON_ACTIVE_STATUSES.has(effective);
}

/**
 * Returns a Set of employee IDs that are active (not resigned, terminated, inactive, pending removal).
 * Use when building PIC/task view dropdowns so resigned employees are excluded.
 */
export function useActiveEmployeeIds(): Set<string> {
  const { organizationId } = useCurrentOrg();

  const { data: activeIds = new Set<string>() } = useQuery({
    queryKey: ['active-employee-ids', organizationId],
    queryFn: async () => {
      if (!organizationId) return new Set<string>();

      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, status, employee_status_id, pending_removal')
        .eq('organization_id', organizationId);

      if (empError) throw empError;

      const statusIds = [...new Set((employees || []).map((e: any) => e.employee_status_id).filter(Boolean))];
      const statusNameById = new Map<string, string>();

      if (statusIds.length > 0) {
        const { data: statuses } = await supabase
          .from('employee_statuses')
          .select('id, name')
          .in('id', statusIds);
        (statuses || []).forEach((s: any) => statusNameById.set(s.id, s.name || ''));
      }

      const ids = new Set<string>();
      (employees || []).forEach((emp: any) => {
        const statusName = emp.employee_status_id ? statusNameById.get(emp.employee_status_id) : null;
        if (isActiveEmployee(emp.status, statusName, emp.pending_removal)) {
          ids.add(emp.id);
        }
      });
      return ids;
    },
    enabled: !!organizationId,
  });

  return activeIds;
}
