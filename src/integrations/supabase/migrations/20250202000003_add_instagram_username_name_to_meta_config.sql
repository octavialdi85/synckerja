-- Add Instagram display name/username for connected account list
ALTER TABLE public.organization_meta_config
  ADD COLUMN IF NOT EXISTS instagram_username TEXT,
  ADD COLUMN IF NOT EXISTS instagram_name TEXT;
