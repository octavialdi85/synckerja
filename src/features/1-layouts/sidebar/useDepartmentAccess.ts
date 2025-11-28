import { useMemo } from 'react';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { usePermissionConfiguration } from './usePermissionConfiguration';
import { logger } from '@/config/logger';

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
  '/tools/calculator/services',               // Calculator tool - Services
  '/tools/calculator/sales',                  // Calculator tool - Sales
  '/tools/pph21-calculator',                  // PPh 21 calculator
  '/tools/pricing-tools',                     // Pricing tool
  '/tools/promo-simulation',                  // Promo simulation
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

// Debounce for CONFIG CHANGED logs
let configChangedLogTimeout: NodeJS.Timeout | null = null;
let lastConfigChangedLogTime = 0;
const CONFIG_CHANGED_LOG_DEBOUNCE = 2000; // 2 seconds debounce

// Track logged paths for CAN ACCESS PAGE OVERRIDE to avoid duplicate logs
const loggedOverridePaths = new Set<string>();

// Smart cache clearing - only when necessary
export const clearAccessCache = () => {
  const now = Date.now();
  if (now - lastClearTime < MIN_CLEAR_INTERVAL) {
    if (isDev) {
      logger.debug('🔄 CACHE: Skipping clear - too recent (', Math.round((now - lastClearTime) / 1000), 's ago)');
    }
    return;
  }
  
  if (isDev) {
    logger.debug('🧹 Smart clearing access cache with', accessCache.size, 'entries');
  }
  accessCache.clear();
  lastClearTime = now;
  if (isDev) {
    logger.debug('✅ Access cache cleared');
  }
};

// Debug function to inspect cache
export const debugAccessCache = () => {
  logger.debug('🔍 Access Cache Debug:');
  logger.debug('Cache size:', accessCache.size);
  logger.debug('Cache entries:');
  accessCache.forEach((value, key) => {
    logger.debug(`  ${key}:`, value);
  });
};

// Function to force clear cache and debug - for troubleshooting
export const forceClearCache = () => {
  logger.debug('🔥 FORCE CLEARING ALL CACHE');
  logger.debug('Cache before clear:', accessCache.size, 'entries');
  accessCache.forEach((value, key) => {
    logger.debug(`  Removing: ${key} = ${value.result}`);
  });
  accessCache.clear();
  logger.debug('✅ Force clear completed');
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
      // Debounce CONFIG CHANGED logs to reduce noise
      const now = Date.now();
      if (isDev) {
        // Clear existing timeout
        if (configChangedLogTimeout) {
          clearTimeout(configChangedLogTimeout);
        }
        
        // Only log if enough time has passed since last log
        if (now - lastConfigChangedLogTime >= CONFIG_CHANGED_LOG_DEBOUNCE) {
          logger.debug('🔄 CONFIG CHANGED: Smart cache clear triggered');
          lastConfigChangedLogTime = now;
        } else {
          // Schedule delayed log if not logged recently
          configChangedLogTimeout = setTimeout(() => {
            logger.debug('🔄 CONFIG CHANGED: Smart cache clear triggered (debounced)');
            lastConfigChangedLogTime = Date.now();
          }, CONFIG_CHANGED_LOG_DEBOUNCE);
        }
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
        // Only log once per path to reduce noise
        if (isDev && !loggedOverridePaths.has(pagePath)) {
          logger.debug('🔑 CAN ACCESS PAGE OVERRIDE: Owner full access to', pagePath);
          loggedOverridePaths.add(pagePath);
          // Clear logged paths after 5 minutes to allow re-logging if path changes
          setTimeout(() => {
            loggedOverridePaths.delete(pagePath);
          }, 5 * 60 * 1000);
        }
        return true;
      }
      
      // ADMIN OVERRIDE - Always grant access immediately
      if (isAdmin || userRole === 'admin') {
        // Only log once per path to reduce noise
        if (isDev && !loggedOverridePaths.has(pagePath)) {
          logger.debug('🔧 CAN ACCESS PAGE OVERRIDE: Admin full access to', pagePath);
          loggedOverridePaths.add(pagePath);
          // Clear logged paths after 5 minutes to allow re-logging if path changes
          setTimeout(() => {
            loggedOverridePaths.delete(pagePath);
          }, 5 * 60 * 1000);
        }
        return true;
      }

      // COMPANY FILES HARDCODE OVERRIDE - Always accessible by owner, admin, employees, HR
      // This override ignores any database configuration restrictions for /company/files
      // Only applies to exact path /company/files (not sub-routes)
      // This check happens BEFORE configLoading check to ensure access even during loading
      const normalizePath = (p?: string) => {
        if (!p) return '/';
        let s = p.trim();
        if (!s.startsWith('/')) s = '/' + s;
        if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
        return s.toLowerCase();
      };
      
      const normalizedPath = normalizePath(pagePath);
      if (normalizedPath === '/company/files') {
        // Check if user role is in allowed roles (owner, admin, employee, hr)
        const allowedRoles = ['owner', 'admin', 'employee', 'hr'];
        const normalizedRole = userRole?.toLowerCase().trim();
        
        if (normalizedRole && allowedRoles.includes(normalizedRole)) {
          // Only log once per path to reduce noise
          if (isDev && !loggedOverridePaths.has(pagePath)) {
            logger.debug('📁 COMPANY FILES OVERRIDE: Granting access to', pagePath, 'for role', normalizedRole);
            logger.debug('🎯 This override ignores any database configuration restrictions');
            loggedOverridePaths.add(pagePath);
            // Clear logged paths after 5 minutes to allow re-logging if path changes
            setTimeout(() => {
              loggedOverridePaths.delete(pagePath);
            }, 5 * 60 * 1000);
          }
          // Grant access regardless of database configuration or loading state
          // Cache the result for performance
          const cacheKey = `${normalizedPath}-${userRole}-${employee?.id || 'no-emp'}`;
          const result = true;
          accessCache.set(cacheKey, { 
            result, 
            timestamp: Date.now(), 
            configHash 
          });
          return result;
        }
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
        
        // COMPANY FILES OVERRIDE - Also check during loading
        if (normalizedPath === '/company/files') {
          const allowedRoles = ['owner', 'admin', 'employee', 'hr'];
          const normalizedRole = userRole?.toLowerCase().trim();
          
          if (normalizedRole && allowedRoles.includes(normalizedRole)) {
            if (isDev) {
              logger.debug('📁 COMPANY FILES OVERRIDE (LOADING): Granting access during loading for role', normalizedRole);
            }
            return true;
          }
        }
        
        const isUnrestrictedDuringLoading = UNRESTRICTED_DURING_LOADING.some(unrestrictedPath => {
          const normalizedUnrestricted = normalize(unrestrictedPath);
          return normalizedPath === normalizedUnrestricted || normalizedPath.startsWith(normalizedUnrestricted + '/');
        });
        
        if (isUnrestrictedDuringLoading) {
          if (isDev) {
            logger.debug('✅ LOADING BYPASS: Allowing access to unrestricted path during loading:', pagePath);
          }
          return true;
        }
        
        if (isDev) {
          logger.debug('⏳ Still loading configurations, deferring access decision for:', pagePath);
          logger.debug('🔍 Tip: If this path should be accessible during loading, add it to UNRESTRICTED_DURING_LOADING array');
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
        
        // COMPANY FILES OVERRIDE - Also check during user role loading
        // If employee exists, assume they are employee or hr role
        if (normalizedPath === '/company/files' && employee) {
          if (isDev) {
            logger.debug('📁 COMPANY FILES OVERRIDE (USER LOADING): Granting access during user role loading for employee');
          }
          return true;
        }
        
        const isUnrestrictedDuringLoading = UNRESTRICTED_DURING_LOADING.some(unrestrictedPath => {
          const normalizedUnrestricted = normalize(unrestrictedPath);
          return normalizedPath === normalizedUnrestricted || normalizedPath.startsWith(normalizedUnrestricted + '/');
        });
        
        if (isUnrestrictedDuringLoading) {
          if (isDev) {
            logger.debug('✅ USER LOADING BYPASS: Allowing access to unrestricted path during user loading:', pagePath);
          }
          return true;
        }
        
        if (isDev) {
          logger.debug('⏳ User role still loading, deferring access decision for:', pagePath);
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
      
      // Optimized debug logging - only verbose when VITE_VERBOSE_PERMISSIONS=true
      const verbosePermissions = import.meta.env.VITE_VERBOSE_PERMISSIONS === 'true';
      
      // Check cache first with config hash validation
      const cacheKey = `${current}-${userRole}-${employee?.id || 'no-emp'}`;
      const cached = accessCache.get(cacheKey);
      if (cached && 
          (Date.now() - cached.timestamp) < ACCESS_CACHE_TTL &&
          cached.configHash === configHash) {
        // Only log cache hit in verbose mode to reduce noise
        if (isDev && verbosePermissions) {
          logger.debug('📋 CACHE HIT: Using cached result:', cached.result);
        }
        return cached.result;
      } else if (cached && cached.configHash !== configHash) {
        if (isDev) {
          logger.debug('🔄 CACHE INVALIDATED: Config hash mismatch');
        }
      }

      // Find matching configuration from database first (normalized match)
      // Prioritize organization-specific configurations over system-wide ones
      const matchingConfigs = configurations.filter(c => {
        const base = normalize(c.page_path);
        const matches = current === base || current.startsWith(base + '/');
        // Only log path matching in verbose mode
        if (isDev && verbosePermissions) {
          logger.debug('🔍 Path matching:', {
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
      
      // Prioritize organization-specific config over system-wide config
      const orgSpecificConfig = matchingConfigs.find(c => c.organization_id !== null);
      const systemWideConfig = matchingConfigs.find(c => c.organization_id === null);
      const config = orgSpecificConfig || systemWideConfig;
      
      // Enhanced debug logging (only in verbose mode to reduce console noise)
      if (isDev && verbosePermissions) {
        logger.debug(`🔍 PERMISSION DEBUG: ${pagePath}`);
        logger.debug('Path Details:', {
          originalPath: pagePath,
          normalizedPath: current,
          userRole,
          isOwner,
          isAdmin,
          employeeId: employee?.id,
          organizationId: userData?.active_organization_id
        });
        logger.debug('All Configurations:', configurations);
        logger.debug('Configuration Count:', configurations.length);
        logger.debug('Matching Configurations:', matchingConfigs);
        logger.debug('Priority Selection:', {
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
        // Only log summary unless verbose mode
        if (isDev) {
          if (verbosePermissions) {
            logger.debug('🔓 NO CONFIG FOUND = DEFAULT ALLOW ACCESS');
            logger.debug(`✅ Path "${current}" has NO PAGE ACCESS RESTRICTIONS configured`);
            logger.debug('🎯 PRINCIPLE: Empty database = No restrictions = Allow all authenticated users');
          } else {
            // Summary log only
            logger.debug(`✅ ${current}: No restrictions (default allow)`);
          }
          
          // SPECIAL LOG FOR PAGE ACCESS ROUTE
          if (current === '/access-permissions/page-access') {
            logger.debug('🔧 PAGE ACCESS MANAGEMENT: No restrictions configured - ANY AUTHENTICATED USER can access');
            logger.debug('📋 This allows users to configure page access when database is empty');
          }
          
          // CLEAR DEBUG: Show exact decision (only in verbose mode)
          if (verbosePermissions) {
            logger.debug('🚀 DECISION: ALLOW ACCESS (No restrictions configured in database)');
            logger.debug(`User ${userRole} can access "${current}" - no restrictions found`);
          }
        }
        const result = true;
        accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
        return result;
      }
      
      if (isDev) {
        logger.debug('✅ Config found:', {
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
        logger.debug('Checking Exception Paths:', config.exception_paths);
      }
      if (config.exception_paths && config.exception_paths.length > 0) {
        const isExceptionPath = config.exception_paths.some(exceptionPath => {
          const ex = normalize(exceptionPath);
          const matches = current === ex || current.startsWith(ex + '/');
          if (isDev) {
            logger.debug(`Exception path check: ${exceptionPath} (normalized: ${ex}) vs ${current} = ${matches}`);
          }
          return matches;
        });
        
        if (isDev) {
          logger.debug('Is Exception Path:', isExceptionPath);
        }
        if (isExceptionPath) {
          if (isDev) {
            logger.debug('✅ ALLOWED: Exception path access');
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
        logger.debug('Enhanced Owner Check:', { 
          isOwner, 
          userRole, 
          isOwnerByRole, 
          isOwnerByFlag, 
          isDefinitelyOwner 
        });
      }
      
      if (isDefinitelyOwner) {
        if (isDev) {
          logger.debug('✅ ALLOWED: Owner always has full access (enhanced detection)');
        }
        const result = true;
        accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
        return result;
      }
      
      // COMPANY FILES HARDCODE OVERRIDE - Check even after config is found
      // This ensures override works even if database configuration restricts access
      if (current === '/company/files') {
        const allowedRoles = ['owner', 'admin', 'employee', 'hr'];
        const normalizedRole = userRole?.toLowerCase().trim();
        
        if (normalizedRole && allowedRoles.includes(normalizedRole)) {
          if (isDev) {
            logger.debug('📁 COMPANY FILES OVERRIDE (AFTER CONFIG): Granting access despite database restrictions for role', normalizedRole);
            logger.debug('🎯 This override ignores database configuration:', config.roles_allowed);
          }
          const result = true;
          accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
          return result;
        }
      }
      
      if (!userRole) {
        if (isDev) {
          logger.debug('❌ DENIED: No user role found');
        }
        const result = false;
        accessCache.set(cacheKey, { result, timestamp: Date.now(), configHash });
        return result;
      }
      
      // Check if user's role is allowed based on database configuration
      const hasRoleAccess = (config.roles_allowed || []).includes(userRole);
      if (isDev) {
        logger.debug('Role Access Check:', {
          userRole,
          rolesAllowed: config.roles_allowed,
          hasRoleAccess
        });
        
        // SPECIAL LOGGING FOR PAGE ACCESS ROUTE
        if (current === '/access-permissions/page-access') {
          logger.debug('🎯 PAGE ACCESS ROUTE PERMISSION CHECK:');
          logger.debug(`   User Role: ${userRole}`);
          logger.debug(`   Allowed Roles: ${JSON.stringify(config.roles_allowed)}`);
          logger.debug(`   Has Role Access: ${hasRoleAccess}`);
          logger.debug(`   🔧 REMEMBER: If you want all roles to access this page, remove this restriction from database`);
        }
      }
      
      // Exception: allow specific employees regardless of role permissions
      const isException = !!employee?.id && (config.exceptions || []).includes(employee.id);
      if (isDev) {
        logger.debug('Exception Check:', {
          employeeId: employee?.id,
          exceptions: config.exceptions,
          isException
        });
      }
      
      const finalResult = hasRoleAccess || isException;
      
      if (isDev) {
        logger.debug('🎯 FINAL ACCESS DECISION:', {
          hasRoleAccess,
          isException,
          finalResult: finalResult ? 'ALLOWED' : 'DENIED',
          userRole,
          rolesAllowed: config.roles_allowed,
          configType: config.organization_id ? 'Organization-specific' : 'System-wide'
        });
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

