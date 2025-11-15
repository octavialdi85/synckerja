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
    }

    try {
      fetchingRef.current = true;
      lastUserIdRef.current = user.id;
      setLoading(true);
      setError(null);
      
      // Run profile and email verification queries in parallel with timeout
      const QUERY_TIMEOUT = 45000; // 45 seconds timeout (higher than Supabase client 30s to allow retries)
      
      const profilePromise = supabase
        .from('profiles')
        .select('user_id, full_name, email, active_organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      const verificationPromise = supabase
        .from('email_verification_tokens')
        .select('email_verified')
        .eq('user_id', user.id)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Race queries against timeout - timeout must be higher than Supabase client timeout (30s) to allow retries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User data query timeout')), QUERY_TIMEOUT)
      );
      
      const [
        { data: profileData, error: profileError },
        { data: verificationToken, error: verificationError }
      ] = await Promise.race([
        Promise.all([profilePromise, verificationPromise]),
        timeoutPromise
      ]) as any;
      
      if (import.meta.env.DEV) {
        logger.userData('CentralizedUserDataContext: Email verification check:', {
          userId: user.id,
          verificationToken,
          verificationError,
          verificationStatus: verificationToken?.email_verified
        });
      }
      
      const verificationStatus = verificationToken?.email_verified === true;

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      let organizationId = profileData?.active_organization_id;
      
      // If no organization in profile, check user_organizations table
      if (!organizationId) {
        const { data: userOrgData } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        organizationId = userOrgData?.organization_id;
        
        // If we found an organization, update the profile
        if (organizationId && profileData) {
          await supabase
            .from('profiles')
            .update({ active_organization_id: organizationId })
            .eq('user_id', user.id);
        }
      }

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

      // Get employee record, role, and organization if organization exists (with timeout)
      if (organizationId) {
        const employeePromise = supabase
          .from('employees')
          .select(`
            id,
            employee_id,
            full_name,
            email,
            organization_id,
            department_id,
            departments:department_id(name)
          `)
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        const rolePromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        const organizationPromise = supabase
          .from('organizations')
          .select('id, company_name, industry, address, website')
          .eq('id', organizationId)
          .maybeSingle();

        // Run employee, role, and organization queries in parallel with timeout
        const orgDataTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Organization data query timeout')), QUERY_TIMEOUT)
        );
        
        try {
          const [
            { data: employeeData },
            { data: roleData },
            { data: orgData }
          ] = await Promise.race([
            Promise.all([employeePromise, rolePromise, organizationPromise]),
            orgDataTimeoutPromise
          ]) as any;

          setEmployee(employeeData);
          setUserRole(roleData?.role || null);
          setOrganization(orgData);
          
          // Update userData with department_id from employee data
          if (employeeData?.department_id) {
            const updatedUserData = { ...userData, department_id: employeeData.department_id };
            setUserData(updatedUserData);
          }
        } catch (orgError: any) {
          if (orgError.message === 'Organization data query timeout') {
            console.warn('CentralizedUserDataContext: Organization data timeout - using fallback data');
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
          } else {
            throw orgError;
          }
        }
      } else {
        // No organization found
        setEmployee(null);
        setOrganization(null);
        setUserRole(null);
      }

    } catch (err: any) {
      console.error('❌ Error fetching user data:', err);
      
      // Handle timeout gracefully - create fallback user data from auth info
      if (err.message === 'User data query timeout') {
        console.warn('CentralizedUserDataContext: Query timeout - creating fallback user data from auth');
        
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
        if (user.email?.includes('owner') || user.email?.includes('admin')) {
          setUserRole('owner');
        } else if (user.user_metadata?.role) {
          setUserRole(user.user_metadata.role as UserRole);
        } else {
          setUserRole('employee'); // Default fallback
        }
        
        logger.userData('CentralizedUserDataContext: Fallback data created:', {
          userData: fallbackUserData,
          userRole: user.email?.includes('owner') ? 'owner' : 'employee'
        });
        
        // Don't set error state for timeout, just finish loading
        setError(null);
      } else {
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
    await refreshUserData(user);
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
export const useCentralizedUserData = () => {
  const context = useContext(CentralizedUserDataContext);
  if (context === undefined) {
    throw new Error('useCentralizedUserData must be used within a CentralizedUserDataProvider');
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
