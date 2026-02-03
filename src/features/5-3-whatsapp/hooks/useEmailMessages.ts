import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmailMessage } from '../types';

const QUERY_KEY = ['email-messages'] as const;

export function useEmailMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    const channelName = `email_messages:${conversationId}`;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, conversationId] });
          queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
        }
      )
      .subscribe();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEY, conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<EmailMessage[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmailMessage[];
    },
    refetchInterval: 30000,
  });
}
