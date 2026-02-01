-- Ticket ID untuk lead WhatsApp: disimpan di DB, format WA-XXXXXXXX (8 karakter pertama UUID tanpa strip, uppercase).
-- Menggunakan GENERATED column agar otomatis terisi dari id dan konsisten untuk row baru maupun lama.

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ticket_id TEXT GENERATED ALWAYS AS (
    'WA-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
  ) STORED;

COMMENT ON COLUMN public.whatsapp_conversations.ticket_id IS 'Ticket ID unik untuk lead WhatsApp (WA-XXXXXXXX), derived dari id.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_ticket_id
  ON public.whatsapp_conversations(ticket_id);
