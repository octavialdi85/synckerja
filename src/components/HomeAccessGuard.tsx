import { ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useAuth } from '@/features/1-login';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { useIsMobile } from '@/mobile/hooks/use-mobile';
import { RouteLoadingSkeleton } from '@/mobile/components/RouteLoadingSkeleton';
import { MobileSplashScreen } from '@/mobile/components/MobileSplashScreen';
import { logger } from '@/config/logger';

const SUBSCRIPTION_CACHE_KEY_PREFIX = 'home_subscription_';
const SUBSCRIPTION_CACHE_TTL_MS = 60 * 1000; // 1 minute – avoid 2 queries on every home open
const SPLASH_MIN_MS = 3000; // Minimum time to show splash logo before home (mobile)
const HOME_SPLASH_SHOWN_KEY = 'homeSplashShown';

function showSplashForHome(): boolean {
  return typeof sessionStorage === 'undefined' || sessionStorage.getItem(HOME_SPLASH_SHOWN_KEY) !== '1';
}

interface SubscriptionCacheEntry {
  hasActiveSubscription: boolean | null;
  subscriptionStatus: string | null;
  timestamp: number;
}

function getSubscriptionCache(organizationId: string): SubscriptionCacheEntry | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SUBSCRIPTION_CACHE_KEY_PREFIX}${organizationId}`);
    if (!raw) return null;
    const entry: SubscriptionCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > SUBSCRIPTION_CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function setSubscriptionCache(organizationId: string, hasActiveSubscription: boolean | null, subscriptionStatus: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${SUBSCRIPTION_CACHE_KEY_PREFIX}${organizationId}`,
      JSON.stringify({
        hasActiveSubscription,
        subscriptionStatus,
        timestamp: Date.now(),
      } as SubscriptionCacheEntry)
    );
  } catch {
    // ignore
  }
}

export function clearHomeSubscriptionCache(organizationId: string | undefined): void {
  if (typeof sessionStorage === 'undefined' || !organizationId) return;
  try {
    sessionStorage.removeItem(`${SUBSCRIPTION_CACHE_KEY_PREFIX}${organizationId}`);
  } catch {
    // ignore
  }
}

function SplashMinDelayEffect({ remainingMs, onDone }: { remainingMs: number; onDone: () => void }) {
  useEffect(() => {
    if (remainingMs <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(onDone, remainingMs);
    return () => clearTimeout(t);
  }, [remainingMs, onDone]);
  return null;
}

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
    loading: userDataLoading,
    error: userDataError
  } = useCentralizedUserData();
  
  // ADDITIONAL LAYER: Check subscription expiry based on trial_end_date and subscription_end_date
  const { expiryStatus, isLoading: expiryLoading } = useSubscriptionExpiry();
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [subscriptionRetryCount, setSubscriptionRetryCount] = useState(0);
  const [loadingStartTime, setLoadingStartTime] = useState<number>(Date.now());
  const [showSlowConnectionWarning, setShowSlowConnectionWarning] = useState(false);
  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const splashStartRef = useRef<number | null>(null);
  const homeSplashShownSetRef = useRef(false);

  // Check if user is coming from email verification (bypass email verification check)
  const emailJustVerified = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('emailJustVerified') === 'true';
  
  // Check if organization was just created (skip redirect to create-organization)
  const organizationJustCreated = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('organizationJustCreated') === 'true';

  // Track loading time and show slow connection warning after 5 seconds
  useEffect(() => {
    if (authLoading || userDataLoading || loadingSubscription || expiryLoading) {
      setLoadingStartTime(Date.now());
      const timer = setTimeout(() => {
        setShowSlowConnectionWarning(true);
      }, 5000); // Show warning after 5 seconds

      return () => clearTimeout(timer);
    } else {
      setShowSlowConnectionWarning(false);
    }
  }, [authLoading, userDataLoading, loadingSubscription, expiryLoading]);

  // Clear emailJustVerified flag once we've verified email and passed all checks
  useEffect(() => {
    if (user && emailJustVerified && isEmailVerified) {
      logger.debug('HomeAccessGuard: Clearing emailJustVerified flag after successful verification');
      sessionStorage.removeItem('emailJustVerified');
    }
  }, [user, emailJustVerified, isEmailVerified]);

  // JANGAN clear organizationJustCreated flag terlalu cepat
  // Biarkan flag tetap ada sampai redirect ke create-plan selesai
  // Flag akan di-clear oleh CreatePlan page setelah subscription dibuat
  // atau oleh EmployeeWelcome setelah user selesai onboarding

  // Load subscription status: use session cache to avoid 2 queries on every home open
  // When subscriptionRetryCount >= 1, skip cache so we get a fresh result after retry
  useEffect(() => {
    const checkSubscription = async () => {
      if (!organization?.id) {
        setLoadingSubscription(false);
        return;
      }

      if (subscriptionRetryCount >= 1) {
        clearHomeSubscriptionCache(organization.id);
      }

      const cached = subscriptionRetryCount < 1 ? getSubscriptionCache(organization.id) : null;
      if (cached) {
        setHasActiveSubscription(cached.hasActiveSubscription);
        setSubscriptionStatus(cached.subscriptionStatus);
        setLoadingSubscription(false);
        logger.debug('HomeAccessGuard: using cached subscription (skip 2 queries)');
        return;
      }

      try {
        // Check has_active_subscription from organizations table (PRIMARY CHECK)
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('has_active_subscription')
          .eq('id', organization.id)
          .single();

        let active: boolean | null = null;
        let subStatus: string | null = null;

        if (orgError) {
          logger.error('Error checking organization subscription status:', orgError);
        } else if (orgData) {
          active = orgData.has_active_subscription === true;
          setHasActiveSubscription(active);
          logger.debug('HomeAccessGuard: has_active_subscription from organizations table:', active);
        }

        // Also check organization_subscriptions table for status (SECONDARY CHECK)
        const { data: subData, error: subError } = await supabase
          .from('organization_subscriptions')
          .select('status')
          .eq('organization_id', organization.id)
          .maybeSingle();

        if (!subError && subData && 'status' in subData) {
          subStatus = subData.status as string;
          setSubscriptionStatus(subStatus);
          logger.debug('HomeAccessGuard: subscription status from organization_subscriptions:', subStatus);
        }

        setSubscriptionCache(organization.id, active, subStatus);
      } catch (error) {
        logger.error('Error checking subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    checkSubscription();
  }, [organization?.id, subscriptionRetryCount]);

  const isMobile = useIsMobile();

  // Show loading while checking auth, user data, and expiry status
  if (authLoading || userDataLoading || loadingSubscription || expiryLoading) {
    if (isMobile) {
      const useSplash = showSplashForHome();
      if (useSplash) {
        const wasNull = splashStartRef.current === null;
        splashStartRef.current = splashStartRef.current ?? Date.now();
        if (wasNull) setSplashMinElapsed(false);
      }
      if (useSplash) {
        return (
          <>
            <MobileSplashScreen />
            {showSlowConnectionWarning && (
            <div className="fixed bottom-4 left-4 right-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 z-50">
              <WifiOff className="h-6 w-6 text-yellow-600 mx-auto mb-2 block" />
              <p className="text-sm text-yellow-800 text-center">
                Koneksi lambat terdeteksi. Sedang mencoba menghubungkan ke server...
              </p>
            </div>
          )}
          {userDataError && (
            <div className="fixed bottom-4 left-4 right-4 p-4 bg-red-50 rounded-lg border border-red-200 z-50">
              <p className="text-sm text-red-800 text-center">
                Terjadi kesalahan: {userDataError.message}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Muat Ulang Halaman
              </button>
            </div>
          )}
        </>
        );
      }
      return (
        <>
          <RouteLoadingSkeleton />
          {showSlowConnectionWarning && (
            <div className="fixed bottom-4 left-4 right-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 z-50">
              <WifiOff className="h-6 w-6 text-yellow-600 mx-auto mb-2 block" />
              <p className="text-sm text-yellow-800 text-center">
                Koneksi lambat terdeteksi. Sedang mencoba menghubungkan ke server...
              </p>
              <p className="text-xs text-yellow-600 text-center mt-1">
                Sistem akan mencoba ulang hingga {((Date.now() - loadingStartTime) / 1000).toFixed(0)} detik
              </p>
            </div>
          )}
          {userDataError && (
            <div className="fixed bottom-4 left-4 right-4 p-4 bg-red-50 rounded-lg border border-red-200 z-50">
              <p className="text-sm text-red-800 text-center">
                Terjadi kesalahan: {userDataError.message}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Muat Ulang Halaman
              </button>
            </div>
          )}
        </>
      );
    }
    return (
      <>
        <RouteLoadingSkeleton />
        {showSlowConnectionWarning && (
          <div className="fixed bottom-4 left-4 right-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 z-50">
            <WifiOff className="h-6 w-6 text-yellow-600 mx-auto mb-2 block" />
            <p className="text-sm text-yellow-800 text-center">
              Koneksi lambat terdeteksi. Sedang mencoba menghubungkan ke server...
            </p>
            <p className="text-xs text-yellow-600 text-center mt-1">
              Sistem akan mencoba ulang hingga {((Date.now() - loadingStartTime) / 1000).toFixed(0)} detik
            </p>
          </div>
        )}
        {userDataError && (
          <div className="fixed bottom-4 left-4 right-4 p-4 bg-red-50 rounded-lg border border-red-200 z-50">
            <p className="text-sm text-red-800 text-center">
              Terjadi kesalahan: {userDataError.message}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Muat Ulang Halaman
            </button>
          </div>
        )}
      </>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check email verification status (skip check if user just verified email)
  if (!isEmailVerified && !emailJustVerified) {
    logger.debug('Email not verified, redirecting to verify-email');
    return <Navigate to="/verify-email" replace />;
  }

  // Check if user has created an organization
  // Skip redirect if organization was just created (will redirect to create-plan instead)
  if ((!hasOrganization || !organization) && !organizationJustCreated) {
    logger.debug('No organization found, redirecting to create-organization');
    return <Navigate to="/create-organization" replace />;
  }

  // Check if user has active organization
  // Skip redirect if organization was just created
  if (!organization?.id && !organizationJustCreated) {
    logger.debug('No active organization ID, redirecting to create-organization');
    return <Navigate to="/create-organization" replace />;
  }

  // If organization was just created but context hasn't updated yet, show loading
  if (organizationJustCreated && (!hasOrganization || !organization)) {
    logger.debug('HomeAccessGuard: Organization just created, waiting for context update...');
    if (isMobile) {
      if (showSplashForHome()) {
        const wasNull = splashStartRef.current === null;
        splashStartRef.current = splashStartRef.current ?? Date.now();
        if (wasNull) setSplashMinElapsed(false);
        return <MobileSplashScreen />;
      }
      return <RouteLoadingSkeleton />;
    }
    return <RouteLoadingSkeleton />;
  }

  // STRICT EXPIRY CHECK (LAYER 1): Check if subscription/trial expired based on dates
  // This check is based on trial_end_date or subscription_end_date from organization_subscriptions table
  // Takes priority over status checks because it's date-based (more accurate)
  if (expiryStatus.isExpired) {
    clearHomeSubscriptionCache(organization?.id);
    logger.warn('HomeAccessGuard: Subscription/Trial expired based on dates, redirecting to create-plan', {
      isTrialExpired: expiryStatus.isTrialExpired,
      isSubscriptionExpired: expiryStatus.isSubscriptionExpired,
      expiredDate: expiryStatus.expiredDate,
      trialEndDate: expiryStatus.trialEndDate,
      subscriptionEndDate: expiryStatus.subscriptionEndDate,
      daysExpired: expiryStatus.daysExpired
    });
    return <Navigate to="/create-plan" replace />;
  }

  // PRIMARY CHECK: Check has_active_subscription from organizations table
  // This is the main gate - if has_active_subscription = FALSE, block access immediately
  // Applies to both mobile and desktop versions
  if (hasActiveSubscription === false) {
    clearHomeSubscriptionCache(organization?.id);
    logger.debug('HomeAccessGuard: has_active_subscription = FALSE, redirecting to create-plan');
    return <Navigate to="/create-plan" replace />;
  }

  // If has_active_subscription is explicitly TRUE, allow access
  if (hasActiveSubscription === true) {
    logger.debug('HomeAccessGuard: has_active_subscription = TRUE, allowing access to home');
    if (isMobile && showSplashForHome() && splashStartRef.current != null && !splashMinElapsed) {
      const remaining = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashStartRef.current));
      if (remaining > 0) {
        return (
          <>
            <MobileSplashScreen />
            <SplashMinDelayEffect remainingMs={remaining} onDone={() => setSplashMinElapsed(true)} />
          </>
        );
      }
    }
    splashStartRef.current = null;
    if (typeof sessionStorage !== 'undefined' && !homeSplashShownSetRef.current) {
      sessionStorage.setItem(HOME_SPLASH_SHOWN_KEY, '1');
      homeSplashShownSetRef.current = true;
    }
    return <>{children}</>;
  }

  // If has_active_subscription is NULL, check organization_subscriptions table as fallback
  // This handles edge cases where has_active_subscription might not be set yet
  if (hasActiveSubscription === null) {
    // Only allow access if subscription status is 'active'
    // If status is not 'active' or null/undefined, redirect to create-plan
    if (subscriptionStatus === 'active') {
      logger.debug('HomeAccessGuard: has_active_subscription is null but subscription status is active, allowing access');
      if (isMobile && showSplashForHome() && splashStartRef.current != null && !splashMinElapsed) {
        const remaining = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashStartRef.current));
        if (remaining > 0) {
          return (
            <>
              <MobileSplashScreen />
              <SplashMinDelayEffect remainingMs={remaining} onDone={() => setSplashMinElapsed(true)} />
            </>
          );
        }
      }
      splashStartRef.current = null;
      if (typeof sessionStorage !== 'undefined' && !homeSplashShownSetRef.current) {
        sessionStorage.setItem(HOME_SPLASH_SHOWN_KEY, '1');
        homeSplashShownSetRef.current = true;
      }
      return <>{children}</>;
    } else if (subscriptionStatus !== null && subscriptionStatus !== undefined && subscriptionStatus !== 'active') {
      clearHomeSubscriptionCache(organization?.id);
      logger.debug('HomeAccessGuard: has_active_subscription is null and subscription status is not active:', subscriptionStatus, 'redirecting to create-plan');
      return <Navigate to="/create-plan" replace />;
    }
    // If both are null/undefined: retry subscription check once before redirecting (avoids redirect while data still loading)
    if (subscriptionRetryCount < 1 && organization?.id) {
      clearHomeSubscriptionCache(organization.id);
      setSubscriptionRetryCount(1);
      setLoadingSubscription(true);
      if (isMobile) {
        if (showSplashForHome()) {
          const wasNull = splashStartRef.current === null;
          splashStartRef.current = splashStartRef.current ?? Date.now();
          if (wasNull) setSplashMinElapsed(false);
          return <MobileSplashScreen />;
        }
        return <RouteLoadingSkeleton />;
      }
      return <RouteLoadingSkeleton />;
    }
    clearHomeSubscriptionCache(organization?.id);
    logger.debug('HomeAccessGuard: has_active_subscription is null and no subscription status found after retry, redirecting to create-plan');
    return <Navigate to="/create-plan" replace />;
  }

  // Default fallback: redirect to create-plan if we can't determine status
  clearHomeSubscriptionCache(organization?.id);
  logger.debug('HomeAccessGuard: Unable to determine subscription status, redirecting to create-plan');
  return <Navigate to="/create-plan" replace />;
};

