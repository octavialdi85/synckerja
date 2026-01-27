
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';

// Define comprehensive types for KOL analytics
export interface KOLAnalyticsData {
  totalReach: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalConversions: number;
  totalRevenue: number;
  roi: number;
  topPerformingKOLs: TopPerformingKOL[];
  platformBreakdown: PlatformBreakdown[];
  campaignPerformance: CampaignPerformance[];
}

export interface TopPerformingKOL {
  id: string;
  name: string;
  totalReach: number;
  engagementRate: number;
  conversions: number;
  revenue: number;
}

export interface PlatformBreakdown {
  platform: string;
  followers: number;
  engagement: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  reach: number;
  engagement: number;
  conversions: number;
  roi: number;
}

// Database row interfaces
interface KOLProfileRow {
  id: string;
  name: string;
  category: string;
  status: string;
  organization_id: string;
}

interface SocialAccountRow {
  platform: string;
  followers: number;
  engagement_rate: number;
  kol_profile_id: string;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  target_reach: number;
  budget: number;
  organization_id: string;
}

export const useKOLAnalytics = () => {
  const { currentOrg } = useCurrentOrg();

  return useQuery({
    queryKey: ['kol-analytics', currentOrg?.id],
    queryFn: async (): Promise<KOLAnalyticsData | null> => {
      if (!currentOrg?.id) {
        if (import.meta.env.DEV) {
          console.log('No current organization found');
        }
        return null;
      }

      try {
        if (import.meta.env.DEV) {
          console.log('Fetching KOL analytics for organization:', currentOrg.id);
        }

        // Fetch KOL profiles directly
        const { data: kolProfiles, error: kolError } = await supabase
          .from('kol_profiles')
          .select('id, name, category, status, organization_id')
          .eq('organization_id', currentOrg.id);

        if (kolError) {
          if (import.meta.env.DEV) {
            console.error('Error fetching KOL profiles:', kolError);
          }
        }

        // Fetch social media accounts
        const { data: socialAccounts, error: socialError } = await supabase
          .from('kol_social_media_accounts')
          .select(`
            platform,
            followers,
            engagement_rate,
            kol_profile_id
          `)
          .in('kol_profile_id', (kolProfiles || []).map(k => k.id));

        if (socialError) {
          if (import.meta.env.DEV) {
            console.error('Error fetching social accounts:', socialError);
          }
        }

        // Fetch campaigns
        const { data: campaigns, error: campaignError } = await supabase
          .from('kol_campaigns')
          .select('id, name, status, target_reach, budget, organization_id')
          .eq('organization_id', currentOrg.id);

        if (campaignError) {
          if (import.meta.env.DEV) {
            console.error('Error fetching campaigns:', campaignError);
          }
        }

        // Fetch conversions from real table
        const { data: conversions, error: conversionsError } = await supabase
          .from('kol_conversions')
          .select('id, conversion_value, conversion_date, kol_profile_id, content_post_id')
          .eq('organization_id', currentOrg.id);

        if (conversionsError) {
          if (import.meta.env.DEV) {
            console.error('Error fetching conversions:', conversionsError);
          }
        }

        // Process data with safe defaults
        const kols: KOLProfileRow[] = Array.isArray(kolProfiles) ? kolProfiles : [];
        const social: SocialAccountRow[] = Array.isArray(socialAccounts) ? socialAccounts : [];
        const campaignData: CampaignRow[] = Array.isArray(campaigns) ? campaigns : [];
        const conversionsData = Array.isArray(conversions) ? conversions : [];

        // Calculate analytics with real data
        const totalReach = social.reduce((sum, account) => sum + (Number(account.followers) || 0), 0);
        const totalEngagement = social.reduce((sum, account) => {
          const followers = Number(account.followers) || 0;
          const engagementRate = Number(account.engagement_rate) || 0;
          return sum + (followers * engagementRate / 100);
        }, 0);
        
        const avgEngagementRate = social.length > 0 
          ? social.reduce((sum, account) => sum + (Number(account.engagement_rate) || 0), 0) / social.length 
          : 0;

        // Use real conversions data
        const totalConversions = conversionsData.length;
        const totalRevenue = conversionsData.reduce((sum, conv) => sum + (Number(conv.conversion_value) || 0), 0);
        const totalBudget = campaignData.reduce((sum, campaign) => sum + (Number(campaign.budget) || 0), 0);
        const roi = totalBudget > 0 ? ((totalRevenue - totalBudget) / totalBudget) * 100 : 0;

        // Top performing KOLs with real conversions data
        const topPerformingKOLs: TopPerformingKOL[] = kols
          .map(kol => {
            const kolSocialAccounts = social.filter(account => account.kol_profile_id === kol.id);
            const kolTotalReach = kolSocialAccounts.reduce((sum, account) => sum + (Number(account.followers) || 0), 0);
            const kolAvgEngagement = kolSocialAccounts.length > 0 
              ? kolSocialAccounts.reduce((sum, account) => sum + (Number(account.engagement_rate) || 0), 0) / kolSocialAccounts.length 
              : 0;
            
            // Get real conversions for this KOL
            const kolConversions = conversionsData.filter(conv => conv.kol_profile_id === kol.id);
            const kolConversionsCount = kolConversions.length;
            const kolRevenue = kolConversions.reduce((sum, conv) => sum + (Number(conv.conversion_value) || 0), 0);
            
            return {
              id: kol.id,
              name: kol.name,
              totalReach: kolTotalReach,
              engagementRate: kolAvgEngagement,
              conversions: kolConversionsCount,
              revenue: kolRevenue
            };
          })
          .sort((a, b) => b.totalReach - a.totalReach)
          .slice(0, 5);

        // Platform breakdown
        const platformMap = new Map<string, { platform: string; followers: number; engagement: number }>();
        social.forEach(account => {
          if (!account.platform) return;
          
          const platform = account.platform;
          if (!platformMap.has(platform)) {
            platformMap.set(platform, { platform, followers: 0, engagement: 0 });
          }
          const existing = platformMap.get(platform)!;
          existing.followers += Number(account.followers) || 0;
          existing.engagement += (Number(account.followers) || 0) * ((Number(account.engagement_rate) || 0) / 100);
        });
        const platformBreakdown: PlatformBreakdown[] = Array.from(platformMap.values());

        // Campaign performance with real data
        // First, get content posts for campaigns to calculate real metrics
        const { data: contentPosts, error: postsError } = await supabase
          .from('kol_content_posts')
          .select('id, campaign_id, kol_profile_id, performance')
          .eq('organization_id', currentOrg.id);

        if (postsError && import.meta.env.DEV) {
          console.error('Error fetching content posts:', postsError);
        }

        const postsData = Array.isArray(contentPosts) ? contentPosts : [];
        
        const campaignPerformance: CampaignPerformance[] = campaignData.map(campaign => {
          // Get posts for this campaign
          const campaignPosts = postsData.filter(post => post.campaign_id === campaign.id);
          
          // Get conversions for campaign posts
          const campaignPostIds = campaignPosts.map(p => p.id);
          const campaignConversions = conversionsData.filter(conv => 
            campaignPostIds.includes(conv.content_post_id)
          );
          
          // Calculate real metrics
          const campaignReach = Number(campaign.target_reach) || 0;
          const campaignEngagement = campaignPosts.reduce((sum, post) => {
            const perf = post.performance as any;
            return sum + (Number(perf?.engagement) || 0);
          }, 0);
          const campaignConversionsCount = campaignConversions.length;
          const campaignRevenue = campaignConversions.reduce((sum, conv) => 
            sum + (Number(conv.conversion_value) || 0), 0
          );
          const campaignBudget = Number(campaign.budget) || 0;
          const campaignROI = campaignBudget > 0 
            ? ((campaignRevenue - campaignBudget) / campaignBudget) * 100 
            : 0;
          
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            reach: campaignReach,
            engagement: campaignEngagement,
            conversions: campaignConversionsCount,
            roi: campaignROI
          };
        });

        const result: KOLAnalyticsData = {
          totalReach,
          totalEngagement,
          avgEngagementRate,
          totalConversions,
          totalRevenue,
          roi,
          topPerformingKOLs,
          platformBreakdown,
          campaignPerformance,
        };

        if (import.meta.env.DEV) {
          console.log('KOL analytics calculated successfully:', result);
        }
        return result;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching KOL analytics:', error);
        }
        return null;
      }
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
};
