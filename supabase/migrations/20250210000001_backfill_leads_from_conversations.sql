-- Backfill leads from existing whatsapp_conversations and email_conversations.
-- Auto-insert only runs when a NEW conversation is created in the webhook; existing rows never got a lead.

-- Default status: Open or Unread (webhook uses "Open", DB may have "Unread")
DO $$
DECLARE
  default_status_id UUID;
  conv RECORD;
  conv_ticket_id TEXT;
  conv_client TEXT;
  conv_title TEXT;
  conv_source TEXT;
BEGIN
  SELECT id INTO default_status_id
  FROM lead_statuses
  WHERE name IN ('Open', 'Unread') AND is_active = TRUE
  LIMIT 1;

  IF default_status_id IS NULL THEN
    RAISE NOTICE 'No Open/Unread status in lead_statuses, skip backfill';
    RETURN;
  END IF;

  -- WhatsApp/Instagram conversations (ticket_id is GENERATED WA-xxx)
  FOR conv IN
    SELECT w.id, w.organization_id, w.channel, w.customer_name, w.customer_wa_id, w.last_message_body, w.ticket_id AS conv_ticket_id
    FROM whatsapp_conversations w
    WHERE NOT EXISTS (
      SELECT 1 FROM leads l
      WHERE l.ticket_id = w.ticket_id AND l.organization_id = w.organization_id
    )
  LOOP
    conv_ticket_id := conv.conv_ticket_id;
    conv_client := NULLIF(TRIM(COALESCE(conv.customer_name, conv.customer_wa_id, '')), '');
    conv_client := COALESCE(conv_client, CASE WHEN LOWER(COALESCE(conv.channel, '')) = 'instagram' THEN 'Instagram' ELSE 'WhatsApp' END);
    conv_title := LEFT(REGEXP_REPLACE(COALESCE(conv.last_message_body, ''), '<[^>]*>', ' ', 'g'), 100);
    conv_title := COALESCE(NULLIF(TRIM(conv_title), ''), CASE WHEN LOWER(COALESCE(conv.channel, '')) = 'instagram' THEN 'Instagram' ELSE 'WhatsApp' END);
    conv_source := CASE WHEN LOWER(COALESCE(conv.channel, '')) = 'instagram' THEN 'Instagram' ELSE 'WhatsApp' END;

    INSERT INTO leads (
      ticket_id, client, title, category, created_by, created_by_name, assignee,
      status_id, organization_id, source, services, followup, phone_number
    ) VALUES (
      conv_ticket_id,
      conv_client,
      conv_title,
      '',
      '00000000-0000-0000-0000-000000000000'::UUID,
      'System',
      '',
      default_status_id,
      conv.organization_id,
      conv_source,
      NULL,
      0,
      CASE WHEN LOWER(COALESCE(conv.channel, '')) = 'whatsapp' AND conv.customer_wa_id IS NOT NULL AND TRIM(conv.customer_wa_id) <> '' THEN TRIM(conv.customer_wa_id) ELSE NULL END
    )
    ON CONFLICT (ticket_id) DO NOTHING;
  END LOOP;

  -- Email conversations (ticket_id = EMAIL- + first 8 chars of id)
  FOR conv IN
    SELECT c.id, c.organization_id, c.from_email, c.from_display_name, c.thread_subject
    FROM email_conversations c
    WHERE NOT EXISTS (
      SELECT 1 FROM leads l
      WHERE l.ticket_id = 'EMAIL-' || UPPER(SUBSTRING(REPLACE(c.id::TEXT, '-', ''), 1, 8))
        AND l.organization_id = c.organization_id
    )
  LOOP
    conv_ticket_id := 'EMAIL-' || UPPER(SUBSTRING(REPLACE(conv.id::TEXT, '-', ''), 1, 8));
    conv_client := NULLIF(TRIM(COALESCE(conv.from_display_name, conv.from_email, '')), '');
    conv_client := COALESCE(conv_client, 'Email');
    conv_title := LEFT(REGEXP_REPLACE(COALESCE(conv.thread_subject, ''), '<[^>]*>', ' ', 'g'), 100);
    conv_title := COALESCE(NULLIF(TRIM(conv_title), ''), 'Email');

    INSERT INTO leads (
      ticket_id, client, title, category, created_by, created_by_name, assignee,
      status_id, organization_id, source, services, followup
    ) VALUES (
      conv_ticket_id,
      conv_client,
      conv_title,
      '',
      '00000000-0000-0000-0000-000000000000'::UUID,
      'System',
      '',
      default_status_id,
      conv.organization_id,
      'Email',
      NULL,
      0
    )
    ON CONFLICT (ticket_id) DO NOTHING;
  END LOOP;
END $$;
