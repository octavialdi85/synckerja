import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export function useScriptAIConfig() {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['script-ai-config', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }
      const { data, error } = await supabase
        .from('organization_script_ai_config')
        .select('is_active, api_key_configured')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data as { is_active: boolean; api_key_configured: boolean } | null;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
