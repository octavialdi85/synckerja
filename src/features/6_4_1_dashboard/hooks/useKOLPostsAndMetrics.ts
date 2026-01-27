import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';

interface KOLPost {
  id: string;
  kol_id: string;
  platform: string;
  post_url: string;
  content_type: string;
  engagement_rate: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
}

interface KOLMetrics {
  kol_id: string;
  total_posts: number;
  total_reach: number;
  total_engagement: number;
  avg_engagement_rate: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
}

export const useKOLPostsAndMetrics = (kolId?: string) => {
  const { currentOrg } = useCurrentOrg();

  // DISABLED: Table kol_posts does not exist - return empty data without querying
  const { data: posts, isLoading: postsLoading, error: postsError } = useQuery({
    queryKey: ['kol-posts', currentOrg?.id, kolId],
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

  // DISABLED: Table kol_metrics does not exist - return empty data without querying
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['kol-metrics', currentOrg?.id, kolId],
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

  // Calculate aggregated metrics
  const aggregatedMetrics = React.useMemo(() => {
    if (!posts || posts.length === 0) return null;

    const totalPosts = posts.length;
    const totalReach = posts.reduce((sum, post) => sum + (post.reach || 0), 0);
    const totalEngagement = posts.reduce((sum, post) => sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0), 0);
    const avgEngagementRate = posts.reduce((sum, post) => sum + (post.engagement_rate || 0), 0) / totalPosts;
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments || 0), 0);
    const totalShares = posts.reduce((sum, post) => sum + (post.shares || 0), 0);

    return {
      total_posts: totalPosts,
      total_reach: totalReach,
      total_engagement: totalEngagement,
      avg_engagement_rate: avgEngagementRate,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_shares: totalShares,
    };
  }, [posts]);

  // Get posts by platform
  const getPostsByPlatform = (platform: string) => {
    return posts?.filter(post => post.platform === platform) || [];
  };

  // Get top performing posts
  const getTopPerformingPosts = (limit: number = 5) => {
    if (!posts) return [];
    
    return posts
      .sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
      .slice(0, limit);
  };

  // Get posts by content type
  const getPostsByContentType = (contentType: string) => {
    return posts?.filter(post => post.content_type === contentType) || [];
  };

  return {
    posts,
    metrics,
    aggregatedMetrics,
    isLoading: postsLoading || metricsLoading,
    error: postsError || metricsError,
    getPostsByPlatform,
    getTopPerformingPosts,
    getPostsByContentType,
  };
};
