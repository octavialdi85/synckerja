import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { PillarData } from '../types/social-media';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useContentPillarData = (selectedMonth?: Date) => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['contentPillarData', organizationId, selectedMonth?.getTime()],
    queryFn: async (): Promise<PillarData[]> => {
      try {
        // Starting content pillar data fetch

        // Optimized query using the new is_default column
        const { data: pillarsData, error: pillarsError } = await supabase
          .from('content_pillars')
          .select('id, name, funnel_stage, organization_id, is_default')
          .eq('is_active', true)
          .or(organizationId ? `is_default.eq.true,organization_id.eq.${organizationId}` : 'is_default.eq.true')
          .order('is_default', { ascending: false })
          .order('name', { ascending: true });

        if (pillarsError) {
          console.error('Error fetching pillars:', pillarsError);
          throw pillarsError;
        }

        if (!pillarsData || pillarsData.length === 0) {
          return [];
        }

        // Filter to avoid duplicates (prefer organization-specific over default)
        const seenNames = new Set<string>();
        const filteredPillars = pillarsData.filter(pillar => {
          if (seenNames.has(pillar.name)) {
            return false;
          }
          seenNames.add(pillar.name);
          return true;
        });

        // Get usage data for selected month and previous month if organization exists
        let usageData: any[] = [];
        let prevUsageData: any[] = [];

        if (organizationId) {
          const filterDate = selectedMonth || new Date();
          const filterMonthStart = startOfMonth(filterDate);
          const filterMonthEnd = endOfMonth(filterDate);
          
          // Fetching usage data for selected month
          const { data: currentUsage, error: usageError } = await supabase
            .from('social_media_plans')
            .select('content_pillar_id, post_date')
            .eq('organization_id', organizationId)
            .not('content_pillar_id', 'is', null)
            .gte('post_date', filterMonthStart.toISOString().split('T')[0])
            .lte('post_date', filterMonthEnd.toISOString().split('T')[0]);

          if (usageError) {
            console.error('Error fetching usage data:', usageError);
          } else {
            usageData = currentUsage || [];
            console.log('Selected month usage data:', usageData);
          }

          // Previous month usage for comparison
          const prevMonthStart = new Date(filterMonthStart);
          prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
          const prevMonthEnd = endOfMonth(prevMonthStart);
          
          console.log('Fetching usage for previous month:', prevMonthStart, prevMonthEnd);

          const { data: prevUsage, error: prevUsageError } = await supabase
            .from('social_media_plans')
            .select('content_pillar_id, post_date')
            .eq('organization_id', organizationId)
            .gte('post_date', prevMonthStart.toISOString().split('T')[0])
            .lte('post_date', prevMonthEnd.toISOString().split('T')[0])
            .not('content_pillar_id', 'is', null);

          if (prevUsageError) {
            console.error('Error fetching previous usage data:', prevUsageError);
          } else {
            prevUsageData = prevUsage || [];
            console.log('Previous month usage data:', prevUsageData);
          }
        }

        // Calculate usage counts
        const usageCounts = usageData.reduce((acc, item) => {
          if (item.content_pillar_id) {
            acc[item.content_pillar_id] = (acc[item.content_pillar_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const prevUsageCounts = prevUsageData.reduce((acc, item) => {
          if (item.content_pillar_id) {
            acc[item.content_pillar_id] = (acc[item.content_pillar_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Transform data to PillarData format
        const result = filteredPillars.map(pillar => {
          const pillarData: PillarData = {
            pillar_id: pillar.id,
            pillar_name: pillar.name,
            count: usageCounts[pillar.id] || 0,
            funnel: (pillar.funnel_stage as 'top' | 'middle' | 'bottom') || 'top',
            previousMonthCount: prevUsageCounts[pillar.id] || 0,
            isDefault: pillar.is_default || false
          };
          return pillarData;
        });
        
        return result;
      } catch (error) {
        console.error('Error in contentPillarData fetch:', error);
        throw error;
      }
    },
    enabled: true,
    staleTime: 30 * 1000, // Reduced to 30 seconds for realtime feel
    gcTime: 2 * 60 * 1000, // Reduced to 2 minutes
    refetchOnWindowFocus: false, // Disabled to prevent reload when switching windows (realtime handles updates)
    refetchOnMount: true,
    retry: 2,
    retryDelay: 2000,
  });
};

