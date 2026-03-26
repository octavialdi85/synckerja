create or replace function public.get_organization_employee_count(org_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  employee_count integer;
begin
  -- Count payroll-eligible active employees
  -- (active + probation, excluding pending_removal)
  select count(*)::integer into employee_count
  from public.employees e
  left join public.employee_statuses es on es.id = e.employee_status_id
  where e.organization_id = org_id
    and coalesce(e.pending_removal, false) = false
    and lower(coalesce(es.name, 'active')) in ('active', 'probation');

  return coalesce(employee_count, 0);
end;
$function$;
