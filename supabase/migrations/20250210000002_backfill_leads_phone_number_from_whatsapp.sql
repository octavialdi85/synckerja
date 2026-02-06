-- Backfill leads.phone_number from whatsapp_conversations.customer_wa_id when source = WhatsApp.
UPDATE leads l
SET phone_number = w.customer_wa_id
FROM whatsapp_conversations w
WHERE l.ticket_id = w.ticket_id
  AND l.organization_id = w.organization_id
  AND l.source = 'WhatsApp'
  AND (l.phone_number IS NULL OR l.phone_number = '')
  AND w.customer_wa_id IS NOT NULL
  AND TRIM(w.customer_wa_id) <> '';
