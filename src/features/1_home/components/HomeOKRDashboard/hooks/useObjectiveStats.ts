import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ObjectiveStats {
  avgProgress: number;
  totalObjectives: number;
  nextDeadline: string;
}

export const useObjectiveStats = (
  organizationId: string | undefined,
  type: 'company' | 'department' | 'individual',
  cycleIds?: string[]
) => {
  return useQuery({
    queryKey: ['objective-stats', organizationId, type, cycleIds],
    queryFn: async (): Promise<ObjectiveStats> => {
      if (!organizationId) {
        return { avgProgress: 0, totalObjectives: 0, nextDeadline: 'N/A' };
      }

      let query = supabase
        .from(`${type}_objectives`)
        .select('progress_percentage, end_date')
        .eq('organization_id', organizationId);

      if (cycleIds && cycleIds.length > 0) {
        query = query.in('cycle_id', cycleIds);
      }

      const { data: objectives, error } = await query;

      if (error) {
        console.error(`Error fetching ${type} objectives:`, error);
        return { avgProgress: 0, totalObjectives: 0, nextDeadline: 'N/A' };
      }

      const totalObjectives = objectives?.length || 0;
      
      if (totalObjectives === 0) {
        return { avgProgress: 0, totalObjectives: 0, nextDeadline: 'N/A' };
      }

      // Calculate average progress
      const avgProgress = objectives.reduce((sum, obj) => sum + (obj.progress_percentage || 0), 0) / totalObjectives;

      // Find next deadline
      const now = new Date();
      const upcomingDeadlines = objectives
        .map(obj => obj.end_date)
        .filter(date => date && new Date(date) > now)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      let nextDeadline = 'N/A';
      if (upcomingDeadlines.length > 0) {
        const nextDate = new Date(upcomingDeadlines[0]);
        const month = nextDate.toLocaleDateString('en-US', { month: 'short' });
        const quarter = Math.ceil((nextDate.getMonth() + 1) / 3);
        nextDeadline = `Q${quarter}`;
      }

      return {
        avgProgress: Math.round(avgProgress),
        totalObjectives,
        nextDeadline
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};