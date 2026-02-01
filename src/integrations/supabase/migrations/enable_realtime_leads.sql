-- Enable Realtime for leads so Leads Management table updates when status/assignee etc change (sama seperti tab live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
