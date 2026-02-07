-- Daily templates for /tools/daily-task: template + steps with Hari H or Prioritas mode.
-- Filter by department; Owner can see all templates in org.

CREATE TABLE IF NOT EXISTS public.daily_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  hari_h_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_template_organization
  ON public.daily_template(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_template_department
  ON public.daily_template(department_id);

COMMENT ON TABLE public.daily_template IS 'Daily task templates per org; filter by department; Owner sees all.';

ALTER TABLE public.daily_template ENABLE ROW LEVEL SECURITY;

-- Owner: see all templates in active org. Non-owner: see templates where department_id = own department OR department_id IS NULL.
CREATE POLICY "Users can view daily_template by org and department or owner"
  ON public.daily_template FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = daily_template.organization_id)
    AND (
      EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.organization_id = daily_template.organization_id AND ur.role = 'owner')
      OR daily_template.department_id IS NULL
      OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.organization_id = daily_template.organization_id AND e.department_id = daily_template.department_id)
    )
  );

CREATE POLICY "Users can insert daily_template in own org"
  ON public.daily_template FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = daily_template.organization_id));

CREATE POLICY "Users can update daily_template in own org"
  ON public.daily_template FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = daily_template.organization_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = daily_template.organization_id));

CREATE POLICY "Users can delete daily_template in own org"
  ON public.daily_template FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = daily_template.organization_id));

-- daily_template_steps
CREATE TABLE IF NOT EXISTS public.daily_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_template_id UUID NOT NULL REFERENCES public.daily_template(id) ON DELETE CASCADE,
  "order" INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT CHECK (schedule_type IS NULL OR schedule_type IN ('days_before_h', 'hari_h', 'working_days_after_h')),
  schedule_value INT,
  step_priority INT CHECK (step_priority IS NULL OR (step_priority >= 1 AND step_priority <= 5)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT daily_template_steps_schedule_or_priority CHECK (
    (schedule_type IS NOT NULL AND step_priority IS NULL) OR (schedule_type IS NULL AND step_priority IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_daily_template_steps_template
  ON public.daily_template_steps(daily_template_id);

COMMENT ON TABLE public.daily_template_steps IS 'Steps of a daily template; either schedule_type (Hari H) or step_priority (Prioritas 1-5).';

ALTER TABLE public.daily_template_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily_template_steps via template org"
  ON public.daily_template_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.daily_template dt
    JOIN profiles p ON p.active_organization_id = dt.organization_id AND p.user_id = auth.uid()
    WHERE dt.id = daily_template_steps.daily_template_id
    AND (
      EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.organization_id = dt.organization_id AND ur.role = 'owner')
      OR dt.department_id IS NULL
      OR dt.department_id IN (SELECT e.department_id FROM employees e WHERE e.user_id = auth.uid() AND e.organization_id = dt.organization_id)
    )
  ));

CREATE POLICY "Users can insert daily_template_steps via template"
  ON public.daily_template_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_template dt
    JOIN profiles p ON p.active_organization_id = dt.organization_id AND p.user_id = auth.uid()
    WHERE dt.id = daily_template_steps.daily_template_id
  ));

CREATE POLICY "Users can update daily_template_steps via template"
  ON public.daily_template_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.daily_template dt
    JOIN profiles p ON p.active_organization_id = dt.organization_id AND p.user_id = auth.uid()
    WHERE dt.id = daily_template_steps.daily_template_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_template dt
    JOIN profiles p ON p.active_organization_id = dt.organization_id AND p.user_id = auth.uid()
    WHERE dt.id = daily_template_steps.daily_template_id
  ));

CREATE POLICY "Users can delete daily_template_steps via template"
  ON public.daily_template_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.daily_template dt
    JOIN profiles p ON p.active_organization_id = dt.organization_id AND p.user_id = auth.uid()
    WHERE dt.id = daily_template_steps.daily_template_id
  ));

-- Add daily_template_id to daily_tasks (one template per task)
ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS daily_template_id UUID REFERENCES public.daily_template(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_tasks_daily_template_id
  ON public.daily_tasks(daily_template_id);

COMMENT ON COLUMN public.daily_tasks.daily_template_id IS 'Template used for this task; one template per task.';

-- Add schedule_type, schedule_value to task_steps (for Hari H copy from template)
ALTER TABLE public.task_steps
  ADD COLUMN IF NOT EXISTS schedule_type TEXT,
  ADD COLUMN IF NOT EXISTS schedule_value INT;

COMMENT ON COLUMN public.task_steps.schedule_type IS 'From daily template Hari H: days_before_h, hari_h, working_days_after_h.';
COMMENT ON COLUMN public.task_steps.schedule_value IS 'From daily template Hari H; used with schedule_type.';
