import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/1-login';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { supabase } from '@/integrations/supabase/client';

interface HomeAccessGuardProps {
  children: ReactNode;
}

/**
 * HomeAccessGuard component that checks if user has:
 * 1. Verified email (email_verification_tokens.email_verified = true)
 * 2. Created organization and has active_organization_id (profiles.organization_created = true AND active_organization_id IS NOT NULL)
 * 3. Active subscription (organizations.has_active_subscription = TRUE OR organization_subscriptions.status = 'active')
 * 
 * PRIMARY CHECK: organizations.has_active_subscription
 * - If FALSE → Block access, redirect to /create-plan
 * - If TRUE → Allow access
 * - If NULL → Fallback to organization_subscriptions.status check
 * 
 * Redirect behavior:
 * - Email not verified → /verify-email
 * - No organization → /create-organization
 * - No active organization ID → /create-organization
 * - has_active_subscription = FALSE → /create-plan (applies to both mobile and desktop)
 * - Subscription status not active → /create-plan
 * 
 * All conditions must pass for home page access (mobile and desktop)
 */
export const HomeAccessGuard = ({ children }: HomeAccessGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { 
    hasOrganization, 
    organization, 
    isEmailVerified,
    loading: userDataLoading 
  } = useCentralizedUserData();
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Check if user is coming from email verification (bypass email verification check)
  const emailJustVerified = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('emailJustVerified') === 'true';
  
  // Check if organization was just created (skip redirect to create-organization)
  const organizationJustCreated = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('organizationJustCreated') === 'true';

  // Clear emailJustVerified flag once we've verified email and passed all checks
  useEffect(() => {
    if (user && emailJustVerified && isEmailVerified) {
      console.log('HomeAccessGuard: Clearing emailJustVerified flag after successful verification');
      sessionStorage.removeItem('emailJustVerified');
    }
  }, [user, emailJustVerified, isEmailVerified]);

  // JANGAN clear organizationJustCreated flag terlalu cepat
  // Biarkan flag tetap ada sampai redirect ke create-plan selesai
  // Flag akan di-clear oleh CreatePlan page setelah subscription dibuat
  // atau oleh EmployeeWelcome setelah user selesai onboarding

  // Load subscription status from both organization_subscriptions and organizations table
  useEffect(() => {
    const checkSubscription = async () => {
      if (!organization?.id) {
        setLoadingSubscription(false);
        return;
      }

      try {
        // Check has_active_subscription from organizations table (PRIMARY CHECK)
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('has_active_subscription')
          .eq('id', organization.id)
          .single();

        if (orgError) {
          console.error('Error checking organization subscription status:', orgError);
        } else if (orgData) {
          // Set has_active_subscription from organizations table
          const active = orgData.has_active_subscription === true;
          setHasActiveSubscription(active);
          console.log('HomeAccessGuard: has_active_subscription from organizations table:', active);
        }

        // Also check organization_subscriptions table for status (SECONDARY CHECK)
        const { data: subData, error: subError } = await supabase
          .from('organization_subscriptions')
          .select('status')
          .eq('organization_id', organization.id)
          .maybeSingle();

        if (!subError && subData && 'status' in subData) {
          setSubscriptionStatus(subData.status as string);
          console.log('HomeAccessGuard: subscription status from organization_subscriptions:', subData.status);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    checkSubscription();
  }, [organization?.id]);

  // Show loading while checking auth and user data
  if (authLoading || userDataLoading || loadingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check email verification status (skip check if user just verified email)
  if (!isEmailVerified && !emailJustVerified) {
    console.log('Email not verified, redirecting to verify-email');
    return <Navigate to="/verify-email" replace />;
  }

  // Check if user has created an organization
  // Skip redirect if organization was just created (will redirect to create-plan instead)
  if ((!hasOrganization || !organization) && !organizationJustCreated) {
    console.log('No organization found, redirecting to create-organization');
    return <Navigate to="/create-organization" replace />;
  }

  // Check if user has active organization
  // Skip redirect if organization was just created
  if (!organization?.id && !organizationJustCreated) {
    console.log('No active organization ID, redirecting to create-organization');
    return <Navigate to="/create-organization" replace />;
  }

  // If organization was just created but context hasn't updated yet, show loading
  if (organizationJustCreated && (!hasOrganization || !organization)) {
    console.log('HomeAccessGuard: Organization just created, waiting for context update...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Memuat data organisasi...</p>
        </div>
      </div>
    );
  }

  // PRIMARY CHECK: Check has_active_subscription from organizations table
  // This is the main gate - if has_active_subscription = FALSE, block access immediately
  // Applies to both mobile and desktop versions
  if (hasActiveSubscription === false) {
    console.log('HomeAccessGuard: has_active_subscription = FALSE, redirecting to create-plan');
    return <Navigate to="/create-plan" replace />;
  }

  // If has_active_subscription is explicitly TRUE, allow access
  if (hasActiveSubscription === true) {
    console.log('HomeAccessGuard: has_active_subscription = TRUE, allowing access to home');
    return <>{children}</>;
  }

  // If has_active_subscription is NULL, check organization_subscriptions table as fallback
  // This handles edge cases where has_active_subscription might not be set yet
  if (hasActiveSubscription === null) {
    // Only allow access if subscription status is 'active'
    // If status is not 'active' or null/undefined, redirect to create-plan
    if (subscriptionStatus === 'active') {
      console.log('HomeAccessGuard: has_active_subscription is null but subscription status is active, allowing access');
      return <>{children}</>;
    } else if (subscriptionStatus !== null && subscriptionStatus !== undefined && subscriptionStatus !== 'active') {
      console.log('HomeAccessGuard: has_active_subscription is null and subscription status is not active:', subscriptionStatus, 'redirecting to create-plan');
      return <Navigate to="/create-plan" replace />;
    }
    // If both are null/undefined, redirect to create-plan for safety
    console.log('HomeAccessGuard: has_active_subscription is null and no subscription status found, redirecting to create-plan');
    return <Navigate to="/create-plan" replace />;
  }

  // Default fallback: redirect to create-plan if we can't determine status
  console.log('HomeAccessGuard: Unable to determine subscription status, redirecting to create-plan');
  return <Navigate to="/create-plan" replace />;
};

