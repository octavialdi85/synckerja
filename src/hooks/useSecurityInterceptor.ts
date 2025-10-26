import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';

/**
 * SECURITY INTERCEPTOR
 * Global hook to intercept and block unauthorized URL access attempts
 * Protects specific /access-permissions/* routes from manual URL entry
 * NOTE: /access-permissions/page-access uses database-only access control
 */
export const useSecurityInterceptor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, isOwner, isAdmin, userData } = useCentralizedUserData();

  // Protected paths yang memerlukan interceptor
  // NOTE: /access-permissions/page-access removed - uses database-only access control
  const PROTECTED_PATHS = [
    '/access-permissions',
    '/access-permissions/overview', 
    '/access-permissions/roles',
    '/access-permissions/pages'
  ];

  // Roles yang diizinkan mengakses protected paths
  const ALLOWED_ROLES = ['owner', 'admin'];

  // Check if current path is protected
  const isProtectedPath = (pathname: string) => {
    // EXPLICITLY EXCLUDE page-access route (database-only control)
    if (pathname === '/access-permissions/page-access') {
      return false;
    }
    
    return PROTECTED_PATHS.some(path => 
      pathname === path || pathname.startsWith(path + '/')
    );
  };

  // Check if user is authorized for protected paths  
  const isAuthorizedForProtectedPaths = () => {
    if (!userData || !userRole) return false;
    if (!isOwner && !isAdmin) return false;
    return ALLOWED_ROLES.includes(userRole);
  };

  // URL Tampering Detection & Prevention
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Skip if not a protected path
    if (!isProtectedPath(currentPath)) return;

    // Skip if still loading user data
    if (!userData || !userRole) return;

    // Check authorization
    if (!isAuthorizedForProtectedPaths()) {
      // LOG SECURITY INCIDENT
      console.warn('🚨 SECURITY ALERT: Unauthorized URL access attempt detected!', {
        user: userData?.email || 'Unknown',
        role: userRole || 'Unknown',
        attemptedPath: currentPath,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        referrer: document.referrer || 'Direct',
      });

      // Send security event (could be sent to monitoring service)
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'security_violation', {
          event_category: 'Security',
          event_label: 'Unauthorized Access Attempt',
          custom_parameters: {
            attempted_path: currentPath,
            user_role: userRole,
            user_id: userData?.id
          }
        });
      }

      // IMMEDIATE REDIRECT - No delay to prevent content flash
      navigate('/', { replace: true });
      return;
    }

    // Log authorized access for audit trail
    console.log('✅ SECURITY: Authorized access to protected path', {
      user: userData?.email,
      role: userRole,
      path: currentPath,
      timestamp: new Date().toISOString()
    });

  }, [location.pathname, userRole, isOwner, isAdmin, userData]);

  // Browser navigation interception (back/forward buttons)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const targetPath = window.location.pathname;
      
      if (isProtectedPath(targetPath) && !isAuthorizedForProtectedPaths()) {
        // Prevent navigation
        event.preventDefault();
        
        // Log security incident
        console.warn('🚨 SECURITY: Browser navigation to protected path blocked', {
          user: userData?.email || 'Unknown',
          role: userRole || 'Unknown', 
          targetPath,
          timestamp: new Date().toISOString()
        });

        // Redirect to home
        navigate('/', { replace: true });
      }
    };

    // Add event listener
    window.addEventListener('popstate', handlePopState);
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [userRole, isOwner, isAdmin, userData]);

  // URL Bar manipulation detection
  useEffect(() => {
    let lastUrl = location.pathname;
    
    const checkUrlManipulation = () => {
      const currentUrl = window.location.pathname;
      
      if (currentUrl !== lastUrl) {
        if (isProtectedPath(currentUrl) && !isAuthorizedForProtectedPaths()) {
          console.warn('🚨 SECURITY: URL manipulation detected', {
            from: lastUrl,
            to: currentUrl,
            user: userData?.email || 'Unknown',
            role: userRole || 'Unknown',
            timestamp: new Date().toISOString()
          });
          
          // Force redirect
          window.location.href = '/';
        }
        lastUrl = currentUrl;
      }
    };

    // Check every 100ms for URL changes (lightweight monitoring)
    const intervalId = setInterval(checkUrlManipulation, 100);

    return () => clearInterval(intervalId);
  }, [userRole, isOwner, isAdmin, userData]);

  return {
    isProtectedPath,
    isAuthorizedForProtectedPaths,
    protectedPaths: PROTECTED_PATHS
  };
};
