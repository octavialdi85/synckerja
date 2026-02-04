-- Optimize login queries with indexes
-- These indexes speed up profile and email verification lookups during login

-- Index for profiles.user_id (used in login flow)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Index for profiles.email (used when checking if email exists)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index for email_verification_tokens.user_id + email_verified (used in login flow)
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_verified 
  ON email_verification_tokens(user_id, email_verified) 
  WHERE email_verified = true;

-- Index for email_verification_tokens.used_at (for ordering)
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_used_at 
  ON email_verification_tokens(user_id, used_at DESC NULLS LAST);

-- Composite index for common login query pattern
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_verified_used 
  ON email_verification_tokens(user_id, email_verified, used_at DESC NULLS LAST) 
  WHERE email_verified = true;

COMMENT ON INDEX idx_profiles_user_id IS 'Speeds up profile lookup by user_id during login';
COMMENT ON INDEX idx_profiles_email IS 'Speeds up email existence check during login';
COMMENT ON INDEX idx_email_verification_tokens_user_verified IS 'Speeds up email verification check during login';
