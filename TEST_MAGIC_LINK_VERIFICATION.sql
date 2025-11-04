-- Test query untuk verify magic link email verification
-- Jalankan query ini setelah user klik link dan setup password

-- Query 1: Check status magic link
SELECT 
  email,
  email_verified,
  status,
  used_at,
  created_at,
  CASE 
    WHEN email_verified = true THEN '✅ Email Verified'
    ELSE '❌ Not Verified'
  END as verification_status,
  CASE 
    WHEN status = 'completed' THEN '✅ Setup Complete'
    WHEN status = 'pending' THEN '⏳ Pending'
    ELSE '❌ Unknown Status'
  END as setup_status
FROM magic_links
WHERE email = 'papadhanta@gmail.com'
ORDER BY created_at DESC
LIMIT 1;

-- Query 2: Check if user profile is verified
SELECT 
  p.user_id,
  p.email,
  p.email_verified,
  p.full_name,
  p.active_organization_id
FROM profiles p
WHERE p.email = 'papadhanta@gmail.com';

-- Query 3: Check email verification tokens
SELECT 
  email,
  email_verified,
  used_at,
  created_at
FROM email_verification_tokens
WHERE email = 'papadhanta@gmail.com'
ORDER BY created_at DESC
LIMIT 1;

-- Expected Results After Successful Process:
-- 1. magic_links.email_verified = TRUE
-- 2. magic_links.status = 'completed'
-- 3. magic_links.used_at = [timestamp]
-- 4. profiles.email_verified = TRUE
-- 5. email_verification_tokens.email_verified = TRUE

