# Subscription Expiry Protection for Mobile

## Overview
Mobile routes are protected by the same `SubscriptionExpiryGuard` that protects desktop routes. The guard wraps all routes in `App.tsx`, ensuring that both mobile and desktop access is locked when subscription or trial expires.

## How It Works

### 1. Guard Implementation
- **Location**: `src/components/SubscriptionExpiryGuard.tsx`
- **Protection Level**: All routes (including mobile routes)
- **Wrapper Location**: `src/App.tsx` line 130

### 2. Protected Mobile Routes
All mobile routes are automatically protected:
- `/` (Mobile Home/Absensi)
- `/profile` (Mobile Profile)
- `/schedule` (Mobile Schedule)
- `/client-visit` (Mobile Client Visit)
- `/reports` (Mobile Reports)

### 3. Expiry Check Logic
The guard checks:
- `trial_end_date` from `organization_subscriptions` table
- `subscription_end_date` from `organization_subscriptions` table
- Priority: `subscription_end_date` takes priority over `trial_end_date`

### 4. Expired State Behavior
When subscription/trial expires:
- ✅ All mobile routes are locked
- ✅ User sees `SubscriptionExpiredPage` (mobile-responsive)
- ✅ User can access renewal routes:
  - `/login`
  - `/create-plan`
  - `/subscription/plans`
  - `/subscription/overview`
  - `/subscription/management`

### 5. Realtime Updates
- Uses `useSubscriptionExpiryRealtime` hook
- Automatically detects subscription changes
- Updates lock status immediately when subscription is renewed

## Hook Dependencies

### useSubscriptionExpiry
- **Location**: `src/hooks/useSubscriptionExpiry.ts`
- **Uses**: `@/integrations/supabase/client` (shared with desktop)
- **Uses**: `@/features/1-login/hooks/useCurrentOrg` (shared with desktop)
- **Compatibility**: ✅ Works on both mobile and desktop

### useSubscriptionExpiryRealtime
- **Location**: `src/hooks/useSubscriptionExpiryRealtime.ts`
- **Function**: Listens to `organization_subscriptions` table changes
- **Auto-refresh**: Invalidates cache when subscription data changes

## Mobile-Specific Considerations

### Responsive Design
- `SubscriptionExpiredPage` is already mobile-responsive
- Uses Tailwind responsive classes (`sm:`, `md:`, etc.)
- Optimized for mobile viewports

### Performance
- Uses React Query for caching
- Auto-refresh interval: 5 minutes
- Cache duration: 2-5 minutes

## Testing Mobile Expiry Protection

1. **Set expired subscription in database:**
   ```sql
   UPDATE organization_subscriptions 
   SET trial_end_date = '2024-01-01'
   WHERE organization_id = '<your_org_id>';
   ```

2. **Access mobile routes:**
   - Navigate to `/` (mobile home)
   - Should see `SubscriptionExpiredPage`
   - All mobile routes should be locked

3. **Test renewal access:**
   - Navigate to `/subscription/plans`
   - Should be accessible even when expired
   - Can complete renewal process

4. **Test after renewal:**
   - Update subscription in database
   - Realtime hook should detect change
   - Mobile routes should unlock automatically

## Files Involved

### Core Files
- `src/components/SubscriptionExpiryGuard.tsx` - Main guard component
- `src/hooks/useSubscriptionExpiry.ts` - Expiry check hook
- `src/hooks/useSubscriptionExpiryRealtime.ts` - Realtime updates
- `src/features/1-login/pages/SubscriptionExpiredPage.tsx` - Expired page (mobile-responsive)

### Mobile Files
- `src/mobile/components/SubscriptionExpiryGuardMobile.tsx` - Mobile wrapper (documentation)
- `src/mobile/pages/home/*.tsx` - All protected mobile pages

### Integration
- `src/App.tsx` - Routes wrapped with SubscriptionExpiryGuard

## Notes
- Mobile and desktop share the same routing structure
- No separate mobile guard needed - one guard protects all
- All hooks are shared between mobile and desktop
- Supabase client is shared between mobile and desktop

