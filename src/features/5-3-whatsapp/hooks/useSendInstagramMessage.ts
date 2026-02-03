import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import type { WhatsAppMessage } from '../types';

export interface SendInstagramMessageParams {
  to: string;
  text: string;
  conversation_id?: string | null;
  reply_to_wa_message_id?: string | null;
}

export function useSendInstagramMessage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: SendInstagramMessageParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const url = `${SUPABASE_URL}/functions/v1/send-instagram-message`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to: params.to,
          text: params.text,
          conversation_id: params.conversation_id ?? null,
          reply_to_wa_message_id: params.reply_to_wa_message_id ?? null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof json?.error === 'string' ? json.error : null) ??
          (typeof json?.details?.error?.message === 'string' ? json.details.error.message : null) ??
          (res.status === 400
            ? 'Permintaan tidak valid. Pastikan Instagram sudah terhubung di halaman Connect Instagram.'
            : res.status === 502
              ? 'Gagal kirim (502). Cek: 1) Token di Connect WhatsApp/Connect Instagram harus User access token dengan permission pages_show_list. 2) Pengguna harus mengirim pesan dalam 24 jam terakhir. 3) Log di Supabase → Edge Functions → send-instagram-message.'
              : 'Gagal mengirim pesan.');
        throw new Error(msg);
      }
      return json;
    },
    onSuccess: (data: { success?: boolean; message?: WhatsAppMessage | null }, variables) => {
      const conversationId = variables.conversation_id;
      if (conversationId && data?.message) {
        queryClient.setQueryData<WhatsAppMessage[]>(
          ['whatsapp-messages', conversationId],
          (prev = []) => {
            if (prev.some((m) => m.id === data.message!.id)) return prev;
            return [...prev, data.message!].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
        );
      }
      if (conversationId) {
        if (!data?.message) {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
        }
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation-status', conversationId] });
        queryClient.refetchQueries({ queryKey: ['whatsapp-conversation-status', conversationId] });
      }
    },
  });

  return {
    send: mutation.mutateAsync,
    isSending: mutation.isPending,
  };
}
