/**
 * Global realtime subscription for inbound messages.
 * - When app visible (mobile Live Chat): shows in-app toast (WhatsApp-style).
 * - When app in background: shows system/browser notification.
 */
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { devLog } from '@/config/logger';

function getNotificationSoundUrl(): string {
  if (typeof window === 'undefined') return '/notification-bell.wav';
  return `${window.location.origin}/notification-bell.wav`;
}

function playInboundSound(): void {
  if (typeof document === 'undefined') return;
  try {
    if (navigator.vibrate) navigator.vibrate(200);
    const url = getNotificationSoundUrl();
    const audio = new Audio(url);
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch {
    // ignore
  }
}

function showInboundNotification(title: string, body: string) {
  if (typeof document === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    playInboundSound();
    const n = new Notification(title, {
      body,
      tag: 'livechat-inbound',
      requireInteraction: false,
    });
    setTimeout(() => n.close(), 6000);
  } catch {
    // ignore
  }
}

type InboundTable = 'whatsapp_messages' | 'instagram_messages' | 'email_messages';

function getChannelLabel(table: InboundTable): string {
  if (table === 'whatsapp_messages') return 'WhatsApp';
  if (table === 'instagram_messages') return 'Instagram';
  return 'Email';
}

function getMessagePreview(row: Record<string, unknown>): string {
  const body = (row.body as string) ?? (row.caption as string) ?? (row.text as string) ?? (row.snippet as string) ?? '';
  const str = typeof body === 'string' ? body.trim() : '';
  if (str.length <= 48) return str || 'Pesan baru';
  return str.slice(0, 45) + '…';
}

/** Toast bergaya WhatsApp: eksplisit [Channel] + preview pesan */
function showInboundToast(channelLabel: string, messagePreview: string) {
  playInboundSound();
  toast(`[${channelLabel}] Pesan baru`, {
    description: messagePreview,
    duration: 4000,
    position: 'top-center',
    classNames: {
      toast:
        'border-l-4 border-l-[#25D366] bg-white text-gray-900 shadow-lg max-w-[min(320px,calc(100vw-24px))]',
      description: 'text-gray-600',
      title: 'font-semibold',
    },
  });
}

export function useLiveChatInboundNotification(currentConversationId: string | null) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channelName = 'livechat_inbound_global';

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleInbound = (table: InboundTable) => (payload: { new?: Record<string, unknown> }) => {
      const row = payload?.new as { conversation_id?: string; direction?: string } | undefined;
      if (!row || row.direction !== 'inbound') return;
      const conversationId = row.conversation_id;
      if (!conversationId) return;
      if (currentConversationId === conversationId) return;

      const channelLabel = getChannelLabel(table);
      const messagePreview = getMessagePreview((payload?.new ?? {}) as Record<string, unknown>);
      // Toast in-app selalu ditampilkan (saat foreground maupun background — saat user kembali akan terlihat)
      showInboundToast(channelLabel, messagePreview);
      // Saat tab di background, tambahkan notifikasi sistem agar user bisa diingatkan
      if (document.visibilityState === 'hidden') {
        showInboundNotification(
          `[${channelLabel}] Pesan baru`,
          messagePreview || 'Ada pesan masuk di Live Chat. Buka aplikasi untuk melihat.'
        );
      }
    };

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        handleInbound('whatsapp_messages')
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'instagram_messages' },
        handleInbound('instagram_messages')
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'email_messages' },
        handleInbound('email_messages')
      );

    const channelErrorToastShownRef = { current: false };
    channelRef.current.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        devLog.warn('LiveChat inbound subscription failed', status);
        if (!channelErrorToastShownRef.current) {
          channelErrorToastShownRef.current = true;
          toast.warning('Koneksi notifikasi terganggu');
        }
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentConversationId]);
}
