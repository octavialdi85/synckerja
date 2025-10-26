
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/1-login/contexts/AuthContext";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  active_organization_id: string | null;
  created_at: string;
  updated_at: string;
  organization_created: boolean;
}

interface Organization {
  company_name: string;
}

type UserRole = 'owner' | 'admin' | 'employee' | null;

interface UserData {
  profile: Profile | null;
  organization: Organization | null;
  userRole: UserRole;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

// Ultra-fast cache for user data
const userDataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute for faster updates

export const useUserData = (): UserData => {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<string>('');

  const fetchUserData = useCallback(async (userId: string) => {
    // Prevent duplicate fetches for the same user
    if (fetchingRef.current) {
      console.log('🚫 Preventing duplicate fetch for user:', userId);
      return;
    }

    // Check if we already have this user in progress and have data
    if (lastFetchRef.current === userId && profile !== null) {
      console.log('📋 Using existing fetch for user:', userId);
      return;
    }

    // Check cache first
    const cacheKey = `user-${userId}`;
    const cached = userDataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('📋 Using cached user data for:', userId);
      setProfile(cached.data.profile);
      setOrganization(cached.data.organization);
      setUserRole(cached.data.userRole);
      setLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      lastFetchRef.current = userId;
      setLoading(true);
      
      console.log("🔍 useUserData: Starting optimized fetch for user:", userId);
      
      // Parallel fetch of profile and role data
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase.rpc('get_user_role_in_active_org')
      ]);

      let profileData = profileResult.data;
      
      if (profileResult.error) {
        console.error("❌ useUserData: Profile error:", profileResult.error);
        // Create fallback profile from auth data with all required fields
        profileData = {
          id: userId,
          user_id: userId,
          full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
          email: user?.email || '',
          active_organization_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // email_verified field moved to email_verification_tokens table
          organization_created: false
        };
      } else {
        console.log("✅ useUserData: Profile fetched:", profileData);
      }

      setProfile(profileData);

      // Get role data
      const roleData = roleResult.error ? null : roleResult.data as UserRole;
      if (roleResult.error) {
        console.error("❌ useUserData: Role fetch error:", roleResult.error);
      } else {
        console.log("✅ useUserData: Role in active org:", roleData);
      }
      setUserRole(roleData);

      // Get organization data if available
      let orgData = null;
      if (profileData?.active_organization_id) {
        const { data: organizationData, error: orgError } = await supabase
          .from('organizations')
          .select('company_name')
          .eq('id', profileData.active_organization_id)
          .single();

        if (orgError) {
          console.error("❌ useUserData: Organization error:", orgError);
        } else {
          console.log("✅ useUserData: Organization fetched:", organizationData);
          orgData = organizationData;
        }
      }

      setOrganization(orgData);

      // Cache the results
      userDataCache.set(cacheKey, {
        data: {
          profile: profileData,
          organization: orgData,
          userRole: roleData
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error("❌ useUserData: Unexpected error:", error);
      
      // Even on error, create a basic profile from auth data with all required fields
      const fallbackProfile = {
        id: userId,
        user_id: userId,
        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        email: user?.email || '',
        active_organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // email_verified field moved to email_verification_tokens table
        organization_created: false
      };
      setProfile(fallbackProfile);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user || !session) {
      setProfile(null);
      setOrganization(null);
      setUserRole(null);
      setLoading(false);
      lastFetchRef.current = '';
      return;
    }

    fetchUserData(user.id);
  }, [user?.id, session, fetchUserData]);

  const refreshUserData = useCallback(async () => {
    if (user?.id) {
      console.log('🔄 Manual refresh of user data triggered');
      lastFetchRef.current = ''; // Reset to allow refetch
      userDataCache.delete(`user-${user.id}`); // Clear cache
      fetchingRef.current = false; // Reset fetching flag
      await fetchUserData(user.id);
    }
  }, [user?.id, fetchUserData]);

  return { profile, organization, userRole, loading, refreshUserData };
};
