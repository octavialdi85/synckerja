import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  clearCurrentOrgCacheForUser,
  setCurrentOrgCacheForUser,
} from '@/features/1-login/hooks/useCurrentOrgCache';

export interface CurrentOrgContextValue {
  organizationId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  currentOrg: { id: string } | null;
}

const CurrentOrgContext = createContext<CurrentOrgContextValue | undefined>(undefined);

export function CurrentOrgProvider({ children }: { children: React.ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFromProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setOrganizationId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) {
      setError('Failed to fetch organization');
      setOrganizationId(null);
    } else {
      const orgId = profile?.active_organization_id ?? null;
      setOrganizationId(orgId);
      if (orgId) {
        setCurrentOrgCacheForUser(user.id, orgId);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('registrationFlow') === 'true') return;
    const t = setTimeout(fetchFromProfile, 100);
    return () => clearTimeout(t);
  }, [fetchFromProfile]);

  useEffect(() => {
    const handler = (event: CustomEvent<{ organizationId?: string }>) => {
      const newOrgId = event.detail?.organizationId;
      if (newOrgId) setOrganizationId(newOrgId);
    };
    window.addEventListener('organization-switched', handler as EventListener);
    return () => window.removeEventListener('organization-switched', handler as EventListener);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setOrganizationId(null);
        setError(null);
      }
      // After login, refetch profile so organizationId is set and SubscriptionExpiryGuard
      // can resolve (avoids loading forever when waitingForOrg never clears)
      if (event === 'SIGNED_IN') {
        fetchFromProfile();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchFromProfile]);

  const refetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setOrganizationId(null);
      return;
    }
    clearCurrentOrgCacheForUser(user.id);
    setLoading(true);
    setError(null);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) {
      setError('Failed to fetch organization');
      setOrganizationId(null);
    } else {
      const orgId = profile?.active_organization_id ?? null;
      setOrganizationId(orgId);
      if (orgId) setCurrentOrgCacheForUser(user.id, orgId);
      if (orgId) {
        window.dispatchEvent(new CustomEvent('organization-switched', { detail: { organizationId: orgId } }));
      }
    }
    setLoading(false);
  }, []);

  const value: CurrentOrgContextValue = {
    organizationId,
    loading,
    error,
    refetch,
    currentOrg: organizationId ? { id: organizationId } : null,
  };

  return (
    <CurrentOrgContext.Provider value={value}>
      {children}
    </CurrentOrgContext.Provider>
  );
}

export function useCurrentOrgContext(): CurrentOrgContextValue {
  const ctx = useContext(CurrentOrgContext);
  if (ctx === undefined) {
    throw new Error('useCurrentOrg must be used within CurrentOrgProvider');
  }
  return ctx;
}
