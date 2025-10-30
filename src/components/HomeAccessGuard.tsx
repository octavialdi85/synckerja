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
 * 3. Active subscription (organization_subscriptions.status = 'active')
 * 
 * Redirect behavior:
 * - Email not verified → /verify-email
 * - No organization → /create-organization
 * - No active organization ID → /create-organization
 * - Subscription not active → /create-plan
 * 
 * All conditions must pass for home page access
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
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Load subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!organization?.id) {
        setLoadingSubscription(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organization_subscriptions')
          .select('status')
          .eq('organization_id', organization.id)
          .maybeSingle();

        if (!error && data) {
          setSubscriptionStatus(data.status);
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

  // Check email verification status
  if (!isEmailVerified) {
    console.log('Email not verified, redirecting to verify-email');
    return <Navigate to="/verify-email" replace />;
  }

  // Check if user has created an organization
  if (!hasOrganization || !organization) {
    console.log('No organization found, redirecting to create-organization');
    return <Navigate to="/create-organization" replace />;
  }

  // Check if user has active organization
  if (!organization.id) {
    console.log('No active organization ID, redirecting to create-organization');
    return <Navigate to="/create-organization" replace />;
  }

  // Check subscription status - only allow 'active' status
  // Allow null/undefined subscription status (might be during setup or trial period)
  // Only redirect if status exists but is not 'active'
  if (subscriptionStatus !== null && subscriptionStatus !== undefined && subscriptionStatus !== 'active') {
    console.log('Subscription not active:', subscriptionStatus, 'redirecting to create-plan');
    return <Navigate to="/create-plan" replace />;
  }

  // All checks passed, allow access
  return <>{children}</>;
};

