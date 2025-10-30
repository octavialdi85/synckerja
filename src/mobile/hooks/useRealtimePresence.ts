import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserPresence {
  user_id: string;
  full_name: string;
  online_at: string;
  status: 'online' | 'away' | 'busy';
  page?: string;
}

export const useRealtimePresence = (organizationId: string, currentUser?: { id: string; name: string }) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!organizationId || !currentUser) return;

    const channel = supabase.channel(`organization-${organizationId}`);

    // Track current user presence
    const userStatus: UserPresence = {
      user_id: currentUser.id,
      full_name: currentUser.name,
      online_at: new Date().toISOString(),
      status: 'online',
      page: window.location.pathname
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        console.log('Presence sync:', newState);
        
        const users: UserPresence[] = [];
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((presence: UserPresence) => {
            users.push(presence);
          });
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        console.log('Presence status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          const presenceTrackStatus = await channel.track(userStatus);
          console.log('Tracking presence:', presenceTrackStatus);
        }
      });

    // Update presence when page changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        channel.track({ ...userStatus, status: 'away' });
      } else {
        channel.track({ ...userStatus, status: 'online', online_at: new Date().toISOString() });
      }
    };

    // Update presence when page location changes
    const handlePageChange = () => {
      channel.track({ ...userStatus, page: window.location.pathname, online_at: new Date().toISOString() });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePageChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePageChange);
      supabase.removeChannel(channel);
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [organizationId, currentUser]);

  const updateStatus = (status: 'online' | 'away' | 'busy') => {
    if (!currentUser) return;
    
    const channel = supabase.channel(`organization-${organizationId}`);
    channel.track({
      user_id: currentUser.id,
      full_name: currentUser.name,
      online_at: new Date().toISOString(),
      status,
      page: window.location.pathname
    });
  };

  return {
    onlineUsers,
    isConnected,
    updateStatus,
    totalOnline: onlineUsers.length,
    currentUserStatus: onlineUsers.find(u => u.user_id === currentUser?.id)?.status || 'offline'
  };
};