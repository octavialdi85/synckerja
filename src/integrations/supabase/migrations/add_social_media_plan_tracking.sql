-- Add social_media_plan_id column to task_steps table to link task steps with social media plans
ALTER TABLE task_steps 
ADD COLUMN IF NOT EXISTS social_media_plan_id UUID REFERENCES social_media_plans(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_task_steps_social_media_plan_id 
ON task_steps(social_media_plan_id) 
WHERE social_media_plan_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN task_steps.social_media_plan_id IS 'Links task step to social media plan for automatic Google Drive link synchronization';

-- Add is_auto_synced column to task_step_links table to track auto-synced links
ALTER TABLE task_step_links
ADD COLUMN IF NOT EXISTS is_auto_synced BOOLEAN DEFAULT FALSE;

-- Add source_social_media_plan_id column to task_step_links table to track source plan
ALTER TABLE task_step_links
ADD COLUMN IF NOT EXISTS source_social_media_plan_id UUID REFERENCES social_media_plans(id) ON DELETE SET NULL;

-- Add index for better query performance when checking existing auto-synced links
CREATE INDEX IF NOT EXISTS idx_task_step_links_step_plan 
ON task_step_links(task_step_id, source_social_media_plan_id) 
WHERE is_auto_synced = true AND source_social_media_plan_id IS NOT NULL;

-- Add index for source_social_media_plan_id
CREATE INDEX IF NOT EXISTS idx_task_step_links_source_plan 
ON task_step_links(source_social_media_plan_id) 
WHERE source_social_media_plan_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN task_step_links.is_auto_synced IS 'Indicates if this link was automatically synced from a social media plan';
COMMENT ON COLUMN task_step_links.source_social_media_plan_id IS 'References the social media plan that this link was synced from';

