-- Store resolved media URL for preview/thumbnail (outbound: Supabase Storage URL; inbound: our storage after downloading from Meta)
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT;

COMMENT ON COLUMN public.whatsapp_messages.media_url IS 'Public URL for image/video/document preview (outbound: storage link we sent; inbound: our storage after downloading from Meta)';
