import { ReactNode } from 'react';
import { useAuth } from '@/features/1-login';
import { Navigate, useLocation } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useDepartmentAccess } from '@/features/1-layouts/sidebar/useDepartmentAccess';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { LoadingDots } from './LoadingDots';

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

  // Show loading spinner while checking auth state and permissions
  // Also wait for organization data to load when permissions are required
  const isLoadingOrgData = requiresPermissions && user && !organization && hasOrganization;
  
  // Unified loading state - combine all loading checks into one simple message
  const isLoading = loading || (requiresPermissions && configLoading) || isLoadingOrgData;
  
  if (isLoading) {
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
      // Employee is terminated and not owner - block access
      return (
        <StandardLayout>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 flex flex-col min-h-0">
                <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
                  <div className="h-full flex flex-col overflow-hidden">
                    <div className="flex-1 flex items-center justify-center">
                      <div className="max-w-md mx-auto">
                        <div className="text-center">
                          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="h-12 w-12 text-red-500" />
                          </div>
                          <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">
                              Akses Ditolak
                            </h2>
                            <p className="text-gray-600 mb-4">
                              Status karyawan Anda adalah <strong>Terminated</strong>. Anda tidak memiliki akses ke organisasi ini.
                            </p>
                            <p className="text-sm text-gray-500">
                              Silakan hubungi administrator organisasi untuk informasi lebih lanjut.
                            </p>
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

  // Check permissions if required
  if (requiresPermissions && user) {
    const hasPageAccess = canAccessPage(pathToCheck);
    
    if (!hasPageAccess) {
      if (showAccessDeniedPage) {
        return (
          <StandardLayout>
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
              <div className="flex flex-1 min-h-0">
                <div className="flex-1 flex flex-col min-h-0">
                  <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
                    <div className="h-full flex flex-col overflow-hidden">
                      {/* Access Denied Content */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className="max-w-md mx-auto">
                          <div className="text-center">
                            {/* Simple icon */}
                            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                              <XCircle className="h-12 w-12 text-red-500" />
                            </div>
                            
                            {/* Clean card */}
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                                Akses Ditolak
                              </h2>
                              
                              <p className="text-gray-600 mb-6">
                                Anda tidak memiliki izin untuk mengakses halaman ini.
                              </p>
                              
                              {/* Simple info */}
                              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                <div className="text-sm text-gray-700">
                                  <p><span className="font-medium">Level Akses:</span> {getAccessLevel()}</p>
                                  {getDepartmentRestrictionMessage() && (
                                    <p className="mt-2"><span className="font-medium">Pembatasan:</span> {getDepartmentRestrictionMessage()}</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Simple buttons */}
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => window.history.back()} 
                                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                                >
                                  Kembali
                                </button>
                                <button 
                                  onClick={() => window.location.href = '/'} 
                                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
                                >
                                  Beranda
                                </button>
                              </div>
                            </div>
                            
                            {/* Simple footer */}
                            <p className="text-sm text-gray-500 mt-4">
                              Hubungi administrator jika Anda memerlukan akses
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

  // Show loading while checking auth state
  if (loading) {
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
  // This allows the login page to handle the emailJustVerified flow before redirect
  if (user) {
    const isEmailJustVerified = sessionStorage.getItem('emailJustVerified') === 'true';
    const isLoginPage = location.pathname === '/login';
    
    // Allow authenticated user to stay on login page if they just verified email
    if (isLoginPage && isEmailJustVerified) {
      return <>{children}</>;
    }
    
    return <Navigate to="/" replace />;
  }

  // User is not authenticated, render the public component
  return <>{children}</>;
};

