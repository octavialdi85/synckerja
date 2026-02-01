-- Tampilan reply seperti WhatsApp: tipe pesan (image/video/document/text) dan nama pengirim
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_type TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_sender TEXT;

COMMENT ON COLUMN public.whatsapp_messages.reply_to_message_type IS 'Tipe pesan yang dibalas: text, image, video, document, audio';
COMMENT ON COLUMN public.whatsapp_messages.reply_to_sender IS 'Nama pengirim pesan yang dibalas (untuk tampilan reply seperti WhatsApp)';
