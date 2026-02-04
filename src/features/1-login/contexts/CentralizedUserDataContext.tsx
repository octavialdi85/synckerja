import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/1-login/contexts/AuthContext';
import type { User } from '@supabase/supabase-js';
import { logger } from '@/config/logger';

// Types - focus only on 5 core tables
interface UserData {
  user_id: string;
  full_name: string;
  email: string;
  active_organization_id?: string;
  department_id?: string;
  email_verified?: boolean; // Add email_verified field
}

interface Organization {
  id: string;
  company_name: string;
  industry?: string;
  address?: string;
  website?: string;
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  department_id?: string;
  departments?: { name: string } | null;
  department?: { name: string } | null;
}

type UserRole = 'owner' | 'admin' | 'employee' | 'hr' | null;

interface CentralizedUserDataContextType {
  // Auth data - focus only on 5 core tables
  user: User | null;
  userData: UserData | null;
  organization: Organization | null;
  userRole: UserRole;
  employee: Employee | null;
  loading: boolean;
  error: Error | null;
  
  // Computed values
  isAuthenticated: boolean;
  isEmailVerified: boolean; // Keep for backward compatibility
  hasOrganization: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  displayName: string;
  organizationName: string;
  
  // Actions
  refreshUserData: () => Promise<void>;
  forceRefreshUserData: () => Promise<void>;
}

// Create context
const CentralizedUserDataContext = createContext<CentralizedUserDataContextType | undefined>(undefined);

// Nilai default saat hook dipanggil di luar provider (mis. saat HMR / React Fast Refresh)
const DEFAULT_CENTRALIZED_USER_DATA: CentralizedUserDataContextType = {
  user: null,
  userData: null,
  organization: null,
  userRole: null,
  employee: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isEmailVerified: false,
  hasOrganization: false,
  isOwner: false,
  isAdmin: false,
  displayName: '',
  organizationName: '',
  refreshUserData: async () => {},
  forceRefreshUserData: async () => {},
};

// Provider component
export const CentralizedUserDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string>('');
  
  // Cache for user data to avoid repeated queries
  const userDataCacheRef = useRef<{
    data: UserData | null;
    organization: Organization | null;
    userRole: UserRole;
    employee: Employee | null;
    timestamp: number;
  } | null>(null);
  const CACHE_DURATION = 60 * 1000; // 60 seconds cache - reduce refetches and timeout risk

  // Fetch user data - focus only on 5 core tables
  const refreshUserData = useCallback(async () => {
    if (!user || !session || authLoading || fetchingRef.current) {
      if (!user || !session) {
        setUserData(null);
        setOrganization(null);
        setUserRole(null);
        setEmployee(null);
        setLoading(false);
        lastUserIdRef.current = '';
      }
      return;
    }

    // Check for force refresh flag first
    const forceRefresh = sessionStorage.getItem('forceRefreshUserData');
    const emailVerifiedFlag = sessionStorage.getItem('emailVerified');
    const currentPath = window.location.pathname;
    
    // Only skip data fetching on auth pages if no force refresh or email verified flag
    if (!forceRefresh && !emailVerifiedFlag && (currentPath === '/login' || currentPath === '/register' || currentPath === '/verify-email')) {
      setLoading(false);
      return;
    }
    
    // If force refresh, clear the flag and continue with data fetching
    if (forceRefresh) {
      if (import.meta.env.DEV) {
        logger.userData('CentralizedUserDataContext: Force refresh detected, fetching fresh data...');
      }
      sessionStorage.removeItem('forceRefreshUserData');
      // Reset the fetching refs to allow fresh fetch
      fetchingRef.current = false;
      lastUserIdRef.current = '';
    }
    
    // If email verified flag exists, clear it and continue with data fetching
    if (emailVerifiedFlag) {
      if (import.meta.env.DEV) {
        logger.userData('CentralizedUserDataContext: Email verified flag detected, fetching fresh data...');
      }
      sessionStorage.removeItem('emailVerified');
      // Reset the fetching refs to allow fresh fetch
      fetchingRef.current = false;
      lastUserIdRef.current = '';
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && !emailVerifiedFlag && userDataCacheRef.current) {
      const cacheAge = Date.now() - userDataCacheRef.current.timestamp;
      if (cacheAge < CACHE_DURATION && userDataCacheRef.current.data?.user_id === user.id) {
        if (import.meta.env.DEV) {
          logger.userData(`CentralizedUserDataContext: Using cached data (age: ${Math.floor(cacheAge / 1000)}s)`);
        }
        setUserData(userDataCacheRef.current.data);
        setOrganization(userDataCacheRef.current.organization);
        setUserRole(userDataCacheRef.current.userRole);
        setEmployee(userDataCacheRef.current.employee);
        setLoading(false);
        return;
      }
    }

    // Skip if already fetched for this user, unless force refresh or email verified flag
    if (lastUserIdRef.current === user.id && !forceRefresh && !emailVerifiedFlag) {
      if (import.meta.env.DEV) {
        logger.userData('CentralizedUserDataContext: Skipping fetch - already fetched for user:', user.id);
      }
      setLoading(false);
      return;
    }

    // If force refresh or email verified flag, reset cache
    if (forceRefresh || emailVerifiedFlag) {
      if (import.meta.env.DEV) {
        logger.userData('CentralizedUserDataContext: Force refresh or email verified - resetting cache for user:', user.id);
      }
      lastUserIdRef.current = '';
      fetchingRef.current = false;
      userDataCacheRef.current = null; // Clear cache on force refresh
    }

    try {
      fetchingRef.current = true;
      lastUserIdRef.current = user.id;
      setLoading(true);
      setError(null);
      
      // Run profile and email verification in parallel with timeout; one retry on timeout
      const QUERY_TIMEOUT = 12000; // 12s - balanced so slow DB can finish (indexes reduce load)
      const startTime = performance.now();

      const runFirstBatch = async (): Promise<{
        profileData: any;
        profileError: any;
        verificationToken: any;
      }> => {
        const profilePromise = supabase
          .from('profiles')
          .select('user_id, full_name, email, active_organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const verificationPromise = (async () => {
          try {
            return await supabase
              .from('email_verification_tokens')
              .select('email_verified')
              .eq('user_id', user.id)
              .order('used_at', { ascending: false })
              .limit(1)
              .maybeSingle();
          } catch {
            return { data: null, error: null };
          }
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('User data query timeout')), QUERY_TIMEOUT)
        );

        const results = await Promise.race(
          [Promise.allSettled([profilePromise, verificationPromise]), timeoutPromise]
        ) as PromiseSettledResult<any>[];

        let profileData: any = null;
        let profileError: any = null;
        let verificationToken: any = null;
        if (results[0]?.status === 'fulfilled') {
          profileData = results[0].value.data;
          profileError = results[0].value.error;
        } else if (results[0]?.status === 'rejected') {
          profileError = results[0].reason;
        }
        if (results[1]?.status === 'fulfilled') {
          verificationToken = results[1].value.data;
        }
        return { profileData, profileError, verificationToken };
      };

      let profileData: any = null;
      let profileError: any = null;
      let verificationToken: any = null;
      try {
        const batch = await runFirstBatch();
        profileData = batch.profileData;
        profileError = batch.profileError;
        verificationToken = batch.verificationToken;
      } catch (firstError: any) {
        if (firstError?.message === 'User data query timeout' && import.meta.env.DEV) {
          logger.debug('CentralizedUserDataContext: First batch timeout, retrying once...');
        }
        if (firstError?.message === 'User data query timeout') {
          try {
            const batch = await runFirstBatch();
            profileData = batch.profileData;
            profileError = batch.profileError;
            verificationToken = batch.verificationToken;
          } catch (retryError: any) {
            throw retryError;
          }
        } else {
          throw firstError;
        }
      }
      
      const verificationStatus = verificationToken?.email_verified === true;

      // Handle profile error - PGRST116 means no rows found, which is acceptable
      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      let organizationId = profileData?.active_organization_id;

      // SECURITY: If profile has an org, verify user still has active access (e.g. not resigned/terminated)
      if (organizationId) {
        try {
          const { data: uo } = await supabase
            .from('user_organizations')
            .select('is_active')
            .eq('user_id', user.id)
            .eq('organization_id', organizationId)
            .maybeSingle();
          if (!uo || uo.is_active !== true) {
            organizationId = null;
          }
        } catch {
          organizationId = null;
        }
      }

      // If no organization in profile or access was revoked, check user_organizations table (with timeout protection)
      if (!organizationId) {
        try {
          const orgQueryPromise = supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('joined_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Increased timeout for organization query to handle database overload
          const orgTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Organization query timeout')), 15000)
          );

          const { data: userOrgData } = await Promise.race([
            orgQueryPromise,
            orgTimeoutPromise
          ]) as any;

          organizationId = userOrgData?.organization_id;
          
          // If we found an organization, update the profile (non-blocking)
          if (organizationId && profileData) {
            // Don't await - let it update in background
            supabase
              .from('profiles')
              .update({ active_organization_id: organizationId })
              .eq('user_id', user.id)
              .catch(() => {
                // Silently fail - non-critical update
              });
          }
        } catch (orgError: any) {
          // Silently handle timeout or error - organization lookup is optional
          if (import.meta.env.DEV) {
            logger.debug('Organization lookup failed (non-critical):', orgError.message);
          }
        }
      }
      
      // Performance monitoring
      const duration = performance.now() - startTime;
      logger.performance(`User Data Fetch (${user.id.slice(0, 8)}...)`, duration, 500);

// Set user data
      const userData: UserData = {
        user_id: user.id,
        full_name: profileData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: profileData?.email || user.email || '',
        active_organization_id: organizationId,
        department_id: undefined, // Will be set from employee data
        email_verified: verificationStatus, // Use proper verification status from database function
      };
      
      setUserData(userData);
      
      // Update cache with initial user data (will be updated later with employee data)
      userDataCacheRef.current = {
        data: userData,
        organization: null,
        userRole: null,
        employee: null,
        timestamp: Date.now()
      };

      // Get employee record, role, and organization if organization exists (with timeout)
      if (organizationId) {
        // First, check if user is organization owner
        const { data: orgOwnerCheck } = await supabase
          .from('organizations')
          .select('user_id')
          .eq('id', organizationId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        const isOrgOwner = !!orgOwnerCheck;
        
        // Build employee query - include status for filtering
        // Note: is_organization_owner is calculated, not a database field
        let employeeQuery = supabase
          .from('employees')
          .select(`
            id,
            employee_id,
            full_name,
            email,
            organization_id,
            department_id,
            status,
            employee_status_id,
            user_id,
            departments:department_id(name)
          `)
          .eq('user_id', user.id)
          .eq('organization_id', organizationId);
        
        // SECURITY: Filter out terminated and inactive (resigned) employees UNLESS they are the organization owner
        // Owner can access their own organization even if terminated in other organizations
        if (!isOrgOwner) {
          // For non-owners, exclude terminated and inactive (resigned) employees
          // Allow null status (new employees) but exclude 'terminated' and 'inactive'
          employeeQuery = employeeQuery.or('status.is.null,status.neq.terminated').neq('status', 'inactive');
        }
        // If isOrgOwner, allow access regardless of status (they own this org)
        
        const employeePromise = employeeQuery.maybeSingle();

        const rolePromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        const organizationPromise = supabase
          .from('organizations')
          .select('id, company_name, industry, address, website, user_id')
          .eq('id', organizationId)
          .maybeSingle();

        // Run employee, role, and organization in parallel with timeout (indexes speed these up)
        const orgDataTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Organization data query timeout')), QUERY_TIMEOUT)
        );

        try {
          const results = await Promise.race([
            Promise.allSettled([employeePromise, rolePromise, organizationPromise]),
            orgDataTimeoutPromise
          ]) as PromiseSettledResult<any>[];

          const employeeData = results[0]?.status === 'fulfilled' ? results[0].value.data : null;
          const roleData = results[1]?.status === 'fulfilled' ? results[1].value.data : null;
          const orgData = results[2]?.status === 'fulfilled' ? results[2].value.data : null;

          // Calculate is_organization_owner (not a database field)
          const calculatedIsOwner = employeeData && orgData && employeeData.user_id === (orgData as any).user_id;

          // SECURITY CHECK: If employee is terminated or inactive (resigned) and not owner, block access
          const isTerminatedOrInactive = employeeData?.status === 'terminated' || employeeData?.status === 'inactive';
          if (employeeData && isTerminatedOrInactive && !isOrgOwner && !calculatedIsOwner) {
            if (import.meta.env.DEV) {
              console.warn('🚫 Access denied: Employee is terminated/inactive and not organization owner', {
                employeeId: employeeData.id,
                status: employeeData.status,
                isOrgOwner,
                calculatedIsOwner
              });
            }
            setEmployee(null);
            setUserRole(null);
            setOrganization(null);
          } else {
            const enrichedEmployeeData = employeeData ? {
              ...employeeData,
              is_organization_owner: calculatedIsOwner || false
            } : null;

            setEmployee(enrichedEmployeeData);
            setUserRole(roleData?.role || null);
            setOrganization(orgData);

            if (employeeData?.department_id) {
              const updatedUserData = { ...userData, department_id: employeeData.department_id };
              setUserData(updatedUserData);
              userDataCacheRef.current = {
                data: updatedUserData,
                organization: orgData,
                userRole: roleData?.role || null,
                employee: enrichedEmployeeData,
                timestamp: Date.now()
              };
            } else {
              userDataCacheRef.current = {
                data: userData,
                organization: orgData,
                userRole: roleData?.role || null,
                employee: enrichedEmployeeData,
                timestamp: Date.now()
              };
            }
          }
        } catch (orgError: any) {
          if (orgError.message === 'Organization data query timeout') {
            // Timeout is handled gracefully with fallback, only log in dev mode
            if (import.meta.env.DEV) {
              logger.debug('CentralizedUserDataContext: Organization data timeout - using fallback data');
            }
            // Set userData anyway but with fallback organization data
            setEmployee(null);
            setOrganization(null);
            
            // Set a default role based on email or user metadata
            if (user.email?.includes('owner') || user.email?.includes('admin')) {
              setUserRole('owner');
              logger.userData('CentralizedUserDataContext: Set fallback owner role based on email');
            } else if (user.user_metadata?.role) {
              setUserRole(user.user_metadata.role as UserRole);
              logger.userData('CentralizedUserDataContext: Set fallback role from user metadata:', user.user_metadata.role);
            } else {
              setUserRole('employee'); // Default fallback
              logger.userData('CentralizedUserDataContext: Set default employee role as fallback');
            }
            
            // Update cache with fallback organization data
            const fallbackRole = user.email?.includes('owner') || user.email?.includes('admin')
              ? 'owner'
              : (user.user_metadata?.role as UserRole || 'employee');
            userDataCacheRef.current = {
              data: userData,
              organization: null,
              userRole: fallbackRole,
              employee: null,
              timestamp: Date.now()
            };
          } else {
            throw orgError;
          }
        }
      } else {
        // No organization found
        setEmployee(null);
        setOrganization(null);
        setUserRole(null);
        
        // Update cache with partial data (no organization)
        userDataCacheRef.current = {
          data: userData,
          organization: null,
          userRole: null,
          employee: null,
          timestamp: Date.now()
        };
      }

    } catch (err: any) {
      // Handle timeout first - jangan log sebagai error (fallback dipakai, UX tetap jalan)
      if (err.message === 'User data query timeout') {
        // Timeout is handled gracefully with fallback, only log in dev mode
        if (import.meta.env.DEV) {
          logger.debug('CentralizedUserDataContext: Query timeout - creating fallback user data from auth');
        }
        
        // Create fallback user data from auth user info
        const fallbackUserData: UserData = {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          active_organization_id: undefined, // Will be handled separately
          department_id: undefined,
          email_verified: true // Assume verified if user is authenticated
        };
        
        setUserData(fallbackUserData);
        
        // Try to set owner role if email suggests it
        const fallbackRole = user.email?.includes('owner') || user.email?.includes('admin') 
          ? 'owner' 
          : (user.user_metadata?.role as UserRole || 'employee');
        setUserRole(fallbackRole);
        
        // Update cache with fallback data
        userDataCacheRef.current = {
          data: fallbackUserData,
          organization: null,
          userRole: fallbackRole,
          employee: null,
          timestamp: Date.now()
        };
        
        logger.userData('CentralizedUserDataContext: Fallback data created:', {
          userData: fallbackUserData,
          userRole: fallbackRole
        });
        
        // Don't set error state for timeout, just finish loading
        setError(null);
      } else {
        if (import.meta.env.DEV) {
          logger.error('❌ Error fetching user data:', err);
        }
        setError(err as Error);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id, session, authLoading]);

  // Force refresh function that bypasses caching
  const forceRefreshUserData = useCallback(async () => {
    logger.userData('CentralizedUserDataContext: Force refresh requested');
    if (!user) {
      logger.userData('CentralizedUserDataContext: No user for force refresh');
      return;
    }
    
    logger.userData('CentralizedUserDataContext: Resetting cache and forcing refresh...');
    lastUserIdRef.current = '';
    fetchingRef.current = false;
    
    // Call refreshUserData with user parameter
    await refreshUserData();
  }, [refreshUserData, user]);

  
  // Track previous organization ID to detect changes
  const previousOrgIdRef = useRef<string | undefined>();

  // Effect to refresh data when auth changes
  useEffect(() => {
    // Reset when user changes
    if (!user) {
      lastUserIdRef.current = '';
      fetchingRef.current = false;
      previousOrgIdRef.current = undefined;
      setUserData(null);
      setOrganization(null);
      setUserRole(null);
      setEmployee(null);
      setLoading(false);
      return;
    }

    // Check for force refresh flags that bypass path restrictions
    const forceRefresh = sessionStorage.getItem('forceRefreshUserData');
    const emailVerifiedFlag = sessionStorage.getItem('emailVerified');
    
    // Skip data fetching on login/register pages to improve performance
    // BUT allow refresh if force refresh flag is set or email verification flag exists
    const currentPath = window.location.pathname;
    if (!forceRefresh && !emailVerifiedFlag && (currentPath === '/login' || currentPath === '/register' || currentPath === '/verify-email')) {
      setLoading(false);
      return;
    }

    // Only fetch data for authenticated users on protected pages
    // Don't reset lastUserIdRef here to allow caching to work
    if (user && session && lastUserIdRef.current !== user.id) {
      refreshUserData();
    }
  }, [user?.id, session]);

  // Effect to refresh data when active organization changes
  useEffect(() => {
    if (userData?.active_organization_id && 
        previousOrgIdRef.current !== undefined &&
        previousOrgIdRef.current !== userData.active_organization_id) {
      
      previousOrgIdRef.current = userData.active_organization_id;
      
      // Force refresh of organization-specific data when org actually changes
      lastUserIdRef.current = '';
      fetchingRef.current = false;
      refreshUserData();
    } else if (userData?.active_organization_id) {
      // Just track the organization ID without triggering refresh
      previousOrgIdRef.current = userData.active_organization_id;
    }
  }, [userData?.active_organization_id]);

  // Computed values - focus only on 5 core tables  
  const isAuthenticated = !!user;
  const isEmailVerified = !!userData && userData.email_verified === true; // Use email_verification_tokens.email_verified NOT auth.users.email_confirmed_at
  const hasOrganization = !!userData?.active_organization_id;
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin';
  const displayName = userData?.full_name || user?.user_metadata?.full_name || 'User';
  const organizationName = organization?.company_name || '';

  const value: CentralizedUserDataContextType = {
    // Auth data - focus only on 5 core tables
    user,
    userData,
    organization,
    userRole,
    employee,
    loading: authLoading || loading,
    error,
    
    // Computed values
    isAuthenticated,
    isEmailVerified,
    hasOrganization,
    isOwner,
    isAdmin,
    displayName,
    organizationName,
    
    // Actions
    refreshUserData,
    forceRefreshUserData,
  };

  return (
    <CentralizedUserDataContext.Provider value={value}>
      {children}
    </CentralizedUserDataContext.Provider>
  );
};

// Hooks
export const useCentralizedUserData = (): CentralizedUserDataContextType => {
  const context = useContext(CentralizedUserDataContext);
  // Saat di luar provider (mis. HMR / React Fast Refresh), kembalikan default agar tidak crash
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.warn('useCentralizedUserData: called outside CentralizedUserDataProvider, using default (loading)');
    }
    return DEFAULT_CENTRALIZED_USER_DATA;
  }
  return context;
};

export const useUserAuth = () => {
  const { user, loading, isAuthenticated } = useCentralizedUserData();
  return { user, loading, isAuthenticated };
};

export const useUserProfile = () => {
  const { userData, loading } = useCentralizedUserData();
  return { userData, loading };
};

export const useUserOrganization = () => {
  const { organization, loading, hasOrganization } = useCentralizedUserData();
  return { organization, loading, hasOrganization };
};
