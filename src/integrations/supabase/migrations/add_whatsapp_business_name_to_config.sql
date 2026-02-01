-- Add WhatsApp Business Name to organization_whatsapp_config
ALTER TABLE public.organization_whatsapp_config
ADD COLUMN IF NOT EXISTS whatsapp_business_name TEXT;

COMMENT ON COLUMN public.organization_whatsapp_config.whatsapp_business_name IS 'Display name of the WhatsApp Business as shown in the app';
