-- Enable Realtime for whatsapp_messages so clients can subscribe to INSERT/UPDATE
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
