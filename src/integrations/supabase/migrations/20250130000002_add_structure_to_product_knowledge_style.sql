-- Migration: Add structure column to product_knowledge_style table
-- Description: Adds a structure field to store style structure information
-- Created: 2025-01-30

ALTER TABLE public.product_knowledge_style
ADD COLUMN IF NOT EXISTS structure TEXT;

COMMENT ON COLUMN public.product_knowledge_style.structure IS 'Structure definition for the style';

