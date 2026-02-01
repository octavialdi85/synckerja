-- Simpan konteks balas agar di UI bisa tampilkan "Balas: [pesan yang dibalas]"
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS reply_to_wa_message_id TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_body TEXT;

COMMENT ON COLUMN public.whatsapp_messages.reply_to_wa_message_id IS 'WhatsApp message ID yang dibalas (context.reply_to)';
COMMENT ON COLUMN public.whatsapp_messages.reply_to_body IS 'Teks/body pesan yang dibalas, untuk ditampilkan di bubble agar tidak bingung';
