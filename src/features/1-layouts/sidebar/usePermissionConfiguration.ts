import { useState, useEffect } from 'react';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/1-login/contexts/AuthContext';
import { clearAccessCache } from './useDepartmentAccess';

export interface PermissionConfiguration {
  id: string;
  organization_id: string | null;
  page_path: string;
  page_title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  roles_allowed?: string[];
  exceptions?: string[]; // Employee IDs who have special access
  exception_paths?: string[]; // Path exceptions that remain accessible
}

// Removed default permissions - now only using real data from Supabase tables

// Application-level cache to prevent redundant fetching
const APP_CONFIG_CACHE = new Map<string, {
  data: PermissionConfiguration[];
  timestamp: number;
  organizationId: string | null;
}>();
const CACHE_TTL = 30000; // 30 seconds cache
const CACHE_KEY_PREFIX = 'perm_config_';

export const usePermissionConfiguration = () => {
  const { organization } = useCentralizedUserData();
  const { user } = useAuth();
  const [configurations, setConfigurations] = useState<PermissionConfiguration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfigurations = async () => {
      console.log('🔄 fetchConfigurations called', { organizationId: organization?.id, hasUser: !!user });
      
      // Check application cache first
      const cacheKey = `${CACHE_KEY_PREFIX}${organization?.id || 'null'}`;
      const cached = APP_CONFIG_CACHE.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('🚀 CACHE HIT: Using cached permission configurations');
        setConfigurations(cached.data);
        setLoading(false);
        return;
      }
      
      // Shorter timeout for better responsiveness
      const timeoutTimer = setTimeout(() => {
        console.log('⏰ Organization loading timeout (1s) - proceeding without organization data');
        setConfigurations([]);
        setLoading(false);
      }, 1000); // Further reduced for better UX
      
      if (!organization?.id) {
        // If no organization, check if we're still loading organization data
        console.log('📋 No organization ID yet, waiting for organization data...');
        
        // Check if user is authenticated but just no active organization
        if (user && !organization) {
          console.log('📋 User authenticated but no active organization - returning empty configurations');
          clearTimeout(timeoutTimer);
          setConfigurations([]);
          setLoading(false);
          return;
        }
        
        // If we have a user but no organization after a short delay, proceed with empty config
        const quickTimeout = setTimeout(() => {
          console.log('📋 Quick timeout: Proceeding with empty configurations for better UX');
          clearTimeout(timeoutTimer);
          setConfigurations([]);
          setLoading(false);
        }, 1000); // Very quick timeout for immediate UX response
        
        // Return cleanup function
        return () => {
          clearTimeout(timeoutTimer);
          clearTimeout(quickTimeout);
        };
      }
      
      clearTimeout(timeoutTimer);

      try {
        setLoading(true);
        
        // Fetch only real data from Supabase table
        const { data: customConfigs, error } = await (supabase as any)
          .from('permission_configurations')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Permission configurations table error:', error.message);
          // If table doesn't exist or has error, return empty configurations
          const emptyConfigs: PermissionConfiguration[] = [];
          setConfigurations(emptyConfigs);
          
          // Cache empty result
          APP_CONFIG_CACHE.set(cacheKey, {
            data: emptyConfigs,
            timestamp: Date.now(),
            organizationId: organization.id
          });
        } else {
          // Only use real data from Supabase
          console.log('📋 Real configurations loaded from Supabase:', customConfigs || []);
          const configs = customConfigs || [];
          setConfigurations(configs);
          
          // Cache successful result
          APP_CONFIG_CACHE.set(cacheKey, {
            data: configs,
            timestamp: Date.now(),
            organizationId: organization.id
          });
          console.log('💾 CACHE STORED: Permission configurations cached for', CACHE_TTL / 1000, 'seconds');
        }
      } catch (error) {
        console.error('Error fetching permission configurations:', error);
        // If error occurs, return empty configurations instead of fallback
        console.log('📋 Error occurred, returning empty configurations');
        setConfigurations([]);
      } finally {
        setLoading(false);
        console.log('✅ Loading completed');
      }
    };

    fetchConfigurations();
    
    // Cleanup function
    return () => {
      // Cleanup is handled inside fetchConfigurations
    };
  }, [organization?.id, user]);

  const createPermissionConfiguration = async (config: Omit<PermissionConfiguration, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!organization?.id) {
        throw new Error('No organization found');
      }

      const newConfig = {
        ...config,
        organization_id: organization.id,
        created_by: user?.id || null
      };
      
      console.log('🚀 Creating new permission configuration:', newConfig);

      // Try to insert into Supabase table
      const { data, error } = await (supabase as any)
        .from('permission_configurations')
        .insert([newConfig])
        .select()
        .single();

      if (error) {
        console.error('❌ Database save failed:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Successfully saved to database:', data);
      // Clear access cache when permissions change
      clearAccessCache();
      // Refresh configurations
      setConfigurations(prev => [...prev, data]);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating permission configuration:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updatePermissionConfiguration = async (id: string, updates: Partial<PermissionConfiguration>) => {
    try {
      if (!organization?.id) {
        throw new Error('No organization found');
      }

      const updatedConfig = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Try to update in Supabase table
      const { data, error } = await (supabase as any)
        .from('permission_configurations')
        .update(updatedConfig)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.warn('Could not update in database, updating local state:', error.message);
        // Clear access cache when permissions change
        clearAccessCache();
        // Update local state if database operation fails
        setConfigurations(prev => 
          prev.map(config => 
            config.id === id ? { ...config, ...updatedConfig } : config
          )
        );
        return { success: true, data: null };
      }

      // Clear access cache when permissions change
      clearAccessCache();
      // Refresh configurations
      setConfigurations(prev => 
        prev.map(config => config.id === id ? data : config)
      );
      return { success: true, data };
    } catch (error) {
      console.error('Error updating permission configuration:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deletePermissionConfiguration = async (id: string) => {
    try {
      if (!organization?.id) {
        throw new Error('No organization found');
      }

      // Try to delete from Supabase table
      const { error } = await supabase
        .from('permission_configurations')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) {
        console.warn('Could not delete from database, removing from local state:', error.message);
      }

      // Clear access cache when permissions change
      clearAccessCache();
      // Remove from local state
      setConfigurations(prev => prev.filter(config => config.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting permission configuration:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const duplicatePermissionConfiguration = async (id: string) => {
    try {
      const originalConfig = configurations.find(c => c.id === id);
      if (!originalConfig) {
        throw new Error('Configuration not found');
      }

      const duplicatedConfig = {
        page_path: `${originalConfig.page_path}-copy`,
        page_title: `${originalConfig.page_title} (Copy)`,
        roles_allowed: originalConfig.roles_allowed,
        exceptions: originalConfig.exceptions,
        exception_paths: originalConfig.exception_paths,
        is_active: originalConfig.is_active,
        organization_id: organization?.id || null
      };

      const result = await createPermissionConfiguration(duplicatedConfig);
      if (result.success) {
        // Clear access cache when permissions change (createPermissionConfiguration already does this, but being explicit)
        clearAccessCache();
      }
      return result;
    } catch (error) {
      console.error('Error duplicating permission configuration:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Debug utility function to help troubleshoot permission issues
  const debugPermissions = (pagePath: string, userRole: string) => {
    console.group(`🐛 Debug Permissions for ${pagePath}`);
    console.log('Current configurations:', configurations);
    console.log('User role:', userRole);
    console.log('Organization ID:', organization?.id);
    
    const matchingConfigs = configurations.filter(c => {
      const normalize = (p?: string) => {
        if (!p) return '/';
        let s = p.trim();
        if (!s.startsWith('/')) s = '/' + s;
        if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
        return s.toLowerCase();
      };
      
      const base = normalize(c.page_path);
      const current = normalize(pagePath);
      return current === base || current.startsWith(base + '/');
    });
    
    console.log('Matching configurations:', matchingConfigs);
    
    const prioritizedConfig = matchingConfigs.find(c => c.organization_id !== null) || matchingConfigs.find(c => c.organization_id === null);
    console.log('Prioritized configuration:', prioritizedConfig);
    
    if (prioritizedConfig) {
      console.log('Roles allowed:', prioritizedConfig.roles_allowed);
      console.log('User has access:', (prioritizedConfig.roles_allowed || []).includes(userRole));
    }
    
    console.groupEnd();
  };

  return {
    configurations,
    loading,
    createPermissionConfiguration,
    updatePermissionConfiguration,
    deletePermissionConfiguration,
    duplicatePermissionConfiguration,
    debugPermissions
  };
};