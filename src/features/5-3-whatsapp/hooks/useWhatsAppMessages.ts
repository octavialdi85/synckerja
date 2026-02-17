import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppMessage } from '../types';

const QUERY_KEY = ['whatsapp-messages'] as const;

export function useWhatsAppMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `whatsapp_messages:${conversationId}`;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Realtime: any INSERT/UPDATE (inbound from webhook or outbound from send) triggers refetch
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new?: { direction?: string } }) => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, conversationId] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
          // Hanya refresh status UI ketika pesan INBOUND (customer kirim). Kalau outbound (kita reply),
          // jangan invalidate status supaya optimistic "In Progress" tidak tertimpa refetch data lama.
          const isInbound = payload?.new?.direction === 'inbound';
          if (isInbound) {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation-status', conversationId] });
            if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = setTimeout(() => {
              fallbackTimeoutRef.current = null;
              queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation-status', conversationId] });
              queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEY, conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<WhatsAppMessage[]> => {
      if (!conversationId) return [];
      // Fetch ALL messages (inbound + outbound); no direction filter — UI shows both
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WhatsAppMessage[];
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });
}
