-- Update table comment: max 5 WhatsApp accounts per organization (enforced in app).
COMMENT ON TABLE public.organization_whatsapp_accounts IS 'WhatsApp Business API accounts per organization. Max 5 per org (enforced in app).';
