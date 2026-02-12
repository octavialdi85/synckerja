-- Add display name for public review commenters (no login; name only, no email)
ALTER TABLE public.link_comments
  ADD COLUMN IF NOT EXISTS commenter_display_name TEXT;

COMMENT ON COLUMN public.link_comments.commenter_display_name IS 'Display name for public review commenters (when created_by IS NULL). Filled via popup once per token, stored in localStorage.';
