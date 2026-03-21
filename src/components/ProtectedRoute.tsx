import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/features/1-login';
import { Navigate, useLocation } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useDepartmentAccess } from '@/features/1-layouts/sidebar/useDepartmentAccess';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { LoadingDots } from './LoadingDots';
import { useIsMobile } from '@/mobile/hooks/use-mobile';
import { RouteLoadingSkeleton } from '@/mobile/components/RouteLoadingSkeleton';
import { MobileSplashScreen } from '@/mobile/components/MobileSplashScreen';
import { AccessDeniedPage } from '@/mobile/pages/access-denied';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface ProtectedRouteProps {
  children: ReactNode;
  requiresAuth?: boolean;
  redirectTo?: string;
  requiresPermissions?: boolean; // New: Enable permission checking
  pagePath?: string; // New: Override the page path for permission checking
  showAccessDeniedPage?: boolean; // New: Show full access denied page vs simple redirect
}

/**
 * Enhanced ProtectedRoute component that wraps routes requiring authentication and permissions
 * Redirects unauthenticated users to login page and shows access denied for unauthorized users
 */
export const ProtectedRoute = ({ 
  children, 
  requiresAuth = true, 
  redirectTo = '/login',
  requiresPermissions = true, // Default to true for enhanced security
  pagePath,
  showAccessDeniedPage = true
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { t } = useAppTranslation();
  const location = useLocation();
  const {
    canAccessPage,
    getAccessLevel,
    getDepartmentRestrictionMessage,
    configLoading
  } = useDepartmentAccess();

  // Determine the path to check for permissions
  const pathToCheck = pagePath || location.pathname;

  // Get additional context from useCentralizedUserData to check organization loading and employee status
  const { hasOrganization, organization, employee, isOwner } = useCentralizedUserData();
  const isMobile = useIsMobile();

  // Show loading spinner while checking auth state and permissions
  // Also wait for organization data to load when permissions are required
  const isLoadingOrgData = requiresPermissions && user && !organization && hasOrganization;
  
  // Unified loading state - combine all loading checks into one simple message
  const isLoading = loading || (requiresPermissions && configLoading) || isLoadingOrgData;
  
  // Debounce "Akses Ditolak": only show after access has been false for DENY_DEBOUNCE_MS.
  // Prevents flicker on refresh when config/role resolve slightly after loading.
  const [showDeniedAfterDebounce, setShowDeniedAfterDebounce] = useState(false);
  const denyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DENY_DEBOUNCE_MS = 250;

  useEffect(() => {
    if (!requiresPermissions || !user) {
      if (denyDebounceRef.current) {
        clearTimeout(denyDebounceRef.current);
        denyDebounceRef.current = null;
      }
      setShowDeniedAfterDebounce(false);
      return;
    }
    const hasPageAccess = canAccessPage(pathToCheck);
    if (hasPageAccess) {
      if (denyDebounceRef.current) {
        clearTimeout(denyDebounceRef.current);
        denyDebounceRef.current = null;
      }
      setShowDeniedAfterDebounce(false);
      return;
    }
    // No access: start debounce timer; only show denied after stable no-access
    denyDebounceRef.current = setTimeout(() => {
      denyDebounceRef.current = null;
      setShowDeniedAfterDebounce(true);
    }, DENY_DEBOUNCE_MS);
    return () => {
      if (denyDebounceRef.current) {
        clearTimeout(denyDebounceRef.current);
        denyDebounceRef.current = null;
      }
    };
  }, [requiresPermissions, user, pathToCheck, canAccessPage]);

  // While we're in the debounce window (no access but not yet showDeniedAfterDebounce), show loading so no flicker
  const isResolvingAccess = requiresPermissions && user && !canAccessPage(pathToCheck) && !showDeniedAfterDebounce;
  
  // Debounce loading UI: tampilkan LoadingDots hanya jika loading berlangsung >= 250ms.
  // Saat kembali ke tab, loading sering hanya sebentar sehingga loading dots tidak perlu tampil.
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => setShowLoadingUI(true), 250);
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setShowLoadingUI(false);
    }
  }, [isLoading]);

  // Tampilkan loading hanya bila benar-benar loading dan sudah lewat debounce (atau auth awal tanpa user)
  // Juga tampilkan loading saat menunggu debounce akses (isResolvingAccess) agar tidak flicker "Akses Ditolak"
  const shouldShowLoading = (showLoadingUI && isLoading) || isResolvingAccess;
  
  if (shouldShowLoading) {
    if (isMobile) {
      const isHomeRoute = pathToCheck === '/' || pathToCheck === '/dashboard';
      const showSplashForHome = isHomeRoute && (typeof sessionStorage === 'undefined' || sessionStorage.getItem('homeSplashShown') !== '1');
      return showSplashForHome ? <MobileSplashScreen /> : <RouteLoadingSkeleton />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <LoadingDots size="lg" />
          <p className="text-sm text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  // If authentication is not required, allow access
  if (!requiresAuth) {
    return <>{children}</>;
  }

  // If authentication is required but user is not authenticated, redirect to login
  if (requiresAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // SECURITY: Check if employee is terminated or inactive/resigned (except owners)
  // Owner can access their own organization even if terminated in other organizations
  if (requiresAuth && user && employee && organization) {
    const employeeStatus = (employee as any).status || (employee as any).employee_status_name;
    const statusLower = employeeStatus?.toLowerCase();
    const isTerminatedOrInactive = statusLower === 'terminated' || statusLower === 'inactive';
    
    if (isTerminatedOrInactive && !isOwner) {
      if (isMobile) {
        return <AccessDeniedPage deniedReason={t('accessDenied.terminatedMessage', 'Status karyawan Anda adalah Terminated/Inactive. Anda tidak memiliki akses ke organisasi ini.')} />;
      }
      return (
        <StandardLayout>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden">
            <div className="flex flex-1 min-h-0 min-w-0">
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <main className="flex-1 px-4 pt-16 pb-4 min-h-0 overflow-x-hidden">
                  <div className="h-full flex flex-col overflow-hidden min-w-0">
                    <div className="flex-1 flex items-center justify-center min-w-0">
                      <div className="max-w-md mx-auto w-full min-w-0">
                        <div className="text-center">
                          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="h-12 w-12 text-red-500" />
                          </div>
                          <div className="bg-white rounded-lg shadow-sm border p-6 min-w-0">
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">
                              {t('accessDenied.title', 'Akses Ditolak')}
                            </h2>
                            <p className="text-gray-600 mb-4">
                              {t('accessDenied.terminatedMessage', 'Status karyawan Anda adalah Terminated/Inactive. Anda tidak memiliki akses ke organisasi ini.')}
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                              {t('accessDenied.contactAdmin', 'Hubungi administrator jika Anda memerlukan akses')}
                            </p>
                            <button
                              onClick={() => window.location.href = '/'}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                            >
                              {t('accessDenied.backToHome', 'Kembali ke Beranda')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </StandardLayout>
      );
    }
  }

  // Check permissions if required — only show "Akses Ditolak" after debounce (showDeniedAfterDebounce) to avoid flicker
  if (requiresPermissions && user && showDeniedAfterDebounce) {
    const hasPageAccess = canAccessPage(pathToCheck);
    
    if (!hasPageAccess) {
      if (showAccessDeniedPage) {
        if (isMobile) {
          return <AccessDeniedPage />;
        }
        return (
          <StandardLayout>
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden">
              <div className="flex flex-1 min-h-0 min-w-0">
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                  <main className="flex-1 px-4 pt-16 pb-4 min-h-0 overflow-x-hidden">
                    <div className="h-full flex flex-col overflow-hidden min-w-0">
                      <div className="flex-1 flex items-center justify-center min-w-0">
                        <div className="max-w-md mx-auto w-full min-w-0">
                          <div className="text-center">
                            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                              <XCircle className="h-12 w-12 text-red-500" />
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border p-6 min-w-0">
                              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                                {t('accessDenied.title', 'Akses Ditolak')}
                              </h2>
                              <p className="text-gray-600 mb-6">
                                {t('accessDenied.message', 'Anda tidak memiliki izin untuk mengakses halaman ini.')}
                              </p>
                              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                <div className="text-sm text-gray-700">
                                  <p><span className="font-medium">{t('accessDenied.accessLevel', 'Level Akses')}:</span> {getAccessLevel()}</p>
                                  {getDepartmentRestrictionMessage() && (
                                    <p className="mt-2"><span className="font-medium">{t('accessDenied.restriction', 'Pembatasan')}:</span> {getDepartmentRestrictionMessage()}</p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => window.location.href = '/'}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                              >
                                {t('accessDenied.backToHome', 'Kembali ke Beranda')}
                              </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-4">
                              {t('accessDenied.contactAdmin', 'Hubungi administrator jika Anda memerlukan akses')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              </div>
            </div>
          </StandardLayout>
        );
      } else {
        // Simple redirect to home page
        return <Navigate to="/" replace />;
      }
    }
  }

  // User is authenticated and has proper permissions, render the protected component
  return <>{children}</>;
};

/**
 * PublicRoute component for routes that should only be accessible to non-authenticated users
 * Redirects authenticated users to home page
 */
export const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Show loading while checking auth state
  if (loading) {
    if (isMobile) {
      return <RouteLoadingSkeleton />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <LoadingDots size="lg" />
          <p className="text-sm text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  // Allow candidate application pages to be accessed by anyone (authenticated or not)
  const isCandidateApplyPage = location.pathname === '/candidate/apply';
  const isApplyPreviewPage = location.pathname.startsWith('/apply/preview/');
  const isCandidateProfilePage = location.pathname.startsWith('/candidate/profile');
  if (isCandidateApplyPage || isApplyPreviewPage || isCandidateProfilePage) {
    return <>{children}</>;
  }

  // If user is authenticated, redirect to home EXCEPT for login page with emailJustVerified flag
  // and EXCEPT for review link: send to dashboard with preview modal instead of home
  if (user) {
    const isEmailJustVerified = sessionStorage.getItem('emailJustVerified') === 'true';
    const isLoginPage = location.pathname === '/login';
    
    // Allow authenticated user to stay on login page if they just verified email
    if (isLoginPage && isEmailJustVerified) {
      return <>{children}</>;
    }

    // Review link: redirect to dashboard so preview opens in modal (same content as public page)
    const isReviewPage = location.pathname.startsWith('/review/');
    if (isReviewPage) {
      const token = location.pathname.replace(/^\/review\//, '').replace(/\/$/, '').trim();
      if (token) {
        return <Navigate to={`/digital-marketing/social-media/dashboard?review=${encodeURIComponent(token)}`} replace />;
      }
    }
    
    return <Navigate to="/" replace />;
  }

  // User is not authenticated, render the public component
  return <>{children}</>;
};

