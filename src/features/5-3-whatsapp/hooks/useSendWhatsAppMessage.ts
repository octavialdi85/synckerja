import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUPABASE_URL } from '@/integrations/supabase/client';

export interface SendWhatsAppMessageParams {
  to: string;
  text: string;
  conversation_id?: string | null;
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: SendWhatsAppMessageParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const url = `${SUPABASE_URL}/functions/v1/send-whatsapp-message`;
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
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const metaMsg = json?.details?.error?.message ?? json?.details?.error_message;
        const rawMsg = metaMsg || json?.error || 'Failed to send';
        const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
        // (#10) = Meta/WhatsApp: app does not have permission – show friendlier message
        const isPermissionError = json?.code === 10 || msg.includes('(#10)');
        const friendlyMsg = isPermissionError
          ? 'WhatsApp: Aplikasi tidak memiliki izin untuk mengirim pesan. Periksa konfigurasi WhatsApp Business dan izin di Meta Developer.'
          : msg;
        throw new Error(friendlyMsg);
      }
      return json;
    },
    onSuccess: (_, variables) => {
      if (variables.conversation_id) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', variables.conversation_id] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      }
      toast.success('Message sent');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to send message');
    },
  });

  return {
    send: mutation.mutateAsync,
    isSending: mutation.isPending,
  };
}
