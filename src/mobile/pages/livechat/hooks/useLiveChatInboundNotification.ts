/**
 * Global realtime subscription for inbound messages.
 * Shows a system notification when an inbound message arrives, so the user
 * gets notified even when on the conversation list or when the app is in background
 * (as long as the realtime connection is still active).
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useLiveChatInboundNotification(currentConversationId: string | null) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channelName = 'livechat_inbound_global';

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleInbound = (payload: { new?: { conversation_id?: string; direction?: string } }) => {
      const row = payload?.new;
      if (!row || row.direction !== 'inbound') return;
      const conversationId = row.conversation_id;
      if (!conversationId) return;
      // Avoid duplicate: when user is viewing this conversation, ChatThread will show notification
      if (currentConversationId === conversationId) return;

      const isHidden = document.visibilityState === 'hidden';
      if (isHidden) {
        showInboundNotification(
          'Pesan baru',
          'Ada pesan masuk di Live Chat. Buka aplikasi untuk melihat.'
        );
        return;
      }
      // User is visible but on list or another chat — still show so they notice
      showInboundNotification(
        'Pesan baru',
        'Ada pesan masuk di Live Chat.'
      );
    };

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        handleInbound
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'instagram_messages' },
        handleInbound
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'email_messages' },
        handleInbound
      );

    channelRef.current.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('LiveChat inbound subscription failed', status);
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
