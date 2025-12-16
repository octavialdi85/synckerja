-- Migration: Add false_belief, false_belief_impact, and what_makes_them_stop columns to product_knowledge table
-- Description: Adds three new columns for storing false belief information and what makes customers stop
-- Created: 2025-02-01

ALTER TABLE public.product_knowledge 
ADD COLUMN IF NOT EXISTS false_belief TEXT,
ADD COLUMN IF NOT EXISTS false_belief_impact TEXT,
ADD COLUMN IF NOT EXISTS what_makes_them_stop TEXT;

-- Comments
COMMENT ON COLUMN public.product_knowledge.false_belief IS 
'Stores information about false beliefs customers may have';
COMMENT ON COLUMN public.product_knowledge.false_belief_impact IS 
'Stores the impact of false beliefs on customer behavior';
COMMENT ON COLUMN public.product_knowledge.what_makes_them_stop IS 
'Stores information about what makes customers stop or hesitate';

