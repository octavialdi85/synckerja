-- Allow NULL manager_id for non-owner employees (unassigned in hierarchy).
-- UI can clear direct manager; org chart may show orphans (existing app warnings).

CREATE OR REPLACE FUNCTION public.validate_employee_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_owner_user_id UUID;
  v_is_employee_owner BOOLEAN;
  v_mgr RECORD;
  v_mgr_is_owner BOOLEAN;
  cur UUID;
  steps INT := 0;
BEGIN
  SELECT o.user_id INTO v_org_owner_user_id
  FROM public.organizations o
  WHERE o.id = NEW.organization_id;

  v_is_employee_owner := (
    v_org_owner_user_id IS NOT NULL
    AND NEW.user_id IS NOT NULL
    AND NEW.user_id = v_org_owner_user_id
  );

  IF v_is_employee_owner THEN
    IF NEW.manager_id IS NOT NULL THEN
      RAISE EXCEPTION 'Organization owner cannot have a manager (manager_id must be null)';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.manager_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_mgr FROM public.employees WHERE id = NEW.manager_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manager not found for manager_id=%', NEW.manager_id;
  END IF;

  IF v_mgr.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Manager must belong to the same organization';
  END IF;

  IF NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'Employee cannot be their own manager';
  END IF;

  v_mgr_is_owner := (
    v_org_owner_user_id IS NOT NULL
    AND v_mgr.user_id IS NOT NULL
    AND v_mgr.user_id = v_org_owner_user_id
  );

  IF NOT v_mgr_is_owner THEN
    IF NEW.department_id IS NULL OR v_mgr.department_id IS DISTINCT FROM NEW.department_id THEN
      RAISE EXCEPTION 'Manager must be in the same department unless the manager is the organization owner';
    END IF;
  END IF;

  cur := NEW.manager_id;
  WHILE cur IS NOT NULL AND steps < 10000 LOOP
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'Manager assignment would create a cycle';
    END IF;
    SELECT e.manager_id INTO cur FROM public.employees e WHERE e.id = cur;
    steps := steps + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.employees.manager_id IS 'Direct manager (employees.id). NULL for organization owner (required) or when not yet assigned.';
