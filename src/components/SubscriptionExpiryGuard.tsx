import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/1-login';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { useSubscriptionExpiryRealtime } from '@/hooks/useSubscriptionExpiryRealtime';
import SubscriptionExpiredPage from '@/features/1-login/pages/SubscriptionExpiredPage';

interface SubscriptionExpiryGuardProps {
  children: ReactNode;
}

/**
 * SubscriptionExpiryGuard component that locks the entire application
 * if trial or subscription has expired based on trial_end_date or subscription_end_date
 * 
 * Logic:
 * - If is_trial = true and trial_end_date < now → Lock application
 * - If is_trial = false and subscription_end_date < now → Lock application
 * - Only applies to authenticated users with organization
 * - Allows access to /create-plan and /login routes to enable renewal
 */
export const SubscriptionExpiryGuard = ({ children }: SubscriptionExpiryGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { expiryStatus, isLoading } = useSubscriptionExpiry();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  
  // Setup realtime subscription to listen for subscription changes
  useSubscriptionExpiryRealtime();

  // Routes that should be accessible even when expired (to allow renewal)
  const ALLOWED_EXPIRED_ROUTES = [
    '/login',
    '/create-plan',
    '/subscription/plans',
    '/subscription/overview',
    '/subscription/management',
    '/register',
    '/verify-email',
    '/email-verified'
  ];

  // Check if current route is allowed when expired
  // STRICT: Only exact matches or routes that start with allowed route + /
  const isAllowedRoute = ALLOWED_EXPIRED_ROUTES.some(route => {
    const pathname = location.pathname;
    return pathname === route || pathname.startsWith(route + '/');
  });

  useEffect(() => {
    // If not authenticated or still loading, don't block
    if (authLoading || isLoading || !user) {
      setIsChecking(false);
      return;
    }

    // If allowed route (renewal routes), don't check expiry
    // These routes must be accessible even when expired to allow renewal
    if (isAllowedRoute) {
      setIsChecking(false);
      return;
    }

    // STRICT CHECK: If subscription expired, lock access IMMEDIATELY
    // This check is based on trial_end_date or subscription_end_date from database
    if (expiryStatus.isExpired) {
      console.warn('🚨 SUBSCRIPTION EXPIRED - LOCKING APPLICATION', {
        isTrialExpired: expiryStatus.isTrialExpired,
        isSubscriptionExpired: expiryStatus.isSubscriptionExpired,
        expiredDate: expiryStatus.expiredDate,
        daysExpired: expiryStatus.daysExpired,
        trialEndDate: expiryStatus.trialEndDate,
        subscriptionEndDate: expiryStatus.subscriptionEndDate,
        currentPath: location.pathname,
        status: expiryStatus.status
      });
      setIsChecking(false);
      return;
    }

    // Subscription is active - allow access
    setIsChecking(false);
  }, [
    authLoading, 
    isLoading, 
    user, 
    expiryStatus.isExpired, 
    expiryStatus.status,
    isAllowedRoute, 
    expiryStatus.isTrialExpired, 
    expiryStatus.isSubscriptionExpired, 
    expiryStatus.expiredDate, 
    expiryStatus.daysExpired,
    expiryStatus.trialEndDate,
    expiryStatus.subscriptionEndDate,
    location.pathname
  ]);

  // Show loading while checking
  if (authLoading || isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Memeriksa status subscription...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, allow access (will be handled by other guards)
  if (!user) {
    return <>{children}</>;
  }

  // If on allowed route, allow access even if expired
  if (isAllowedRoute) {
    return <>{children}</>;
  }

  // STRICT ENFORCEMENT: If subscription expired, show expired page
  // This blocks ALL routes except renewal routes (handled by isAllowedRoute check above)
  // The check is based on trial_end_date or subscription_end_date from organization_subscriptions table
  if (expiryStatus.isExpired) {
    console.warn('🔒 ACCESS DENIED: Subscription/Trial expired', {
      expiredDate: expiryStatus.expiredDate,
      daysExpired: expiryStatus.daysExpired,
      trialEndDate: expiryStatus.trialEndDate,
      subscriptionEndDate: expiryStatus.subscriptionEndDate,
      currentPath: location.pathname
    });
    return <SubscriptionExpiredPage expiryStatus={expiryStatus} />;
  }

  // Subscription is active, allow access to all routes
  return <>{children}</>;
};

