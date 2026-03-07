-- Migration: Add feature_id to product_knowledge for master feature reference (self-reference)
-- Master rows: feature_id IS NULL. Data rows may set feature_id to reference a master row.

ALTER TABLE public.product_knowledge
    ADD COLUMN IF NOT EXISTS feature_id UUID REFERENCES public.product_knowledge(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_knowledge_feature_id
    ON public.product_knowledge(feature_id);

COMMENT ON COLUMN public.product_knowledge.feature_id IS
    'Optional FK to product_knowledge.id. Rows with feature_id IS NULL are master feature definitions; rows with feature_id set reference that master for pre-fill.';
