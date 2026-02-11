-- Backfill leads.created_by_name from connected account (WhatsApp/Instagram/Email) where it is currently 'System'.
-- Only touches rows with created_by = zero UUID (auto-created from channel).

-- 1) WhatsApp: from organization_whatsapp_accounts
UPDATE leads l
SET created_by_name = COALESCE(
  NULLIF(TRIM(a.whatsapp_business_name), ''),
  NULLIF(TRIM(a.display_phone_number), ''),
  a.phone_number_id,
  'WhatsApp'
)
FROM whatsapp_conversations w
JOIN organization_whatsapp_accounts a
  ON a.organization_id = w.organization_id
 AND a.phone_number_id = w.phone_number_id
 AND a.is_active = true
WHERE l.ticket_id = w.ticket_id
  AND l.organization_id = w.organization_id
  AND COALESCE(w.channel, 'whatsapp') = 'whatsapp'
  AND l.created_by_name = 'System'
  AND l.created_by = '00000000-0000-0000-0000-000000000000'::UUID;

-- 2) Instagram: from organization_meta_config
UPDATE leads l
SET created_by_name = COALESCE(
  NULLIF(TRIM(meta.instagram_username), ''),
  NULLIF(TRIM(meta.instagram_name), ''),
  'Instagram'
)
FROM whatsapp_conversations w
JOIN organization_meta_config meta
  ON meta.organization_id = w.organization_id
 AND meta.is_active = true
WHERE l.ticket_id = w.ticket_id
  AND l.organization_id = w.organization_id
  AND COALESCE(w.channel, 'whatsapp') = 'instagram'
  AND l.created_by_name = 'System'
  AND l.created_by = '00000000-0000-0000-0000-000000000000'::UUID;

-- 3) Email: from organization_email_connections
UPDATE leads l
SET created_by_name = COALESCE(
  NULLIF(TRIM(conn.email_address), ''),
  NULLIF(TRIM(conn.inbound_address), ''),
  'Email'
)
FROM email_conversations c
JOIN organization_email_connections conn
  ON conn.id = c.email_connection_id
 AND conn.organization_id = c.organization_id
WHERE l.ticket_id = 'EMAIL-' || UPPER(SUBSTRING(REPLACE(c.id::TEXT, '-', ''), 1, 8))
  AND l.organization_id = c.organization_id
  AND l.created_by_name = 'System'
  AND l.created_by = '00000000-0000-0000-0000-000000000000'::UUID;

-- 4) Fallback: any remaining System by source column
UPDATE leads
SET created_by_name = CASE source
  WHEN 'WhatsApp' THEN 'WhatsApp'
  WHEN 'Email' THEN 'Email'
  WHEN 'Instagram' THEN 'Instagram'
  ELSE created_by_name
END
WHERE created_by_name = 'System'
  AND created_by = '00000000-0000-0000-0000-000000000000'::UUID;
