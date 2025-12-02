-- Add plan_date column to daily_tasks table
-- plan_date stores the planned month for the task (always first day of month, e.g., 2024-01-01 for January 2024)
ALTER TABLE daily_tasks 
ADD COLUMN plan_date DATE;

-- Add index for better query performance when filtering by plan_date
CREATE INDEX idx_daily_tasks_plan_date ON daily_tasks(plan_date);

-- Composite index for organization_id + plan_date filtering (common query pattern)
CREATE INDEX idx_daily_tasks_org_plan_date ON daily_tasks(organization_id, plan_date);

-- Add comment for documentation
COMMENT ON COLUMN daily_tasks.plan_date IS 'Planned month for the task (always first day of month, e.g., 2024-01-01 for January 2024). Used for filtering tasks by planned month.';

