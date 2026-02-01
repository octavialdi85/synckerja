-- Add name_status (display name verification: APPROVED / DECLINED) to organization_whatsapp_config
ALTER TABLE public.organization_whatsapp_config
ADD COLUMN IF NOT EXISTS name_status TEXT;

COMMENT ON COLUMN public.organization_whatsapp_config.name_status IS 'Meta display name verification: APPROVED or DECLINED';
