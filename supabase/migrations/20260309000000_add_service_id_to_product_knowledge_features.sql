-- Migration: Parent product_knowledge_features with Service
-- So in the main table, when a Service is selected, only features linked to that service are shown.

ALTER TABLE public.product_knowledge_features
    ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_knowledge_features_service_id
    ON public.product_knowledge_features(service_id);

COMMENT ON COLUMN public.product_knowledge_features.service_id IS
    'Optional FK to services. When set, this feature is only available when the row has the same service_id.';
