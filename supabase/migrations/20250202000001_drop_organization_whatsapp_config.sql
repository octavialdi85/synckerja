-- Optional: run AFTER verifying live chat works with organization_meta_config.
-- Drops the old table. All code must already use organization_meta_config.
DROP TRIGGER IF EXISTS trigger_organization_whatsapp_config_updated_at ON public.organization_whatsapp_config;
DROP TABLE IF EXISTS public.organization_whatsapp_config;
