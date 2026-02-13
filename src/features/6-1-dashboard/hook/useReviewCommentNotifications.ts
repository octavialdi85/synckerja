import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/1-login/contexts/AuthContext';

export interface ReviewCommentNotificationRow {
  id: string;
  user_id: string;
  link_comment_id: string;
  social_media_plan_id: string;
  review_token: string;
  plan_title: string | null;
  commenter_display_name: string | null;
  read_at: string | null;
  created_at: string;
  /** Comment message text (from link_comments join) */
  comment_text: string | null;
}

const QUERY_KEY = ['review-comment-notifications'] as const;

const NOTIFICATION_SOUND_URL = '/notification-bell.mp3';

function playNotificationSound() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') return;
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch {
    // fallback: short programmatic beep
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore
    }
  }
}

export function useReviewCommentNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userId = user?.id ?? null;

  const { data: notifications = [], refetch } = useQuery({
    queryKey: [...QUERY_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<ReviewCommentNotificationRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('review_comment_notifications')
        .select('id, user_id, link_comment_id, social_media_plan_id, review_token, plan_title, commenter_display_name, read_at, created_at, link_comments(comment_text)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<Record<string, unknown> & { link_comments?: { comment_text: string | null } | Array<{ comment_text: string | null }> | null }>;
      return rows.map((row) => {
        const lc = row.link_comments;
        const commentText = Array.isArray(lc) ? lc[0]?.comment_text ?? null : (lc as { comment_text: string | null } | undefined)?.comment_text ?? null;
        return {
          id: row.id,
          user_id: row.user_id,
          link_comment_id: row.link_comment_id,
          social_media_plan_id: row.social_media_plan_id,
          review_token: row.review_token,
          plan_title: row.plan_title ?? null,
          commenter_display_name: row.commenter_display_name ?? null,
          read_at: row.read_at ?? null,
          created_at: row.created_at,
          comment_text: commentText,
        };
      }) as ReviewCommentNotificationRow[];
    },
  });

  const unreadCountQuery = useQuery({
    queryKey: [...QUERY_KEY, 'unread', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('review_comment_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const { error } = await (supabase as unknown as { rpc: (fn: string, args: { notification_ids: null }) => Promise<{ error: { message: string } | null }> }).rpc('mark_review_comment_notifications_read', { notification_ids: null });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, userId] });
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, 'unread', userId] });
  }, [userId, queryClient]);

  const markOneRead = useCallback(async (notificationId: string) => {
    if (!userId) return;
    const { error } = await (supabase as unknown as { rpc: (fn: string, args: { notification_ids: string[] }) => Promise<{ error: { message: string } | null }> }).rpc('mark_review_comment_notifications_read', { notification_ids: [notificationId] });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, userId] });
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, 'unread', userId] });
  }, [userId, queryClient]);

  useEffect(() => {
    if (!userId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channelName = `review_comment_notifications:${userId}`;
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'review_comment_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, userId] });
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, 'unread', userId] });
          playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'review_comment_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, userId] });
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, 'unread', userId] });
        }
      )
      .subscribe();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, queryClient]);

  const count = unreadCountQuery.data ?? 0;

  return {
    notifications,
    unreadCount: count,
    isLoading: unreadCountQuery.isLoading,
    markAllRead,
    markOneRead,
    refetch,
  };
}
