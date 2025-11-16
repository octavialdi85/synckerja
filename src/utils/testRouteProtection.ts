/**
 * Route Protection Test Utilities
 * 
 * This utility helps test and verify that all route protection is working correctly.
 * It can be used in development to ensure comprehensive security coverage.
 */

import { ROUTE_PERMISSIONS } from '@/config/routePermissions';

export interface RouteProtectionTestResult {
  path: string;
  hasRoute: boolean;
  hasPermissionConfig: boolean;
  requiresPermissions: boolean;
  isProtected: boolean;
  issues: string[];
}

/**
 * Test results for route protection coverage
 */
export interface RouteProtectionCoverage {
  totalRoutes: number;
  protectedRoutes: number;
  unprotectedRoutes: number;
  missingRoutes: number;
  coveragePercentage: number;
  issues: RouteProtectionTestResult[];
}

/**
 * Mock function to simulate checking if a route exists in App.tsx
 * In a real implementation, this would parse the actual routing configuration
 */
const getExistingRoutes = (): string[] => {
  // This would normally parse App.tsx or use React Router's route manifest
  // For now, we'll return the routes we know exist based on our implementation
  return [
    '/',
    '/dashboard',
    '/subscription',
    '/subscription/overview',
    '/subscription/plans',
    '/subscription/management',
    '/employees',
    '/employees/add',
    '/access-permissions/page-access',
    '/digital-marketing/social-media',
    '/digital-marketing/social-media/dashboard',
    '/digital-marketing/social-media/content-calendar',
    '/digital-marketing/social-media/settings',
    '/admin',
    '/admin/settings',
    '/admin/users',
    '/users/permissions',
    '/users/roles',
    '/recruitment',
    '/recruitment/interviewees',
    '/access-permissions/pages',
    '/access-permissions/roles',
    '/access-permissions/users',
    '/password-manager',
    '/daily-task',
    '/tools/daily-task',
    '/tools/meeting-notes',
    '/tools/campaign-calculator',
    '/my-info/personal',
    '/my-info/address',
    '/my-info/employment',
    '/my-info/education/formal',
    '/my-info/education/informal',
    '/my-info/work',
    '/my-info/family',
    '/my-info/attendance',
    '/my-info/leave-permit',
    '/my-info/documents',
    '/my-info/payroll'
  ];
};

/**
 * Get expected permission configurations based on database schema
 */
const getExpectedPermissionPaths = (): string[] => {
  return [
    '/dashboard',
    '/employee-management',
    '/recruitment',
    '/access-permissions',
    '/access-permissions/page-access',
    '/access-permissions/pages',
    '/access-permissions/roles',
    '/access-permissions/users',
    '/subscription',
    '/digital-marketing',
    '/admin',
    '/admin/settings',
    '/admin/users',
    '/users/permissions',
    '/users/roles'
  ];
};

/**
 * Test route protection coverage
 */
export const testRouteProtectionCoverage = (): RouteProtectionCoverage => {
  const existingRoutes = getExistingRoutes();
  const expectedPermissionPaths = getExpectedPermissionPaths();
  const routePermissions = ROUTE_PERMISSIONS;
  
  const results: RouteProtectionTestResult[] = [];
  
  // Test all routes that should have permissions
  expectedPermissionPaths.forEach(permissionPath => {
    const issues: string[] = [];
    
    // Find corresponding route(s) - some permission paths map to multiple routes
    const matchingRoutes = existingRoutes.filter(route => {
      // Handle mapping cases
      if (permissionPath === '/employee-management') {
        return route.startsWith('/employees');
      }
      if (permissionPath === '/digital-marketing') {
        return route.startsWith('/digital-marketing');
      }
      return route === permissionPath || route.startsWith(permissionPath + '/');
    });
    
    const hasRoute = matchingRoutes.length > 0;
    const routeConfig = routePermissions.find(r => 
      r.path === permissionPath || 
      matchingRoutes.includes(r.path)
    );
    
    const requiresPermissions = routeConfig?.requiresPermissions ?? false;
    
    if (!hasRoute) {
      issues.push(`No route exists for permission path: ${permissionPath}`);
    }
    
    if (!requiresPermissions) {
      issues.push(`Route exists but doesn't require permissions: ${permissionPath}`);
    }
    
    results.push({
      path: permissionPath,
      hasRoute,
      hasPermissionConfig: true,
      requiresPermissions,
      isProtected: hasRoute && requiresPermissions,
      issues
    });
  });
  
  // Test routes that exist but might not be properly protected
  existingRoutes.forEach(route => {
    // Skip already tested permission paths
    const isAlreadyTested = results.some(r => 
      r.path === route || 
      route.startsWith(r.path + '/') ||
      (r.path === '/employee-management' && route.startsWith('/employees'))
    );
    
    if (isAlreadyTested) return;
    
    const routeConfig = routePermissions.find(r => r.path === route);
    const issues: string[] = [];
    
    // Check if this route should have permissions but doesn't
    const shouldBeProtected = [
      '/admin', '/users', '/subscription', '/digital-marketing',
      '/access-permissions', '/recruitment', '/dashboard'
    ].some(protectedPrefix => route.startsWith(protectedPrefix));
    
    const requiresPermissions = routeConfig?.requiresPermissions ?? false;
    
    if (shouldBeProtected && !requiresPermissions) {
      issues.push(`Route should be protected but isn't: ${route}`);
    }
    
    results.push({
      path: route,
      hasRoute: true,
      hasPermissionConfig: expectedPermissionPaths.includes(route),
      requiresPermissions,
      isProtected: requiresPermissions,
      issues
    });
  });
  
  const totalRoutes = results.length;
  const protectedRoutes = results.filter(r => r.isProtected).length;
  const unprotectedRoutes = totalRoutes - protectedRoutes;
  const missingRoutes = results.filter(r => !r.hasRoute).length;
  const issuesFound = results.filter(r => r.issues.length > 0);
  
  return {
    totalRoutes,
    protectedRoutes,
    unprotectedRoutes,
    missingRoutes,
    coveragePercentage: Math.round((protectedRoutes / totalRoutes) * 100),
    issues: issuesFound
  };
};

/**
 * Display route protection coverage report in console
 */
export const displayRouteProtectionReport = () => {
  const coverage = testRouteProtectionCoverage();
  
  console.group('🛡️ Route Protection Coverage Report');
  console.log(`📊 Total Routes: ${coverage.totalRoutes}`);
  console.log(`✅ Protected Routes: ${coverage.protectedRoutes}`);
  console.log(`⚠️  Unprotected Routes: ${coverage.unprotectedRoutes}`);
  console.log(`❌ Missing Routes: ${coverage.missingRoutes}`);
  console.log(`📈 Coverage: ${coverage.coveragePercentage}%`);
  
  if (coverage.issues.length > 0) {
    console.group('⚠️ Issues Found:');
    coverage.issues.forEach(issue => {
      console.group(`🔍 ${issue.path}`);
      console.log(`Has Route: ${issue.hasRoute}`);
      console.log(`Has Permission Config: ${issue.hasPermissionConfig}`);
      console.log(`Requires Permissions: ${issue.requiresPermissions}`);
      console.log(`Is Protected: ${issue.isProtected}`);
      if (issue.issues.length > 0) {
        console.log('Issues:', issue.issues);
      }
      console.groupEnd();
    });
    console.groupEnd();
  } else {
    console.log('🎉 No issues found! All routes are properly protected.');
  }
  
  console.groupEnd();
  
  return coverage;
};

/**
 * Test specific route protection
 */
export const testSpecificRoute = (routePath: string) => {
  console.group(`🧪 Testing Route Protection: ${routePath}`);
  
  const existingRoutes = getExistingRoutes();
  const expectedPermissionPaths = getExpectedPermissionPaths();
  const routeConfig = ROUTE_PERMISSIONS.find(r => r.path === routePath);
  
  const hasRoute = existingRoutes.includes(routePath);
  const hasPermissionConfig = expectedPermissionPaths.includes(routePath);
  const requiresPermissions = routeConfig?.requiresPermissions ?? false;
  
  console.log(`Route exists in App.tsx: ${hasRoute ? '✅' : '❌'}`);
  console.log(`Has permission configuration: ${hasPermissionConfig ? '✅' : '❌'}`);
  console.log(`Requires permissions: ${requiresPermissions ? '✅' : '❌'}`);
  console.log(`Expected roles: ${routeConfig?.defaultRoles?.join(', ') || 'None'}`);
  
  const isFullyProtected = hasRoute && requiresPermissions;
  console.log(`Fully protected: ${isFullyProtected ? '✅' : '❌'}`);
  
  if (!isFullyProtected) {
    console.warn('⚠️ This route may not be properly protected!');
  }
  
  console.groupEnd();
  
  return {
    hasRoute,
    hasPermissionConfig,
    requiresPermissions,
    isFullyProtected
  };
};

// Make available globally in development
if (typeof window !== 'undefined' && (import.meta.env?.DEV || process.env.NODE_ENV === 'development')) {
  (window as any).testRouteProtection = {
    displayReport: displayRouteProtectionReport,
    testRoute: testSpecificRoute,
    getCoverage: testRouteProtectionCoverage
  };

  try {
    const { logger } = await import('@/config/logger');
    logger.once('dev-utils:testRouteProtection', () => {
      console.log('🧪 Route protection testing utilities available at window.testRouteProtection');
      console.log('Available functions:');
      console.log('- displayReport() - Show full coverage report');
      console.log('- testRoute(path) - Test specific route protection');
      console.log('- getCoverage() - Get coverage data');
    });
  } catch {
    // Fallback: keep original single-shot console logs if logger not available
    console.log('🧪 Route protection testing utilities available at window.testRouteProtection');
    console.log('Available functions:');
    console.log('- displayReport() - Show full coverage report');
    console.log('- testRoute(path) - Test specific route protection');
    console.log('- getCoverage() - Get coverage data');
  }
}
