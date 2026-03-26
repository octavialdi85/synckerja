create or replace function public.is_user_in_org(org_id uuid)
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.employees e
    left join public.employee_statuses es on es.id = e.employee_status_id
    where e.user_id = auth.uid()
      and e.organization_id = org_id
      and coalesce(e.pending_removal, false) = false
      and lower(coalesce(es.name, 'active')) in ('active', 'probation')
  );
$function$;
