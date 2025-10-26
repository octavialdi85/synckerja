import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/1-login/hooks/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

interface MeetingPoint {
  id: string;
  meeting_date: string;
  discussion_point: string;
  request_by: string | null;
  status: string;
  updates: string | null;
  created_at: string;
  organization_id: string;
}

interface MeetingPointUpdate {
  id: string;
  meeting_point_id: string;
  update_details: string;
  created_at: string;
  created_by: string | null;
  meeting_points?: {
    organization_id: string;
    discussion_point: string;
  };
}

interface SummaryData {
  notStarted: number;
  onGoing: number;
  completed: number;
  rejected: number;
  presented: number;
  totalUpdates: number;
}

interface Filters {
  search: string;
  status: string;
  requestBy: string;
  timeFilter: string;
}

interface MeetingNotesContextType {
  meetingPoints: MeetingPoint[];
  summaryData: SummaryData;
  recentUpdates: MeetingPointUpdate[];
  filters: Filters;
  isLoading: boolean;
  setFilters: (filters: Filters | ((prev: Filters) => Filters)) => void;
  addMeetingPoint: (data: Partial<MeetingPoint>) => Promise<void>;
  updateMeetingPoint: (id: string, data: Partial<MeetingPoint>) => Promise<void>;
  deleteMeetingPoint: (id: string) => Promise<void>;
  getUpdateHistory: (meetingPointId: string) => Promise<MeetingPointUpdate[]>;
  addUpdate: (meetingPointId: string, updateDetails: string, newStatus?: string) => Promise<void>;
  updateUpdate: (updateId: string, updateDetails: string) => Promise<void>;
  deleteUpdate: (updateId: string) => Promise<void>;
  getUpdateCount: (meetingPointId: string) => number;
}

const MeetingNotesContext = createContext<MeetingNotesContextType | undefined>(undefined);

export const useMeetingNotes = () => {
  const context = useContext(MeetingNotesContext);
  if (!context) {
    throw new Error('useMeetingNotes must be used within a MeetingNotesProvider');
  }
  return context;
};

interface MeetingNotesProviderProps {
  children: ReactNode;
}

export const MeetingNotesProvider = ({ children }: MeetingNotesProviderProps) => {
  const [meetingPoints, setMeetingPoints] = useState<MeetingPoint[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<MeetingPointUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    requestBy: '',
    timeFilter: ''
  });
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();

  // Centralized fetch functions
  const fetchMeetingPoints = async () => {
    if (!organizationId) return;

    try {
      console.log('Fetching meeting points for organization:', organizationId); // Debug log
      
      const { data, error } = await supabase
        .from('meeting_points')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched meeting points:', data); // Debug log
      setMeetingPoints(data || []);
    } catch (error) {
      console.error('Error fetching meeting points:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meeting points',
        variant: 'destructive'
      });
    }
  };

  const fetchRecentUpdates = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('meeting_point_updates')
        .select(`
          *,
          meeting_points!inner(organization_id, discussion_point)
        `)
        .eq('meeting_points.organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentUpdates(data || []);
    } catch (error) {
      console.error('Error fetching recent updates:', error);
    }
  };

  // Calculate summary data from meeting points
  const summaryData: SummaryData = {
    notStarted: meetingPoints.filter(point => point.status === 'Not Started').length,
    onGoing: meetingPoints.filter(point => point.status === 'On Going').length,
    completed: meetingPoints.filter(point => point.status === 'Completed').length,
    rejected: meetingPoints.filter(point => point.status === 'Rejected').length,
    presented: meetingPoints.filter(point => point.status === 'Presented').length,
    totalUpdates: recentUpdates.length
  };

  const addMeetingPoint = async (data: Partial<MeetingPoint>) => {
    if (!organizationId) return;

    try {
      console.log('Adding meeting point to database:', { ...data, organization_id: organizationId }); // Debug log
      
      const { error } = await supabase
        .from('meeting_points')
        .insert({
          organization_id: organizationId,
          discussion_point: data.discussion_point || '',
          request_by: data.request_by || null,
          status: data.status || 'Not Started',
          meeting_date: data.meeting_date || new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      console.log('Meeting point added successfully'); // Debug log
      
      toast({
        title: 'Success',
        description: 'Meeting point added successfully'
      });
      
      // Refresh data immediately
      await fetchMeetingPoints();
    } catch (error) {
      console.error('Error adding meeting point:', error);
      toast({
        title: 'Error',
        description: 'Failed to add meeting point',
        variant: 'destructive'
      });
    }
  };

  const updateMeetingPoint = async (id: string, data: Partial<MeetingPoint>) => {
    try {
      const { error } = await supabase
        .from('meeting_points')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meeting point updated successfully'
      });
      
      // Refresh data immediately
      await fetchMeetingPoints();
    } catch (error) {
      console.error('Error updating meeting point:', error);
      toast({
        title: 'Error',
        description: 'Failed to update meeting point',
        variant: 'destructive'
      });
    }
  };

  const deleteMeetingPoint = async (id: string) => {
    try {
      const { error } = await supabase
        .from('meeting_points')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meeting point deleted successfully'
      });
      
      // Refresh data immediately
      await fetchMeetingPoints();
    } catch (error) {
      console.error('Error deleting meeting point:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete meeting point',
        variant: 'destructive'
      });
    }
  };

  const getUpdateHistory = async (meetingPointId: string): Promise<MeetingPointUpdate[]> => {
    try {
      const { data, error } = await supabase
        .from('meeting_point_updates')
        .select('*')
        .eq('meeting_point_id', meetingPointId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching update history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load update history',
        variant: 'destructive'
      });
      return [];
    }
  };

  const addUpdate = async (meetingPointId: string, updateDetails: string, newStatus?: string) => {
    if (!organizationId) return;

    try {
      const { error } = await supabase
        .from('meeting_point_updates')
        .insert({
          meeting_point_id: meetingPointId,
          update_details: updateDetails,
          organization_id: organizationId,
          created_by: (await supabase.auth.getUser()).data.user?.id || null
        });

      if (error) throw error;

      // Update meeting point status if provided, or auto-change to "On Going" if status is "Not Started"
      const currentPoint = meetingPoints.find(p => p.id === meetingPointId);
      const statusToUpdate = newStatus || (currentPoint?.status === 'Not Started' ? 'On Going' : currentPoint?.status);
      
      if (statusToUpdate && statusToUpdate !== currentPoint?.status) {
        await updateMeetingPoint(meetingPointId, { status: statusToUpdate });
      }

      // Refresh updates data
      await fetchRecentUpdates();

      toast({
        title: 'Success',
        description: 'Update added successfully'
      });
    } catch (error) {
      console.error('Error adding update:', error);
      toast({
        title: 'Error',
        description: 'Failed to add update',
        variant: 'destructive'
      });
    }
  };

  const updateUpdate = async (updateId: string, updateDetails: string) => {
    try {
      const { error } = await supabase
        .from('meeting_point_updates')
        .update({ update_details: updateDetails })
        .eq('id', updateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Update edited successfully'
      });

      // Refresh updates data
      await fetchRecentUpdates();
    } catch (error) {
      console.error('Error updating update:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit update',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteUpdate = async (updateId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_point_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Update deleted successfully'
      });

      // Refresh updates data
      await fetchRecentUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete update',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const getUpdateCount = (meetingPointId: string): number => {
    return recentUpdates.filter(update => update.meeting_point_id === meetingPointId).length;
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!organizationId) return;

    // Initial data fetch
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMeetingPoints(), fetchRecentUpdates()]);
      setIsLoading(false);
    };

    loadData();

    // Set up real-time subscriptions
    const meetingPointsChannel = supabase
      .channel('meeting-points-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_points',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('Real-time meeting points update:', payload); // Debug log
          fetchMeetingPoints();
        }
      )
      .subscribe();

    const updatesChannel = supabase
      .channel('meeting-updates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_point_updates'
        },
        () => {
          fetchRecentUpdates();
          fetchMeetingPoints(); // Also refresh meeting points when updates change
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(meetingPointsChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [organizationId]);

  const value: MeetingNotesContextType = {
    meetingPoints,
    summaryData,
    recentUpdates,
    filters,
    isLoading,
    setFilters,
    addMeetingPoint,
    updateMeetingPoint,
    deleteMeetingPoint,
    getUpdateHistory,
    addUpdate,
    updateUpdate,
    deleteUpdate,
    getUpdateCount
  };

  return (
    <MeetingNotesContext.Provider value={value}>
      {children}
    </MeetingNotesContext.Provider>
  );
};

