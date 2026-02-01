-- Client profile for WhatsApp conversations (same concept as lead_client_profiles for leads).
-- Used by the Client Profile modal when viewing/editing profile for a WhatsApp lead.
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  gender TEXT,
  age INTEGER,
  occupation TEXT,
  location TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT uq_wa_conv_client_profile_conversation UNIQUE (conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_client_profiles_conversation_id
  ON public.whatsapp_conversation_client_profiles(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_client_profiles_organization_id
  ON public.whatsapp_conversation_client_profiles(organization_id);

ALTER TABLE public.whatsapp_conversation_client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp conversation client profiles"
  ON public.whatsapp_conversation_client_profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_client_profiles.organization_id)
  );

CREATE POLICY "Users can insert own org whatsapp conversation client profiles"
  ON public.whatsapp_conversation_client_profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_client_profiles.organization_id)
  );

CREATE POLICY "Users can update own org whatsapp conversation client profiles"
  ON public.whatsapp_conversation_client_profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_client_profiles.organization_id)
  );

COMMENT ON TABLE public.whatsapp_conversation_client_profiles IS 'Client profile (Name, Code, Gender, Age, Occupation, Location) for WhatsApp conversations in Leads Management Client Profile modal.';
