-- Fix RLS Policy for task_steps_to_steps table
-- This will allow users to view sub-steps properly

-- First, check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'task_steps_to_steps';

-- Enable RLS if not enabled
ALTER TABLE task_steps_to_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sub-steps in their organization" ON task_steps_to_steps;
DROP POLICY IF EXISTS "Users can insert sub-steps in their organization" ON task_steps_to_steps;
DROP POLICY IF EXISTS "Users can update sub-steps in their organization" ON task_steps_to_steps;
DROP POLICY IF EXISTS "Users can delete sub-steps in their organization" ON task_steps_to_steps;

-- Create SELECT policy (view sub-steps)
CREATE POLICY "Users can view sub-steps in their organization"
ON task_steps_to_steps
FOR SELECT
USING (
  -- Allow if user's organization matches
  organization_id IN (
    SELECT organization_id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
);

-- Create INSERT policy (add sub-steps)
CREATE POLICY "Users can insert sub-steps in their organization"
ON task_steps_to_steps
FOR INSERT
WITH CHECK (
  -- Allow if user's organization matches
  organization_id IN (
    SELECT organization_id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
);

-- Create UPDATE policy (edit sub-steps)
CREATE POLICY "Users can update sub-steps in their organization"
ON task_steps_to_steps
FOR UPDATE
USING (
  -- Allow if user's organization matches
  organization_id IN (
    SELECT organization_id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Ensure they don't change org_id to different org
  organization_id IN (
    SELECT organization_id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
);

-- Create DELETE policy (delete sub-steps)
CREATE POLICY "Users can delete sub-steps in their organization"
ON task_steps_to_steps
FOR DELETE
USING (
  -- Allow if user's organization matches
  organization_id IN (
    SELECT organization_id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'task_steps_to_steps';


