import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import type { EmailMessage } from '../types';

export interface SendEmailReplyParams {
  conversation_id: string;
  body: string;
  subject?: string | null;
}

export function useSendEmailReply() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: SendEmailReplyParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const url = `${SUPABASE_URL}/functions/v1/send-email-reply`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversation_id: params.conversation_id,
          body: params.body,
          subject: params.subject ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : 'Failed to send reply';
        throw new Error(msg);
      }
      return json as { success: boolean; message: EmailMessage };
    },
    onSuccess: (data, variables) => {
      const conversationId = variables.conversation_id;
      if (conversationId && data?.message) {
        queryClient.setQueryData<EmailMessage[]>(
          ['email-messages', conversationId],
          (prev = []) => {
            if (prev.some((m) => m.id === data.message!.id)) return prev;
            return [...prev, data.message!].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ['email-messages', variables.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    },
  });

  return {
    sendReply: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  };
}
