import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useMemo } from 'react';

export interface ContentPlan {
  id: string;
  organization_id: string;
  post_date: string | null;
  content_type_id: string | null;
  pic_id: string | null;
  service_id: string | null;
  sub_service_id: string | null;
  title: string | null;
  content_pillar_id: string | null;
  brief: string | null;
  status: string;
  revision_count: number;
  approved: boolean;
  completion_date: string | null;
  pic_production_id: string | null;
  google_drive_link: string | null;
  production_status: string;
  production_revision_count: number;
  production_completion_date: string | null;
  production_approved: boolean;
  production_approved_date: string | null;
  post_link: any | null; // Changed from Record<string, string> to any to handle Json type
  done: boolean;
  actual_post_date: string | null;
  on_time_status: string;
  status_content: string;
  created_at: string;
  updated_at: string;
  content_type?: {
    id: string;
    name: string;
  };
  service?: {
    id: string;
    name: string;
  };
  sub_service?: {
    id: string;
    name: string;
  };
  content_pillar?: {
    id: string;
    name: string;
    color?: string;
  };
  pic?: {
    id: string;
    full_name: string;
  };
  pic_production?: {
    id: string;
    full_name: string;
  };
}

export interface ContentType {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubService {
  id: string;
  name: string;
  description?: string;
  service_id: string;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentPillar {
  id: string;
  name: string;
  description?: string;
  color?: string;
  funnel_stage?: string;
  organization_id?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentManager {
  id: string;
  name: string;
  pic: string;
  target: number;
  actual: number;
  percentage: number;
  dailyTarget?: number;
  monthlyTarget?: number;
  targetAdjusted?: number;
  progress?: number;
  onTimeRate?: number;
  effectiveRate?: number;
  score?: number;
}

export interface SocialMediaMetrics {
  dailyOverdueContent: number;
  dailyCompletedContent: number;
  dailyRevisedContent: number;
  dailyTotalContent: number;
  monthlyOverdueContent: number;
  monthlyCompletedContent: number;
  monthlyRevisedContent: number;
  monthlyTotalContent: number;
}

export interface HolidayEvent {
  date: Date;
  name: string;
  type: 'national' | 'international' | 'religious';
  description?: string;
}

export interface PillarData {
  pillar_id: string;
  pillar_name: string;
  count: number;
  funnel: 'top' | 'middle' | 'bottom';
  previousMonthCount?: number;
  isDefault: boolean;
}

/**
 * Hook to fetch milestones for KOL content posts
 */
export const useContentPostMilestones = (postIds: string[]) => {
  const { organizationId } = useCurrentOrg();

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['content-post-milestones', organizationId, postIds],
    queryFn: async () => {
      if (!organizationId || !postIds || postIds.length === 0) return [];

      const { data, error } = await supabase
        .from('payment_milestones')
        .select('*')
        .in('content_post_id', postIds)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching content post milestones:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organizationId && postIds.length > 0,
  });

  // Group milestones by post ID
  const milestonesByPost = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    milestones.forEach((milestone: any) => {
      const postId = milestone.content_post_id;
      if (postId) {
        if (!grouped[postId]) {
          grouped[postId] = [];
        }
        grouped[postId].push(milestone);
      }
    });
    return grouped;
  }, [milestones]);

  const getMilestonesForPost = (postId: string) => {
    return milestonesByPost[postId] || [];
  };

  return {
    milestones,
    milestonesByPost,
    getMilestonesForPost,
    isLoading,
  };
};

/**
 * Hook to fetch performance data for KOL content posts
 */
export const useContentPostPerformanceData = () => {
  const { organizationId } = useCurrentOrg();

  const { data: performanceData = [], isLoading } = useQuery({
    queryKey: ['content-post-performance', organizationId],
    queryFn: async () => {
      // Return empty array immediately - table does not exist
      return [];
    },
    enabled: false, // Disabled - table does not exist
    retry: false,
    staleTime: Infinity, // Never refetch
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const getPerformanceData = (postId: string) => {
    return performanceData.find((p: any) => p.content_post_id === postId) || null;
  };

  return {
    performanceData,
    getPerformanceData,
    isLoading,
  };
};
