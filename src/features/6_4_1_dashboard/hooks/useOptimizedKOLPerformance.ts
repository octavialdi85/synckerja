
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APP_CONSTANTS, QUERY_KEYS } from '@/features/6-1-dashboard/utils/optimizedConstants';
import { useCurrentOrg } from '@/hooks/organized/utils';

interface KOLPerformanceData {
  kol_profile_id: string;
  kol_name: string;
  category: string;
  total_followers: number;
  avg_engagement_rate: number;
  total_conversions: number;
  total_conversion_value: number;
  performance_score: number;
}

export const useOptimizedKOLPerformance = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Simplified query that returns mock data for now
  const {
    data: performanceData = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...QUERY_KEYS.KOL_PERFORMANCE, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      if (import.meta.env.DEV) {
        console.log('🎯 Optimized KOL performance fetch for org:', organizationId);
      }
      
      // Return mock data until KOL tables are properly set up
      const mockData: KOLPerformanceData[] = [
        {
          kol_profile_id: '1',
          kol_name: 'Sample KOL 1',
          category: 'Lifestyle',
          total_followers: 50000,
          avg_engagement_rate: 4.5,
          total_conversions: 150,
          total_conversion_value: 25000,
          performance_score: 85
        },
        {
          kol_profile_id: '2',
          kol_name: 'Sample KOL 2',
          category: 'Tech',
          total_followers: 75000,
          avg_engagement_rate: 3.8,
          total_conversions: 200,
          total_conversion_value: 40000,
          performance_score: 92
        }
      ];

      if (import.meta.env.DEV) {
        console.log('✅ KOL performance data processed:', mockData.length, 'KOLs');
      }
      
      return mockData;
    },
    enabled: !!organizationId,
    staleTime: APP_CONSTANTS.CACHE_TIMES.MEDIUM,
    gcTime: APP_CONSTANTS.CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: APP_CONSTANTS.RETRY_CONFIG.attempts,
    retryDelay: APP_CONSTANTS.RETRY_CONFIG.delay,
  });

  // Memoized top performers calculation
  const topPerformers = React.useMemo(() => {
    return performanceData
      .filter(kol => kol.performance_score > 0)
      .sort((a, b) => b.performance_score - a.performance_score)
      .slice(0, 5);
  }, [performanceData]);

  // Optimized refresh mutation
  const refreshPerformanceData = useMutation({
    mutationFn: async () => {
      if (import.meta.env.DEV) {
        console.log('🔄 Manual refresh of KOL performance data');
      }
      await queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.KOL_PERFORMANCE 
      });
      return refetch();
    },
    onSuccess: () => {
      if (import.meta.env.DEV) {
        console.log('✅ KOL performance data refreshed successfully');
      }
    },
  });

  return {
    performanceData,
    isLoading,
    error,
    topPerformers,
    refreshPerformanceData,
  };
};
