-- Add Nomor Telepon (phone_number) and Email to client profile tables and leads table.

-- whatsapp_conversation_client_profiles
ALTER TABLE public.whatsapp_conversation_client_profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.whatsapp_conversation_client_profiles.phone_number IS 'Client phone number (Nomor Telepon)';
COMMENT ON COLUMN public.whatsapp_conversation_client_profiles.email IS 'Client email';

-- lead_client_profiles (use same column names for consistency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_client_profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.lead_client_profiles ADD COLUMN phone_number TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_client_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.lead_client_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.lead_client_profiles.phone_number IS 'Client phone number (Nomor Telepon)';
COMMENT ON COLUMN public.lead_client_profiles.email IS 'Client email';

-- leads table (perbarui juga di table leads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN phone_number TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN email TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.leads.phone_number IS 'Lead/client phone number (Nomor Telepon)';
COMMENT ON COLUMN public.leads.email IS 'Lead/client email';
