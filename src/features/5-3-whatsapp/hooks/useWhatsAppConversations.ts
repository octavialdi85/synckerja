import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import type { WhatsAppConversation } from '../types';

const QUERY_KEY = ['whatsapp-conversations'] as const;

export function useWhatsAppConversations() {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const channelName = 'whatsapp_conversations_list_realtime';
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .subscribe();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEY, organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WhatsAppConversation[]> => {
      if (!organizationId) return [];
      const { data, error } = await supabase.rpc('get_whatsapp_conversations_with_preview', {
        p_organization_id: organizationId,
      });
      if (error) throw error;
      return (data ?? []) as WhatsAppConversation[];
    },
    refetchInterval: 10000,
  });
}
