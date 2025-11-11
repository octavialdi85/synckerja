import { useMemo } from 'react';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { usePermissionConfiguration } from './usePermissionConfiguration';

// Fallback restricted pages for employee role (used when database config is not available)
// Updated to allow all access for employees
const FALLBACK_EMPLOYEE_RESTRICTED_PAGES: string[] = [];

// Define pages that are always unrestricted during loading (accessible by anyone while config is loading)
// IMPORTANT: These pages follow the PRINCIPLE that access control is determined ONLY by database configuration
// If no restrictions are configured in the database, ANY AUTHENTICATED USER can access these pages
const UNRESTRICTED_DURING_LOADING = [
  '/access-permissions/page-access',  // System administration - access determined by DB config only
  '/access-permissions/overview',
  '/access-permissions/roles',
  '/access-permissions/pages',
  '/access-permissions',
  '/subscription/management',         // Subscription management
  '/subscription',                   // Subscription pages
  '/password-manager',              // Password management tools
  '/tools/daily-task',              // Daily task management
  '/tools/meeting-notes',           // Meeting notes management
  '/tools/campaign-calculator',     // Campaign calculator tool
  '/tools'                          // Tools section
  // REMOVED: /employees and /employees/add - these should be restricted by database config
];

// Define pages that require cross-department access
const CROSS_DEPARTMENT_PAGES = [
  '/employees',
  '/reports',
  '/company',
  '/organization'
];

// Optimized cache with intelligent clearing
const accessCache = new Map<string, { result: boolean; timestamp: number; configHash: string }>();
const ACCESS_CACHE_TTL = 30000; // 30 seconds - longer cache
let lastClearTime = 0;
const MIN_CLEAR_INTERVAL = 5000; // Minimum 5 seconds between clears
const isDev = import.meta.env.DEV; // Define once at module level for performance

// Smart cache clearing - only when necessary
export const clearAccessCache = () => {
  const now = Date.now();
  if (now - lastClearTime < MIN_CLEAR_INTERVAL) {
    if (isDev) {
      console.log('🔄 CACHE: Skipping clear - too recent (', Math.round((now - lastClearTime) / 1000), 's ago)');
    }
    return;
  }
  
  if (isDev) {
    console.log('🧹 Smart clearing access cache with', accessCache.size, 'entries');
  }
  accessCache.clear();
  lastClearTime = now;
  if (isDev) {
    console.log('✅ Access cache cleared');
  }
};

// Debug function to inspect cache
export const debugAccessCache = () => {
  console.log('🔍 Access Cache Debug:');
  console.log('Cache size:', accessCache.size);
  console.log('Cache entries:');
  accessCache.forEach((value, key) => {
    console.log(`  ${key}:`, value);
  });
};

// Function to force clear cache and debug - for troubleshooting
export const forceClearCache = () => {
  console.log('🔥 FORCE CLEARING ALL CACHE');
  console.log('Cache before clear:', accessCache.size, 'entries');
  accessCache.forEach((value, key) => {
    console.log(`  Removing: ${key} = ${value.result}`);
  });
  accessCache.clear();
  console.log('✅ Force clear completed');
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugAccessCache = debugAccessCache;
  (window as any).forceClearCache = forceClearCache;
  (window as any).clearAccessCache = clearAccessCache;
}

export const useDepartmentAccess = () => {
  const { userRole, employee, userData, isOwner, isAdmin } = useCentralizedUserData();
  const { configurations, loading: configLoading } = usePermissionConfiguration();
  
  const departmentAccess = useMemo(() => {
    const currentDepartmentId = employee?.department_id;
    
    // Create config hash for intelligent cache invalidation
    const configHash = configurations.map(c => `${c.id}-${c.updated_at}`).join('|');
    
    // Smart cache clearing - only when config actually changes
    const lastConfigHash = accessCache.size > 0 ? 
      Array.from(accessCache.values())[0]?.configHash : '';
    
    // isDev is defined at module level
    if (configHash !== lastConfigHash && configurations.length > 0) {
      if (isDev) {
        console.log('🔄 CONFIG CHANGED: Smart cache clear triggered');
      }
      clearAccessCache();
    }
    
    // Check if user can access a specific page
    const canAccessPage = (pagePath: string): boolean => {
      // isDev is defined at module level
      // IMPORTANT PRINCIPLE FOR /access-permissions/page-access:
      // Access is determined ONLY by database configuration. If no restrictions are configured,
      // ANY AUTHENTICATED USER can access the page access configuration.
      
      // OWNER/ADMIN OVERRIDE - Always grant access immediately
      if (isOwner || userRole === 'owner') {
        if (isDev) {
          console.log('🔑 CAN ACCESS PAGE OVERRIDE: Owner full access to', pagePath);
        }
        return true;
      }
      
      if (isAdmin || userRole === 'admin') {
        if (isDev) {
          console.log('🔧 CAN ACCESS PAGE OVERRIDE: Admin full access to', pagePath);
        }
        return true;
      }

      
      // Don't make access decisions if we're still loading critical data
      if (configLoading) {
        // Check if this is an unrestricted path during loading
        const normalize = (p?: string) => {
          if (!p) return '/';
          let s = p.trim();
          if (!s.startsWith('/')) s = '/' + s;
          if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
          return s.toLowerCase();
        };
        
        const normalizedPath = normalize(pagePath);
        const isUnrestrictedDuringLoading = UNRESTRICTED_DURING_LOADING.some(unrestrictedPath => {
          const normalizedUnrestricted = normalize(unrestrictedPath);
          return normalizedPath === normalizedUnrestricted || normalizedPath.startsWith(normalizedUnrestricted + '/');
        });
        
        if (isUnrestrictedDuringLoading) {
          if (isDev) {
            console.log('✅ LOADING BYPASS: Allowing access to unrestricted path during loading:', pagePath);
          }
          return true;
        }
        
        if (isDev) {
          console.log('⏳ Still loading configurations, deferring access decision for:', pagePath);
          console.log('🔍 Tip: If this path should be accessible during loading, add it to UNRESTRICTED_DURING_LOADING array');
        }
        return false; // Deny access while loading to be safe for other paths
      }
      
      // Don't make access decisions if user role is still loading (null but should have a role)
      if (userData && !userRole && employee) {
        // Check if this is an unrestricted path during loading
        const normalize = (p?: string) => {
          if (!p) return '/';
          let s = p.trim();
          if (!s.startsWith('/')) s = '/' + s;
          if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
          return s.toLowerCase();
        };
        
        const normalizedPath = normalize(pagePath);
        const isUnrestrictedDuringLoading = UNRESTRICTED_DURING_LOADING.some(unrestrictedPath => {
          const normalizedUnrestricted = normalize(unrestrictedPath);
          return normalizedPath === normalizedUnrestricted || normalizedPath.startsWith(normalizedUnrestricted + '/');
        });
        
        if (isUnrestrictedDuringLoading) {
          if (isDev) {
            console.log('✅ USER LOADING BYPASS: Allowing access to unrestricted path during user loading:', pagePath);
          }
          return true;
        }
        
        if (isDev) {
          console.log('⏳ User role still loading, deferring access decision for:', pagePath);
        }
        return false; // Deny access while loading to be safe for other paths
      }
      
      const normalize = (p?: string) => {
        if (!p) return '/';
        let s = p.trim();
        if (!s.startsWith('/')) s = '/' + s;
        if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
        return s.toLowerCase();
      };

      const current = normalize(pagePath);
      
      // Enhanced debug logging (development mode only)
      // isDev is already defined at the start of canAccessPage function
      if (isDev) {
        console.group(`🔍 PERMISSION DEBUG: ${pagePath}`);
        console.log('Path Details:', {
          originalPath: pagePath,
          normalizedPath: current,
          userRole,
          isOwner,
          isAdmin,
          employeeId: employee?.id,
          organizationId: userData?.active_organization_id
        });
        console.log('All Configurations:', configurations);
        console.log('Configuration Count:', configurations.length);
      }
      
      // Check cache first with config hash validation
      const cacheKey = `${current}-${userRole}-${employee?.id || 'no-emp'}`;
      const cached = accessCache.get(cacheKey);
      if (cached && 
          (Date.now() - cached.timestamp) < ACCESS_CACHE_TTL &&
          cached.configHash === configHash) {
        if (isDev) {
          console.log('📋 CACHE HIT: Using cached result:', cached.result);
        }
        if (isDev) {
          console.groupEnd();
        }
        return cached.result;
      } else if (cached && cached.configHash !== configHash) {
        if (isDev) {
          console.log('🔄 CACHE INVALIDATED: Config hash mismatch');
        }
      }

      // Find matching configuration from database first (normalized match)
      // Prioritize organization-specific configurations over system-wide ones
      const matchingConfigs = configurations.filter(c => {
        const base = normalize(c.page_path);
        const matches = current === base || current.startsWith(base + '/');
        if (isDev) {
          console.log('🔍 Path matching:', {
            configPath: c.page_path,
            normalizedBase: base,
            current,
            exactMatch: current === base,
            prefixMatch: current.startsWith(base + '/'),
            matches,
            orgId: c.organization_id
          });
        }
        return matches;
      });

      if (isDev) {
        console.log('Matching Configurations:', matchingConfigs);
      }
      
      // Prioritize organization-specific config over system-wide config
      const orgSpecificConfig = matchingConfigs.find(c => c.organization_id !== null);
      const systemWideConfig = matchingConfigs.find(c => c.organization_id === null);
      const config = orgSpecificConfig || systemWideConfig;
      
      if (isDev) {
        console.log('Priority Selection:', {
          orgSpecificConfig: orgSpecificConfig ? {
            id: orgSpecificConfig.id,
            path: orgSpecificConfig.page_path,
            roles: orgSpecificConfig.roles_allowed,
            orgId: orgSpecificConfig.organization_id
          } : null,
          systemWideConfig: systemWideConfig ? {
            id: systemWideConfig.id,
            path: systemWideConfig.page_path,
            roles: systemWideConfig.roles_allowed,
            orgId: systemWideConfig.organization_id
          } : null,
          selectedConfig: config ? {
            id: config.id,
            path: config.page_path,
            roles: config.roles_allowed,
            orgId: config.organization_id
          } : null
        });
      }
      
      // If no configuration exists for this path, ALLOW ACCESS by default
      // This means Page Access Configuration is empty/not configured = NO RESTRICTIONS
      if (!config) {
        if (isDev) {
          console.log('🔓 NO CONFIG FOUND = DEFAULT ALLOW ACCESS');
          console.log(`✅ Path "${current}" has NO PAGE ACCESS RESTRICTIONS configured`);
          console.log('🎯 PRINCIPLE: Empty database = No restrictions = Allow all authenticated users');
          
          // SPECIAL LOG FOR PAGE ACCESS ROUTE
          if (current === '/access-permissions/page-access') {
            console.log('🔧 PAGE ACCESS MANAGEMENT: No restrictions configured - ANY AUTHENTICATED USER can access');
            console.log('📋 This allows users to configure page access when database is empty');
          }
          
          // CLEAR DEBUG: Show exact decision
          console.log('🚀 DECISION: ALLOW ACCESS (No restrictions configured in database)');
          console.log(`User ${userRole} can access "${current}" - no restrictions found`);
          console.groupEnd();
        }
        const result = true;
        accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
        return result;
      }
      
      if (isDev) {
        console.log('✅ Config found:', {
          configPath: config.page_path,
          configTitle: config.page_title,
          rolesAllowed: config.roles_allowed,
          userRole,
          organizationId: config.organization_id,
          configType: config.organization_id ? 'Organization-specific' : 'System-wide'
        });
      }
      
      // Check for exception paths first - if current path is in exception paths, allow access
      if (isDev) {
        console.log('Checking Exception Paths:', config.exception_paths);
      }
      if (config.exception_paths && config.exception_paths.length > 0) {
        const isExceptionPath = config.exception_paths.some(exceptionPath => {
          const ex = normalize(exceptionPath);
          const matches = current === ex || current.startsWith(ex + '/');
          if (isDev) {
            console.log(`Exception path check: ${exceptionPath} (normalized: ${ex}) vs ${current} = ${matches}`);
          }
          return matches;
        });
        
        if (isDev) {
          console.log('Is Exception Path:', isExceptionPath);
        }
        if (isExceptionPath) {
          if (isDev) {
            console.log('✅ ALLOWED: Exception path access');
            console.groupEnd();
          }
          const result = true;
          accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
          return result;
        }
      }
      
      // ENHANCED OWNERS CHECK - Multiple ways to detect owner
      const isOwnerByRole = (userRole as string) === 'owner' || (userRole as string) === 'admin' || isAdmin === true;
      const isOwnerByFlag = isOwner === true;
      const isDefinitelyOwner = isOwnerByRole || isOwnerByFlag;
      
      if (isDev) {
        console.log('Enhanced Owner Check:', { 
          isOwner, 
          userRole, 
          isOwnerByRole, 
          isOwnerByFlag, 
          isDefinitelyOwner 
        });
      }
      
      if (isDefinitelyOwner) {
        if (isDev) {
          console.log('✅ ALLOWED: Owner always has full access (enhanced detection)');
          console.groupEnd();
        }
        const result = true;
        accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
        return result;
      }
      
      if (!userRole) {
        if (isDev) {
          console.log('❌ DENIED: No user role found');
          console.groupEnd();
        }
        const result = false;
        accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
        return result;
      }
      
      // Check if user's role is allowed based on database configuration
      const hasRoleAccess = (config.roles_allowed || []).includes(userRole);
      if (isDev) {
        console.log('Role Access Check:', {
          userRole,
          rolesAllowed: config.roles_allowed,
          hasRoleAccess
        });
        
        // SPECIAL LOGGING FOR PAGE ACCESS ROUTE
        if (current === '/access-permissions/page-access') {
          console.log('🎯 PAGE ACCESS ROUTE PERMISSION CHECK:');
          console.log(`   User Role: ${userRole}`);
          console.log(`   Allowed Roles: ${JSON.stringify(config.roles_allowed)}`);
          console.log(`   Has Role Access: ${hasRoleAccess}`);
          console.log(`   🔧 REMEMBER: If you want all roles to access this page, remove this restriction from database`);
        }
      }
      
      // Exception: allow specific employees regardless of role permissions
      const isException = !!employee?.id && (config.exceptions || []).includes(employee.id);
      if (isDev) {
        console.log('Exception Check:', {
          employeeId: employee?.id,
          exceptions: config.exceptions,
          isException
        });
      }
      
      const finalResult = hasRoleAccess || isException;
      
      if (isDev) {
        console.log('🎯 FINAL ACCESS DECISION:', {
          hasRoleAccess,
          isException,
          finalResult: finalResult ? 'ALLOWED' : 'DENIED',
          userRole,
          rolesAllowed: config.roles_allowed,
          configType: config.organization_id ? 'Organization-specific' : 'System-wide'
        });
        console.groupEnd();
      }
      
      // Cache the result
      accessCache.set(cacheKey, { result: finalResult, timestamp: Date.now(), configHash });
      
      return finalResult;
    };

    // Check if user has access to any sub-path under a main path
    const hasAccessToAnySubPath = (basePath: string, subPaths: string[]): boolean => {
      return subPaths.some(subPath => canAccessPage(subPath));
    };
    
    // Check if user can access data from a specific department
    const canAccessDepartment = (targetDepartmentId?: string): boolean => {
      // Owner and Admin can access all departments
      if (isOwner || isAdmin) {
        return true;
      }
      
      // HR can access all departments for employee management
      if (userRole === 'hr') {
        return true;
      }
      
      // Employee can only access their own department
      if (userRole === 'employee') {
        return !targetDepartmentId || targetDepartmentId === currentDepartmentId;
      }
      
      // Default: allow access
      return true;
    };
    
    // Check if current page requires cross-department access
    const requiresCrossDepartmentAccess = (pagePath: string): boolean => {
      return CROSS_DEPARTMENT_PAGES.some(crossDeptPage => 
        pagePath.startsWith(crossDeptPage)
      );
    };
    
    // Get access level description
    const getAccessLevel = (): string => {
      if (isOwner) return 'Full Access (Owner)';
      if (isAdmin) return 'Full Access (Admin)';
      if (userRole === 'hr') return 'HR Access (Employee Management)';
      if (userRole === 'employee') return 'Department Access Only';
      return 'Limited Access';
    };
    
    // Get department restriction message
    const getDepartmentRestrictionMessage = (): string | null => {
      if (isOwner || isAdmin || userRole === 'hr') return null;
      
      if (userRole === 'employee') {
        const deptName = employee?.departments?.name || employee?.department?.name || 'your department';
        return `You can only access data from ${deptName}`;
      }
      
      return null;
    };
    
    return {
      canAccessPage,
      canAccessDepartment,
      hasAccessToAnySubPath,
      requiresCrossDepartmentAccess,
      getAccessLevel,
      getDepartmentRestrictionMessage,
      currentDepartmentId,
      userRole,
      isOwner,
      isAdmin,
      departmentName: employee?.departments?.name || employee?.department?.name,
      configLoading
    };
  }, [userRole, employee, userData, isOwner, isAdmin, configurations, configLoading]);
  
  return departmentAccess;
};

