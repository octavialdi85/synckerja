import { useCurrentOrgContext } from '@/features/1-login/contexts/CurrentOrgContext';
import { supabase } from '@/integrations/supabase/client';

export { clearCurrentOrgCacheForUser, setCurrentOrgCacheForUser } from './useCurrentOrgCache';

export const useCurrentOrg = () => useCurrentOrgContext();

export const getCurrentOrganizationId = async (): Promise<{ organizationId: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('active_organization_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !profile?.active_organization_id) {
    throw new Error('No active organization found');
  }
  return { organizationId: profile.active_organization_id };
};
