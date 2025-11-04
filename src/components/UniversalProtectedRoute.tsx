import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { XCircle, Shield } from 'lucide-react';
import { useDepartmentAccess } from '@/features/1-layouts/sidebar/useDepartmentAccess';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { useAuth } from '@/features/1-login';
import { LoadingDots } from './LoadingDots';

interface UniversalProtectedRouteProps {
  children: ReactNode;
  requiresAuth?: boolean;
  redirectTo?: string;
}

/**
 * UNIVERSAL PROTECTED ROUTE
 * Sistem proteksi universal yang OTOMATIS menerapkan SEMUA konfigurasi 
 * dari Page Access Configuration database tanpa manual intervention
 * 
 * PRINSIP: 
 * - SEMUA route dikontrol oleh database Page Access Configuration
 * - Tidak perlu manual setting requiresPermissions per route
 * - Auto-deny jika path sensitive tapi tidak dikonfigurasi
 * - Auto-allow untuk path non-sensitive
 */
export const UniversalProtectedRoute = ({ 
  children, 
  requiresAuth = true, 
  redirectTo = '/login'
}: UniversalProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedReason, setDeniedReason] = useState('');

  const {
    canAccessPage,
    getAccessLevel,
    getDepartmentRestrictionMessage,
    configLoading
  } = useDepartmentAccess();

  const { userRole, isOwner, isAdmin } = useCentralizedUserData();

  // Universal access validation
  useEffect(() => {
    const validateUniversalAccess = async () => {
      const currentPath = location.pathname;
      
      console.group('🌍 UNIVERSAL ROUTE PROTECTION');
      console.log('Validating Path:', currentPath);
      console.log('User Context:', { userRole, isOwner, isAdmin });

      // Step 1: Authentication check
      if (requiresAuth && !user) {
        console.log('❌ Authentication required but user not logged in');
        console.groupEnd();
        navigate(redirectTo, { state: { from: location }, replace: true });
        return;
      }

      // Step 2: Wait for configurations to load
      if (configLoading) {
        console.log('⏳ Still loading page configurations...');
        console.groupEnd();
        return; // Keep showing loading
      }

      // Step 3: UNIVERSAL DATABASE CHECK
      // Every authenticated route MUST check Page Access Configuration
      const hasAccess = canAccessPage(currentPath);
      
      console.log('Database Access Check Result:', hasAccess);
      console.log('Access Level:', getAccessLevel());
      
      if (!hasAccess) {
        console.log('🚨 ACCESS DENIED by Page Access Configuration');
        console.log('Denied Reason:', getDepartmentRestrictionMessage() || 'Insufficient permissions');
        
        setAccessDenied(true);
        setDeniedReason(getDepartmentRestrictionMessage() || 'You do not have permission to access this page');
        setIsValidating(false);
        console.groupEnd();
        return;
      }

      // Step 4: Access granted
      console.log('✅ ACCESS GRANTED by Page Access Configuration');
      setAccessDenied(false);
      setDeniedReason('');
      setIsValidating(false);
      console.groupEnd();
    };

    validateUniversalAccess();
  }, [
    location.pathname, 
    user, 
    userRole, 
    isOwner, 
    isAdmin, 
    configLoading, 
    requiresAuth
  ]);

  // Unified loading state - combine all loading checks into one simple message
  const isLoading = loading || (requiresAuth && configLoading) || isValidating;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <LoadingDots size="lg" />
          <p className="text-sm text-gray-600">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (accessDenied) {
    return (
      <StandardLayout>
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-lg mx-auto">
                      <div className="text-center">
                        {/* Universal protection icon */}
                        <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                          <Shield className="h-12 w-12 text-red-500" />
                        </div>
                        
                        {/* Access denied card */}
                        <div className="bg-white rounded-lg shadow-lg border border-red-200 p-8">
                          <div className="flex items-center justify-center mb-4">
                            <XCircle className="h-6 w-6 text-red-500 mr-2" />
                            <h2 className="text-2xl font-bold text-red-600">
                              Akses Ditolak
                            </h2>
                          </div>
                          
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <div className="text-red-800 text-sm">
                              <p className="font-semibold mb-2">Universal Route Protection</p>
                              <p>
                                Halaman ini dikontrol oleh sistem Page Access Configuration. 
                                Akses Anda telah dibatasi berdasarkan role dan konfigurasi organisasi.
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                            <div className="text-sm text-gray-700 space-y-2">
                              <p><span className="font-semibold">Path:</span> {location.pathname}</p>
                              <p><span className="font-semibold">Role Anda:</span> 
                                <span className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">
                                  {userRole}
                                </span>
                              </p>
                              <p><span className="font-semibold">Level Akses:</span> {getAccessLevel()}</p>
                              {deniedReason && (
                                <p className="text-red-600">
                                  <span className="font-semibold">Alasan:</span> {deniedReason}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <button 
                              onClick={() => navigate('/', { replace: true })} 
                              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                            >
                              Kembali ke Beranda
                            </button>
                            <button 
                              onClick={() => window.history.back()} 
                              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors font-semibold"
                            >
                              Kembali
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-6">
                          Hubungi administrator untuk mendapatkan akses ke halaman ini
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
  }

  // Access granted - render children
  return <>{children}</>;
};
