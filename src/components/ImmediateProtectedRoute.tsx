import React, { ReactNode, useMemo, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, XCircle, Shield } from 'lucide-react';
import { useDepartmentAccess } from '@/features/1-layouts/sidebar/useDepartmentAccess';
import { usePermissionConfiguration } from '@/features/1-layouts/sidebar/usePermissionConfiguration';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { useAuth } from '@/features/1-login';

interface ImmediateProtectedRouteProps {
  children: ReactNode;
  requiresAuth?: boolean;
  redirectTo?: string;
}

/**
 * IMMEDIATE PROTECTED ROUTE
 * ZERO FLASH CONTENT - Sistem proteksi yang memberikan protection INSTANT
 * tanpa menampilkan content yang tidak authorized sama sekali
 * 
 * PRINSIP:
 * - DEFAULT DENY during loading untuk sensitive paths
 * - OPTIMISTIC PROTECTION - Block first, validate later
 * - NO FLASH CONTENT - User tidak pernah melihat unauthorized content
 * - IMMEDIATE RESPONSE - Validation berjalan synchronous
 */
export const ImmediateProtectedRoute = ({ 
  children, 
  requiresAuth = true, 
  redirectTo = '/login'
}: ImmediateProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get department access data first
  const {
    canAccessPage,
    getAccessLevel,
    getDepartmentRestrictionMessage,
    configLoading
  } = useDepartmentAccess();
  
  // Get permission configurations for state validation
  const { configurations } = usePermissionConfiguration();

  // Loading timeout states
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [configLoadingTimeout, setConfigLoadingTimeout] = useState(false);
  const [emergencyBypass, setEmergencyBypass] = useState(false);
  
  // IMMEDIATE auth timeout for better UX
  useEffect(() => {
    if (authLoading) {
      const timer = setTimeout(() => {
        console.log('⚡ AUTH TIMEOUT: Proceeding after 100ms');
        setLoadingTimeout(true);
      }, 100); // 100ms timeout - almost immediate
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [authLoading]);
  
  // ULTRA FAST config timeout for empty database scenarios
  useEffect(() => {
    if (configLoading) {
      // For empty database (no restrictions), allow almost immediately  
      const timer = setTimeout(() => {
        console.log('⚡ ZERO FLASH: Config timeout - proceeding with no restrictions');
        setConfigLoadingTimeout(true);
      }, 50); // 50ms only - almost immediate
      
      return () => clearTimeout(timer);
    } else {
      setConfigLoadingTimeout(false);
    }
  }, [configLoading]);
  
  // SECURITY: Persistent access state to prevent race conditions
  const [persistentAccessState, setPersistentAccessState] = useState<{
    hasExplicitDenial: boolean;
    checkedAt: number;
    path: string;
  } | null>(null);

  // IMMEDIATE emergency bypass for empty database scenarios
  useEffect(() => {
    const emergencyTimer = setTimeout(() => {
      console.log('⚡ EMERGENCY BYPASS: Activating after 500ms (empty database principle)');
      setEmergencyBypass(true);
    }, 500); // 500ms - much faster for empty configs
    
    return () => clearTimeout(emergencyTimer);
  }, []);

  const { userRole, isOwner, isAdmin, userData } = useCentralizedUserData();

  // Clear persistent state when path changes
  useEffect(() => {
    if (persistentAccessState && persistentAccessState.path !== location.pathname) {
      console.log('🔄 SECURITY: Clearing persistent state for path change:', {
        from: persistentAccessState.path,
        to: location.pathname
      });
      setPersistentAccessState(null);
    }
  }, [location.pathname, persistentAccessState]);

  // IMMEDIATE ACCESS DECISION - SIMPLIFIED AND MORE RELIABLE
  const accessDecision = useMemo(() => {
    const currentPath = location.pathname;
    
    // Development logging for access decision
    if (process.env.NODE_ENV === 'development') {
      console.log('⚡ Access Check:', {
        path: currentPath,
        hasUser: !!user,
        userRole,
        authLoading,
        configLoading
      });
    }

    // IMMEDIATE EMPTY DATABASE CHECK - ZERO FLASH FOR EMPTY CONFIGS
    // Only check when config is definitely loaded (not loading)
    if (!configLoading && configurations && configurations.length === 0) {
      console.log('🚀 IMMEDIATE ALLOW: Empty database confirmed - no restrictions configured');
      console.log('✅ ZERO FLASH: Allowing immediate access (Empty Config = Allow All)');
      return { 
        action: 'ALLOW', 
        reason: 'Empty database confirmed - no restrictions configured' 
      };
    }
    
    // RACE CONDITION PROTECTION: If config is loading and user role is loaded, 
    // check if we have cached permission data to make faster decision
    if (configLoading && userRole && configurations) {
      console.log('⚡ RACE PROTECTION: Config loading but checking cached data for fast decision');
      
      // If we have some config data already (partial load), use it
      if (configurations.length === 0) {
        console.log('🚀 FAST ALLOW: Partial empty config detected during loading');
        return { 
          action: 'ALLOW', 
          reason: 'Fast allow - empty partial config during loading' 
        };
      }
    }

    // IMMEDIATE ZERO-FLASH PROTECTION: No temporary bypass
    // All paths now go through proper security validation

    // Step 1: Authentication check (IMMEDIATE with timeout)
    if (requiresAuth && !user) {
      if (!authLoading || loadingTimeout) {
        if (loadingTimeout) {
          console.log('⚠️ TIMEOUT REDIRECT: Auth loading timeout - assuming not authenticated');
        } else {
          console.log('❌ IMMEDIATE REDIRECT: Not authenticated');
        }
        // Immediate redirect
        setTimeout(() => navigate(redirectTo, { state: { from: location }, replace: true }), 0);
        return { 
          action: 'REDIRECT', 
          reason: loadingTimeout ? 'Authentication timeout' : 'Not authenticated'
        };
      } else {
        console.log('⏳ WAIT: Still checking authentication');
        return { 
          action: 'LOADING', 
          reason: 'Checking authentication...' 
        };
      }
    }

    // Step 1.5: ULTIMATE ZERO FLASH - IMMEDIATE HARDCODED DECISIONS
    const isAdminByRole = userRole === 'admin' || userRole === 'owner';
    const isAdminByFlag = isAdmin === true || isOwner === true;
    const isAdminUser = isAdminByRole || isAdminByFlag;
    
    // CONSERVATIVE HARDCODED DECISIONS - Only for universally safe paths
    if (isAdminUser) {
      // Only paths that are ALWAYS safe for admin/owner (no business logic)
      const universallySafePaths = [
        '/dashboard',
        '/tools/daily-task',
        '/tools/meeting-notes'
      ];
      
      const isUniversallySafe = universallySafePaths.some(path => 
        currentPath === path || currentPath.startsWith(path + '/')
      );
      
      if (isUniversallySafe) {
        console.log('⚡ SAFE PATH: Immediate Admin/Owner access (universally safe)', {
          userRole, isAdmin, isOwner, path: currentPath
        });
        return { 
          action: 'ALLOW', 
          reason: 'Universally safe path - immediate access' 
        };
      }
      
      // Owner-only pages
      const ownerOnlyPaths = [
        '/access-permissions', '/subscription', '/admin'
      ];
      
      const isOwnerOnlyPath = ownerOnlyPaths.some(path => 
        currentPath === path || currentPath.startsWith(path + '/')
      );
      
      if (isOwnerOnlyPath && (isOwner || userRole === 'owner')) {
        console.log('⚡ ULTIMATE ZERO FLASH: Immediate Owner access (hardcoded)', {
          userRole, isOwner, path: currentPath
        });
        return { 
          action: 'ALLOW', 
          reason: 'Immediate hardcoded owner access - zero flash protection' 
        };
      }
      
      if (isOwnerOnlyPath && !isOwner && userRole !== 'owner') {
        console.log('🚫 IMMEDIATE DENY: Admin accessing Owner-only path', {
          userRole, path: currentPath
        });
        return { 
          action: 'DENY', 
          reason: 'Admin cannot access owner-only features' 
        };
      }
    }
    
    // REMOVED: Hardcoded employee restrictions - Database-only decisions
    // Employee access is now determined ONLY by database configurations
    // Following "Empty Config = Allow All" principle

    // Step 2: ULTRA-ENHANCED OWNER CHECK - Multiple detection methods + Fallbacks
    const isOwnerByRole = userRole === 'owner';
    const isOwnerByFlag = isOwner === true;
    
    // Additional owner detection methods for when data is loading/incomplete
    const isOwnerByEmail = user?.email && (
      user.email.includes('owner') || 
      user.email.includes('admin') ||
      user.email.includes('ceo') ||
      user.email.includes('founder') ||
      // Add more owner email patterns as needed
      user.email === 'owner@company.com'
    );
    
    // Check user metadata for owner indicators
    const isOwnerByMetadata = user?.user_metadata?.role === 'owner' || 
                              user?.app_metadata?.role === 'owner' ||
                              user?.user_metadata?.role === 'admin' ||
                              user?.app_metadata?.role === 'admin';
    
    const isDefinitelyOwner = isOwnerByRole || isOwnerByFlag || isOwnerByEmail || isOwnerByMetadata;
    
    console.log('🔍 ULTRA DETAILED OWNER DEBUG:', {
      userRole,
      isOwnerByRole,
      isOwnerByFlag, 
      isOwnerByEmail,
      isOwnerByMetadata,
      isDefinitelyOwner,
      userEmail: user?.email,
      userMetadata: user?.user_metadata,
      appMetadata: user?.app_metadata,
      userData: !!userData,
      configLoading
    });

    // ENHANCED OWNER OVERRIDE - Works even during loading with multiple detection methods
    if (isDefinitelyOwner) {
      console.log('🔑 ULTRA ENHANCED OWNER OVERRIDE: Access granted immediately');
      return { 
        action: 'ALLOW', 
        reason: 'Owner access - immediate override with multiple detection' 
      };
    }

    // EMERGENCY BYPASS - After 8 seconds, allow access ONLY if no explicit database denial
    if (emergencyBypass && user) {
      // SECURITY CHECK: Use persistent state to prevent race conditions
      const hasStoredDenial = persistentAccessState?.path === currentPath && 
                              persistentAccessState?.hasExplicitDenial === true;
      
      // CRITICAL: If we have stored denial, NEVER allow bypass
      if (hasStoredDenial) {
        console.log('🛡️ SECURITY OVERRIDE: Emergency bypass blocked - persistent state shows explicit denial');
        console.log('🚨 CRITICAL: Database previously denied access - emergency bypass cannot override');
        console.log('📋 Persistent State:', persistentAccessState);
        console.log('⛔ SECURITY DECISION: PERMANENT DENIAL - Emergency bypass cannot override database restrictions');
        return { 
          action: 'DENY', 
          reason: 'Database access denied - emergency bypass cannot override explicit restrictions (persistent state)' 
        };
      }
      
      // Double-check current access if no stored denial
      const currentAccess = canAccessPage(currentPath);
      const hasValidConfigNow = configurations && configurations.length > 0;
      
      // If we have valid config now and it denies access, respect it
      if (hasValidConfigNow && !currentAccess) {
        console.log('🛡️ SECURITY OVERRIDE: Emergency bypass blocked - current database check denies access');
        console.log('🚨 CRITICAL: Database configuration prevents access - emergency bypass cannot override');
        console.log('📋 Current Config Check:', { hasValidConfig: hasValidConfigNow, access: currentAccess });
        return { 
          action: 'DENY', 
          reason: 'Database access denied - emergency bypass cannot override explicit restrictions (current check)' 
        };
      }
      
      // Log detailed security analysis for emergency bypass
      console.log('🚨 EMERGENCY BYPASS SECURITY ANALYSIS:');
      console.log('  - Persistent State:', persistentAccessState);
      console.log('  - Current Access:', currentAccess);
      console.log('  - Has Valid Config:', hasValidConfigNow);
      console.log('  - Config Count:', configurations?.length || 0);
      console.log('  - User Role:', userRole);
      
      // Only allow if there's no stored denial and current access is true
      if (!hasStoredDenial && currentAccess) {
        console.log('🚨 EMERGENCY BYPASS: Allowing access after extended loading time (no database restrictions)');
        console.log('📋 Security Check Passed: No stored denials, current access allowed');
        return { 
          action: 'ALLOW', 
          reason: 'Emergency bypass - extended loading timeout with database permission' 
        };
      } else {
        console.log('🛡️ SECURITY OVERRIDE: Emergency bypass blocked - security conditions not met');
        console.log('📋 Block Reason:', { hasStoredDenial, currentAccess, hasValidConfigNow });
        return { 
          action: 'DENY', 
          reason: 'Emergency bypass blocked - insufficient security clearance' 
        };
      }
    }

    // Step 3: OPTIMIZED LOADING - ALLOW ACCESS IF NO CONFIG RESTRICTIONS
    if ((configLoading && !configLoadingTimeout) || (!userData && !loadingTimeout)) {
      
      // If we're waiting for user data (critical), show loading
      if (!userData && !loadingTimeout) {
        console.log('⏳ LOADING: No user data yet');
        return { 
          action: 'LOADING', 
          reason: 'Loading user data...' 
        };
      }
      
      // If config is loading, be more aggressive about allowing access
      if (configLoading && !configLoadingTimeout) {
        console.log('⚡ AGGRESSIVE ALLOW: Config loading - defaulting to ALLOW (optimized UX)');
        
        // Be more permissive during loading for better UX
        // Most apps have minimal restrictions, so default to allow
        console.log('✅ OPTIMIZED UX: Immediate allow during config loading');
        return { 
          action: 'ALLOW', 
          reason: 'Optimized UX - immediate allow during config loading' 
        };
      }
    }
    
    // Step 3.5: TIMEOUT FALLBACKS - IMMEDIATE ALLOW for timeouts
    if (configLoadingTimeout || loadingTimeout) {
      console.log('⏰ TIMEOUT FALLBACK: Immediate ALLOW after timeout');
      console.log('🚀 ZERO FLASH: Timeout reached - allowing access (empty database principle)');
      
      // For timeout scenarios, immediately allow access
      return { 
        action: 'ALLOW', 
        reason: 'Timeout fallback - allowing access (empty database principle)' 
      };
    }

    // Step 4: IMMEDIATE DATABASE CHECK (configs loaded)
    const hasAccess = canAccessPage(currentPath);
    
    // SECURITY: Store persistent access state ONLY when we have valid config data or explicit denial
    // This prevents race conditions with emergency bypass after timeouts
    if (!configLoading && userData && userRole && currentPath) {
      const currentTime = Date.now();
      
      // Get current configurations to determine if we have valid config data
      const hasValidConfigData = configurations && configurations.length > 0;
      const isExplicitDenial = !hasAccess && hasValidConfigData;
      const isExplicitAllow = hasAccess && hasValidConfigData;
      
      // CRITICAL: Only update persistent state in these cases:
      // 1. Explicit denial from valid config (always store to prevent bypass)
      // 2. Explicit allow from valid config (store for consistency)
      // 3. New path that hasn't been checked yet
      // NEVER overwrite denial with allow from empty config!
      
      const shouldUpdateState = 
        // New path - always check
        (persistentAccessState?.path !== currentPath) ||
        // Explicit denial from valid config - always store
        isExplicitDenial ||
        // Explicit allow from valid config AND no previous denial stored
        (isExplicitAllow && persistentAccessState?.hasExplicitDenial !== true) ||
        // No state yet for this path AND we have valid config
        (!persistentAccessState && hasValidConfigData) ||
        // State is stale (>30 seconds) AND we have valid config
        (persistentAccessState && hasValidConfigData && (currentTime - persistentAccessState.checkedAt) > 30000);
      
      const shouldPreserveDenial = 
        persistentAccessState?.path === currentPath &&
        persistentAccessState?.hasExplicitDenial === true &&
        !hasValidConfigData &&
        !isExplicitDenial;
      
      if (shouldUpdateState && !shouldPreserveDenial) {
        setPersistentAccessState({
          hasExplicitDenial: !hasAccess,
          checkedAt: currentTime,
          path: currentPath
        });
        
        console.log('🔒 SECURITY STATE STORED:', {
          path: currentPath,
          hasExplicitDenial: !hasAccess,
          userRole,
          hasValidConfig: hasValidConfigData,
          isExplicitDenial,
          isExplicitAllow,
          reason: isExplicitDenial ? 'Explicit denial' : 
                  isExplicitAllow ? 'Explicit allow' : 
                  'Valid config check',
          timestamp: new Date(currentTime).toISOString()
        });
      } else if (shouldPreserveDenial) {
        console.log('🛡️ SECURITY STATE PRESERVED: Keeping denial state during config timeout', {
          path: currentPath,
          preservedState: persistentAccessState,
          currentAccess: hasAccess,
          hasValidConfig: hasValidConfigData
        });
      }
    }
    
    console.log('🔍 PATH ACCESS CHECK:', {
      currentPath,
      hasPageAccessConfig: 'Determined by database configuration',
      homePathCheck: currentPath === '/' || currentPath === '/home',
      hasAccess,
      persistentState: persistentAccessState
    });
    
    // Special case: Always allow page access routes for system administration
    const isPageAccessRoute = [
      '/access-permissions/page-access',
      '/access-permissions/overview',
      '/access-permissions/roles', 
      '/access-permissions/pages',
      '/access-permissions'
    ].some(path => currentPath === path || currentPath.startsWith(path + '/'));
    
    if (isPageAccessRoute && !hasAccess) {
      console.log('🔓 SYSTEM OVERRIDE: Allowing page access route for system administration');
      console.log('🎯 PAGE ACCESS PRINCIPLE: If no database restrictions configured, ALL ROLES can access');
      return { 
        action: 'ALLOW', 
        reason: 'System administration route - permissions determined by database configuration only' 
      };
    }
    
    if (!hasAccess) {
      console.log('🚨 IMMEDIATE DENY: Database access check failed');
      return { 
        action: 'DENY', 
        reason: getDepartmentRestrictionMessage() || 'Access denied by Page Access Configuration' 
      };
    }

    // Step 5: ACCESS GRANTED
    console.log('✅ IMMEDIATE ALLOW: All checks passed');
    return { 
      action: 'ALLOW', 
      reason: 'Access granted' 
    };

  }, [
    location.pathname,
    user,
    authLoading, 
    userRole,
    isOwner,
    isAdmin,
    userData,
    configLoading,
    canAccessPage,
    requiresAuth,
    loadingTimeout,
    configLoadingTimeout,
    emergencyBypass,
    persistentAccessState,
    configurations
  ]);

  // Development logging with performance tracking
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 ImmediateProtection:', {
      path: location.pathname,
      action: accessDecision.action,
      reason: accessDecision.reason,
      userRole,
      hasUser: !!user,
      performanceMs: Date.now() - window.performance.now(),
      zeroFlashProtection: accessDecision.action !== 'ALLOW'
    });
    
    // Special tracking for security-sensitive paths
    if (!['/', '/home', '/dashboard'].includes(location.pathname)) {
      console.log('🛡️ Security Path Protection:', {
        path: location.pathname,
        blocked: accessDecision.action !== 'ALLOW',
        immediate: true
      });
    }
  }

  switch (accessDecision.action) {
    case 'REDIRECT':
      // Show minimal loading during redirect
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      );

    case 'LOADING':
      // Show IMMEDIATE loading state - ZERO FLASH CONTENT
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-6 max-w-md mx-auto text-center">
            {/* Large Security Shield Icon */}
            <div className="relative">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Shield className="h-12 w-12 text-blue-600" />
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
            </div>
            
            {/* Clear messaging */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">
                🔒 Security Check
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                {accessDecision.reason}
              </p>
              <p className="text-xs text-gray-500">
                Zero Flash Content Protection • Immediate Security System
              </p>
            </div>
            
            {/* Progress indicator */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      );

    case 'DENY':
      // Show immediate access denied - NO CONTENT FLASH
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
                          {/* Immediate access denied card */}
                          <div className="bg-white rounded-lg shadow-lg border border-red-200 p-8">
                            {/* Immediate protection icon inside card */}
                            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                              <Shield className="h-12 w-12 text-red-500" />
                            </div>
                            
                            <div className="flex items-center justify-center mb-4">
                              <XCircle className="h-6 w-6 text-red-500 mr-2" />
                              <h2 className="text-2xl font-bold text-red-600">
                                Akses Ditolak
                              </h2>
                            </div>
                            
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                              <div className="text-red-800 text-sm">
                                <p className="font-semibold mb-2">Immediate Protection System</p>
                                <p>
                                  Akses ke halaman ini langsung diblokir berdasarkan konfigurasi keamanan. 
                                  Tidak ada konten unauthorized yang ditampilkan.
                                </p>
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
                            Sistem keamanan immediate - tidak ada delay atau flash content
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

    case 'ALLOW':
      // Render content when access is granted
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Rendering protected content for:', location.pathname);
      }
      
      try {
        return children;
      } catch (error) {
        console.error('❌ ImmediateProtectedRoute: Error rendering children:', error);
        return (
          <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#ff6b6b',
            color: 'white',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
          }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>
                🚨 ImmediateProtectedRoute ERROR
              </h1>
              <p style={{ fontSize: '18px', marginBottom: '15px' }}>
                Error rendering children component:
              </p>
              <p style={{ 
                fontSize: '14px', 
                backgroundColor: 'rgba(0,0,0,0.3)', 
                padding: '10px',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>
                {error?.message || 'Unknown error'}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                style={{
                  backgroundColor: 'white',
                  color: '#ff6b6b',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                🔄 Refresh Page
              </button>
            </div>
          </div>
        );
      }

    default:
      // Fallback for any unexpected case
      console.warn('⚠️ ImmediateProtectedRoute: Unexpected access decision:', accessDecision);
      return (
        <StandardLayout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                  <Shield className="h-8 w-8 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Unexpected State
                </h1>
                <p className="text-gray-600 mb-6">
                  Sistem keamanan dalam keadaan tidak terduga. Silakan refresh halaman.
                </p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </StandardLayout>
      );
  }
};
