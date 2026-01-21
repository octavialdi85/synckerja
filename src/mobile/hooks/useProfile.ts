
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  mobile_phone?: string;
  address?: string;
  join_date?: string;
  status?: string;
  department_name?: string;
  job_position_name?: string;
  job_level_name?: string;
  employee_id?: string;
  photo_url?: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user with better error handling
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        if (import.meta.env?.DEV) {
          console.error('Auth error:', userError);
        }
        // Clean up invalid auth state
        await cleanupAuthState();
        throw new Error('Authentication failed');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's active organization from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.active_organization_id) {
        // Fallback to auth user data if no active organization
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
        });
        return;
      }

      if (import.meta.env?.DEV) {
        console.log('Active organization ID:', profile.active_organization_id);
      }

      // Fetch employee data for the active organization only
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_id,
          full_name,
          email,
          mobile_phone,
          address,
          join_date,
          status,
          photo_url,
          departments(name),
          job_positions(name),
          job_levels(name),
          organization_id
        `)
        .eq('user_id', user.id)
        .eq('organization_id', profile.active_organization_id)
        .maybeSingle();

      if (import.meta.env?.DEV) {
        console.log('Employee data query result:', { employeeData, employeeError });
      }

      if (employeeError && employeeError.code !== 'PGRST116') {
        if (import.meta.env?.DEV) {
          console.error('Error fetching employee data:', employeeError);
        }
        throw employeeError;
      }

      if (employeeData) {
        // Verify the employee belongs to the correct organization
        if (employeeData.organization_id === profile.active_organization_id) {
          setProfile({
            id: employeeData.id,
            full_name: employeeData.full_name,
            email: employeeData.email || user.email || '',
            mobile_phone: employeeData.mobile_phone,
            address: employeeData.address,
            join_date: employeeData.join_date,
            status: employeeData.status,
            department_name: employeeData.departments?.name,
            job_position_name: employeeData.job_positions?.name,
            job_level_name: employeeData.job_levels?.name,
            employee_id: employeeData.employee_id,
            photo_url: employeeData.photo_url,
          });
        } else {
          if (import.meta.env?.DEV) {
            console.warn('Employee organization mismatch');
          }
          // Fallback to basic user data
          setProfile({
            id: user.id,
            full_name: user.user_metadata?.full_name || 'User',
            email: user.email || '',
          });
        }
      } else {
        if (import.meta.env?.DEV) {
          console.log('No employee data found for active organization');
        }
        // Fallback to auth user data if no employee record found
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
        });
      }
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.error('Error fetching profile:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      
      // If it's an auth error, redirect to login
      if (err instanceof Error && (err.message.includes('not authenticated') || err.message.includes('Authentication failed'))) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const cleanupAuthState = async () => {
    try {
      // Remove all auth-related keys from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Error cleaning up auth state:', error);
      }
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Clear profile data
      setProfile(null);
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.error('Error logging out:', err);
      }
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Listen for profile changes (organization switching)
  useEffect(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      // Defer subscription until tab is visible
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          fetchProfile();
        }
      };
      document.addEventListener('visibilitychange', onVisible, { once: true });
      return () => document.removeEventListener('visibilitychange', onVisible);
    }

    const channel = supabase
      .channel('profile-organization-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'active_organization_id=neq.null'
        },
        (payload) => {
          if (import.meta.env?.DEV) {
            console.log('Profile organization updated:', payload);
          }
          setTimeout(() => {
            fetchProfile();
          }, 150);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // Avoid noisy errors when socket already closed
        if (import.meta.env?.DEV) {
          console.warn('Cleanup channel skipped:', e);
        }
      }
    };
  }, []);

  return {
    profile,
    loading,
    error,
    logout,
    refetch: fetchProfile,
  };
};
