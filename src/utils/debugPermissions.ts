/**
 * Global Debug Utilities for Permission System
 * 
 * These utilities can be accessed from the browser console to help debug
 * permission-related issues in development.
 */

import { supabase } from '@/integrations/supabase/client';

// Make debug functions globally available in development
declare global {
  interface Window {
    debugPermissions: {
      checkUserRole: (userEmail?: string) => Promise<void>;
      listPermissionConfigs: (organizationId?: string) => Promise<void>;
      testPageAccess: (pagePath: string, userRole: string, organizationId: string) => Promise<void>;
      clearPermissionCache: () => void;
      inspectCache: () => void;
      verifyPermissionSetup: () => Promise<void>;
    };
  }
}

/**
 * Check user role for debugging
 */
const checkUserRole = async (userEmail?: string) => {
  try {
    console.group('🔍 User Role Debug');
    
    let query = supabase
      .from('user_roles')
      .select(`
        role,
        user_id,
        organization_id,
        users:user_id(email),
        organizations:organization_id(company_name)
      `);
    
    if (userEmail) {
      // Get user ID first
      const { data: authUsers } = await supabase
        .from('users')
        .select('id')
        .ilike('email', `%${userEmail}%`);
      
      if (authUsers && authUsers.length > 0) {
        query = query.in('user_id', authUsers.map(u => u.id));
      }
    }
    
    const { data: roles, error } = await query;
    
    if (error) {
      console.error('Error fetching user roles:', error);
      return;
    }
    
    console.table(roles);
    console.groupEnd();
  } catch (error) {
    console.error('Debug function error:', error);
  }
};

/**
 * List permission configurations for debugging
 */
const listPermissionConfigs = async (organizationId?: string) => {
  try {
    console.group('📋 Permission Configurations');
    
    let query = supabase
      .from('permission_configurations')
      .select('*')
      .eq('is_active', true)
      .order('organization_id', { ascending: true })
      .order('page_path', { ascending: true });
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: configs, error } = await query;
    
    if (error) {
      console.error('Error fetching permission configs:', error);
      return;
    }
    
    console.table(configs);
    
    // Group by organization
    const grouped = configs?.reduce((acc, config) => {
      const orgKey = config.organization_id || 'system-wide';
      if (!acc[orgKey]) acc[orgKey] = [];
      acc[orgKey].push(config);
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('Grouped by organization:', grouped);
    console.groupEnd();
  } catch (error) {
    console.error('Debug function error:', error);
  }
};

/**
 * Test page access for debugging
 */
const testPageAccess = async (pagePath: string, userRole: string, organizationId: string) => {
  try {
    console.group(`🧪 Test Page Access: ${pagePath}`);
    console.log('Parameters:', { pagePath, userRole, organizationId });
    
    // Get matching configurations
    const { data: configs, error } = await supabase
      .from('permission_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching configs:', error);
      return;
    }
    
    // Normalize path function
    const normalize = (p?: string) => {
      if (!p) return '/';
      let s = p.trim();
      if (!s.startsWith('/')) s = '/' + s;
      if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
      return s.toLowerCase();
    };
    
    const current = normalize(pagePath);
    
    // Find matching configs
    const matchingConfigs = configs?.filter(c => {
      const base = normalize(c.page_path);
      return current === base || current.startsWith(base + '/');
    }) || [];
    
    console.log('All configs:', configs);
    console.log('Matching configs:', matchingConfigs);
    
    if (matchingConfigs.length === 0) {
      console.log('✅ No config found - access allowed by default');
    } else {
      const config = matchingConfigs[0]; // Should use prioritization logic
      const hasAccess = (config.roles_allowed || []).includes(userRole);
      
      console.log('Selected config:', config);
      console.log('Roles allowed:', config.roles_allowed);
      console.log('User role:', userRole);
      console.log(hasAccess ? '✅ Access allowed' : '❌ Access denied');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Debug function error:', error);
  }
};

/**
 * Clear permission cache
 */
const clearPermissionCache = () => {
  console.log('🧹 Clearing permission cache...');
  
  // Clear the main access cache
  try {
    // Import and call clearAccessCache from useDepartmentAccess
    import('../features/1-layouts/sidebar/useDepartmentAccess').then(({ clearAccessCache, debugAccessCache }) => {
      debugAccessCache(); // Show cache state before clearing
      clearAccessCache();
      console.log('✅ Main access cache cleared');
    });
  } catch (error) {
    console.warn('Could not clear main access cache:', error);
  }
  
  // Clear any localStorage cache
  localStorage.removeItem('permission_cache'); 
  console.log('✅ All permission caches cleared');
};

/**
 * Inspect current cache state
 */
const inspectCache = () => {
  console.log('🔍 Inspecting permission cache state...');
  
  try {
    import('../features/1-layouts/sidebar/useDepartmentAccess').then(({ debugAccessCache }) => {
      debugAccessCache();
    });
  } catch (error) {
    console.warn('Could not inspect access cache:', error);
  }
};

/**
 * Verify permission setup
 */
const verifyPermissionSetup = async () => {
  try {
    console.group('✅ Verify Permission Setup');
    
    // Check if permission_configurations table exists and has data
    const { data: configs, error: configError } = await supabase
      .from('permission_configurations')
      .select('count')
      .limit(1);
    
    if (configError) {
      console.error('❌ permission_configurations table issue:', configError);
    } else {
      console.log('✅ permission_configurations table accessible');
    }
    
    // Check if user_roles table has data
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);
    
    if (roleError) {
      console.error('❌ user_roles table issue:', roleError);
    } else {
      console.log('✅ user_roles table accessible');
    }
    
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Current user issue:', userError);
    } else {
      console.log('✅ Current user:', user.email);
      
      // Get current user's role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('Current user role:', userRole);
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Debug function error:', error);
  }
};

// Export debug utilities
export const debugPermissions = {
  checkUserRole,
  listPermissionConfigs,
  testPageAccess,
  clearPermissionCache,
  inspectCache,
  verifyPermissionSetup
};

// Make available globally in development
if (typeof window !== 'undefined' && (import.meta.env?.DEV || process.env.NODE_ENV === 'development')) {
  window.debugPermissions = debugPermissions;

  (async () => {
    try {
      const { logger } = await import('@/config/logger');
      logger.once('dev-utils:debugPermissions', () => {
        console.log('🐛 Debug utilities available at window.debugPermissions');
        console.log('Available functions:');
        console.log('- checkUserRole(userEmail?)');
        console.log('- listPermissionConfigs(organizationId?)'); 
        console.log('- testPageAccess(pagePath, userRole, organizationId)');
        console.log('- clearPermissionCache()');
        console.log('- inspectCache()');
        console.log('- verifyPermissionSetup()');
      });
    } catch {
      console.log('🐛 Debug utilities available at window.debugPermissions');
      console.log('Available functions:');
      console.log('- checkUserRole(userEmail?)');
      console.log('- listPermissionConfigs(organizationId?)'); 
      console.log('- testPageAccess(pagePath, userRole, organizationId)');
      console.log('- clearPermissionCache()');
      console.log('- inspectCache()');
      console.log('- verifyPermissionSetup()');
    }
  })();
}
