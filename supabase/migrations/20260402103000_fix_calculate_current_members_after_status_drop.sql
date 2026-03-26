create or replace function public.calculate_current_members(org_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  member_count integer;
begin
  select count(*)::integer into member_count
  from public.employees e
  left join public.employee_statuses es on es.id = e.employee_status_id
  where e.organization_id = org_id
    and coalesce(e.pending_removal, false) = false
    and lower(coalesce(es.name, 'active')) in ('active', 'probation');

  return coalesce(member_count, 0);
end;
$function$;
