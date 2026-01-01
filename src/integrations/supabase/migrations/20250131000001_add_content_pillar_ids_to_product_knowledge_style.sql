-- Migration: Add content_pillar_ids column to product_knowledge_style table
-- Description: Adds a content_pillar_ids array field to store multiple content pillar IDs that this style applies to
-- Created: 2025-01-31

ALTER TABLE public.product_knowledge_style
ADD COLUMN IF NOT EXISTS content_pillar_ids UUID[] DEFAULT '{}';

-- Create index for better query performance when filtering by pillar IDs
CREATE INDEX IF NOT EXISTS idx_product_knowledge_style_content_pillar_ids 
    ON public.product_knowledge_style USING GIN(content_pillar_ids);

COMMENT ON COLUMN public.product_knowledge_style.content_pillar_ids IS 'Array of content pillar IDs that this style applies to. Empty array means the style applies to all pillars (universal style)';


















