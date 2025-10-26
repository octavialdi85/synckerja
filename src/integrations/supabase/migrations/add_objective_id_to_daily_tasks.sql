-- Add objective_id column to daily_tasks table to link activities with objectives
ALTER TABLE daily_tasks 
ADD COLUMN objective_id UUID REFERENCES individual_objectives(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_daily_tasks_objective_id ON daily_tasks(objective_id);

-- Add comment for documentation
COMMENT ON COLUMN daily_tasks.objective_id IS 'Links daily task/activity to an objective for OKR tracking';









