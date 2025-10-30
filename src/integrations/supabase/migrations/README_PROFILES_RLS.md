# Profiles Table RLS Migration

This migration enables Row Level Security (RLS) on the `profiles` table and creates appropriate security policies.

## Overview

The `profiles` table stores user profile information including:
- `id` - Primary key
- `user_id` - Reference to auth.users
- `email` - User's email address
- `active_organization_id` - Currently active organization
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Security Policies

### 1. Users can view their own profile
- Allows users to read their own profile data
- Uses: `auth.uid() = user_id`

### 2. Users can view profiles in same organization
- Allows users to see basic profile info of other users in the same organization
- Checks that both users have the same active_organization_id
- Enables features like employee directory within an organization

### 3. Users can insert their own profile
- Allows users to create their own profile record
- Only during initial profile creation
- Uses: `auth.uid() = user_id`

### 4. Users can update their own profile
- Allows users to update their own profile fields
- Restricts updates to their own profile only
- Uses: `auth.uid() = user_id`

### 5. Users can update active_organization_id in their profile
- Allows users to switch between organizations
- Validates that the user is actually a member of the target organization
- Checks the `user_organizations` table to ensure the user belongs to the organization

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/najgdwffjhnqlogfrlqa
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `enable_profiles_rls.sql`
5. Click **Run** to execute

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up enable_profiles_rls.sql
```

### Option 3: Using Node.js Script

1. Get your Supabase service role key from the dashboard
2. Set environment variable:
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```
3. Run the migration script:
   ```bash
   node run_migration.js
   ```

## Verification

After applying the migration, verify that RLS is enabled:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check existing policies
SELECT * 
FROM pg_policies 
WHERE tablename = 'profiles';
```

## Status

✅ **RLS Successfully Applied and Fixed Using MCP Tools**
- RLS is now enabled on the `profiles` table
- All security policies have been created and are active
- Table has `rowsecurity = true`
- Total of 5 clean RLS policies (duplicates removed)

### Issues Fixed
- ❌ **Infinite recursion error** - Fixed by removing the problematic policy that queried `profiles` table within its own policy check
- ✅ **Duplicates removed** - Cleaned up 20+ duplicate policies
- ✅ **Working policies** - Now using `user_organizations` table instead of `profiles` for organization checks

### Final Policies
1. `profiles_select_own` - Users can view their own profile
2. `profiles_select_same_org` - Users can view profiles of users in the same organization (via user_organizations)
3. `profiles_insert_own` - Users can insert their own profile
4. `profiles_update_own` - Users can update their own profile
5. `profiles_delete_own` - Users can delete their own profile

## Important Notes

⚠️ **Before applying this migration:**
- Ensure all existing profiles have proper `user_id` values
- Test the policies in a development environment first
- Keep a backup of your database

⚠️ **After applying this migration:**
- Test user profile access to ensure it works correctly
- Verify that users can still switch organizations
- Check that organization-wide profile views still function

## Rollback

If you need to rollback this migration:

```sql
-- Disable RLS (WARNING: This removes all security)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Or drop individual policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update active_organization_id in their profile" ON profiles;
```

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
