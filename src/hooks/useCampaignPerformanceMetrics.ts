import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useMemo } from 'react';

interface CampaignMetrics {
  publishedPosts: number;
  totalPosts: number;
  reachProgress: number;
  engagementProgress: number;
  conversionProgress: number;
  totalReach?: number;
  totalEngagement?: number;
  totalConversions?: number;
  targetReach?: number;
  targetEngagement?: number;
  targetConversions?: number;
}

/**
 * Hook to fetch and calculate performance metrics for KOL campaigns
 */
export const useCampaignPerformanceMetrics = () => {
  const { currentOrg, organizationId } = useCurrentOrg();

  // Fetch all campaigns and their content posts
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaign-performance-metrics', organizationId],
    queryFn: async () => {
      const orgId = currentOrg?.id || organizationId;
      if (!orgId) return { campaigns: [], contentPosts: [] };

      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('kol_campaigns')
        .select('*')
        .eq('organization_id', orgId);

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      // Fetch content posts for all campaigns
      const campaignIds = campaigns?.map((c: any) => c.id) || [];
      let contentPosts: any[] = [];

      if (campaignIds.length > 0) {
        const { data: posts, error: postsError } = await supabase
          .from('kol_content_posts')
          .select('*')
          .in('campaign_id', campaignIds)
          .eq('organization_id', orgId);

        if (postsError) {
          console.error('Error fetching content posts:', postsError);
          // Don't throw, just return empty array
        } else {
          contentPosts = posts || [];
        }
      }

      return {
        campaigns: campaigns || [],
        contentPosts: contentPosts || [],
      };
    },
    enabled: !!(currentOrg?.id || organizationId),
  });

  // Calculate metrics for each campaign
  const metricsByCampaign = useMemo(() => {
    const metrics: Record<string, CampaignMetrics> = {};
    
    if (!campaignsData) return metrics;

    campaignsData.campaigns.forEach((campaign: any) => {
      const campaignPosts = campaignsData.contentPosts.filter(
        (post: any) => post.campaign_id === campaign.id
      );

      const publishedPosts = campaignPosts.filter(
        (post: any) => post.status === 'published' || post.status === 'completed'
      ).length;
      
      const totalPosts = campaignPosts.length;

      // Calculate progress based on campaign targets
      const targetReach = campaign.target_reach || 0;
      const targetEngagement = campaign.target_engagement || 0;
      const targetConversions = campaign.target_conversions || 0;

      // Sum up metrics from published posts
      const totalReach = campaignPosts
        .filter((post: any) => post.status === 'published' || post.status === 'completed')
        .reduce((sum: number, post: any) => sum + (post.reach || 0), 0);

      const totalEngagement = campaignPosts
        .filter((post: any) => post.status === 'published' || post.status === 'completed')
        .reduce((sum: number, post: any) => sum + (post.engagement || 0), 0);

      const totalConversions = campaignPosts
        .filter((post: any) => post.status === 'published' || post.status === 'completed')
        .reduce((sum: number, post: any) => sum + (post.conversions || 0), 0);

      // Calculate progress percentages
      const reachProgress = targetReach > 0 
        ? Math.min(100, Math.round((totalReach / targetReach) * 100))
        : 0;
      
      const engagementProgress = targetEngagement > 0
        ? Math.min(100, Math.round((totalEngagement / targetEngagement) * 100))
        : 0;
      
      const conversionProgress = targetConversions > 0
        ? Math.min(100, Math.round((totalConversions / targetConversions) * 100))
        : 0;

      metrics[campaign.id] = {
        publishedPosts,
        totalPosts,
        reachProgress,
        engagementProgress,
        conversionProgress,
        totalReach,
        totalEngagement,
        totalConversions,
        targetReach,
        targetEngagement,
        targetConversions,
      };
    });

    return metrics;
  }, [campaignsData]);

  const getCampaignMetrics = (campaignId: string): CampaignMetrics | null => {
    return metricsByCampaign[campaignId] || null;
  };

  return {
    getCampaignMetrics,
    isLoading,
    metricsByCampaign,
  };
};
















