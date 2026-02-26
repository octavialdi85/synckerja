-- Add context to fcm_tokens: livechat (push for Live Chat) or general (app notifications: comments, tasks, etc.)
ALTER TABLE public.fcm_tokens
  ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'livechat'
    CHECK (context IN ('livechat', 'general'));

-- Replace unique constraint: one row per (user_id, token, context)
ALTER TABLE public.fcm_tokens
  DROP CONSTRAINT IF EXISTS fcm_tokens_user_id_token_key;

CREATE UNIQUE INDEX IF NOT EXISTS fcm_tokens_user_id_token_context_key
  ON public.fcm_tokens (user_id, token, context);

COMMENT ON TABLE public.fcm_tokens IS 'FCM device tokens for Live Chat and/or app notifications (general).';
COMMENT ON COLUMN public.fcm_tokens.context IS 'livechat = Live Chat push only; general = app notifications (comments, tasks, etc.).';
