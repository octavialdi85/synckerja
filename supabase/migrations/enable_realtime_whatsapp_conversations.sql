-- Enable Realtime for whatsapp_conversations so list updates when last_message_at/last_message_body change
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
