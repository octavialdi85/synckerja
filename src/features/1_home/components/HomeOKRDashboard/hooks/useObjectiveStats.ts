import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ObjectiveStats {
  avgProgress: number;
  totalObjectives: number;
  nextDeadline: string;
  active?: number;
  draft?: number;
  completed?: number;
}

export const useObjectiveStats = (
  organizationId: string | undefined,
  type: 'company' | 'department' | 'individual',
  cycleIds?: string[]
) => {
  return useQuery({
    queryKey: ['objective-stats', organizationId, type, cycleIds],
    queryFn: async (): Promise<ObjectiveStats> => {
      console.log(`🔍 [${type}] Fetching objective stats:`, { organizationId, cycleIds, type });
      
      if (!organizationId) {
        console.log(`❌ [${type}] No organizationId provided`);
        return { avgProgress: 0, totalObjectives: 0, nextDeadline: 'N/A', active: 0, draft: 0, completed: 0 };
      }

      let query = supabase
        .from(`${type}_objectives`)
        .select('id, progress_percentage, end_date, status')
        .eq('organization_id', organizationId);

      if (cycleIds && cycleIds.length > 0) {
        console.log(`🎯 [${type}] Filtering by cycle IDs:`, cycleIds);
        query = query.in('cycle_id', cycleIds);
      } else {
        console.log(`⚠️ [${type}] No cycle IDs provided, fetching all objectives for this org`);
      }

      const { data: objectives, error } = await query;

      if (error) {
        console.error(`❌ [${type}] Error fetching objectives:`, error);
        return { avgProgress: 0, totalObjectives: 0, nextDeadline: 'N/A', active: 0, draft: 0, completed: 0 };
      }

      console.log(`✅ [${type}] Objectives fetched:`, {
        count: objectives?.length || 0,
        objectives: objectives?.map(obj => ({ id: obj.id, progress: obj.progress_percentage }))
      });

      const totalObjectives = objectives?.length || 0;
      
      if (totalObjectives === 0) {
        console.log(`⚠️ [${type}] No objectives found for the selected criteria`);
        return { avgProgress: 0, totalObjectives: 0, nextDeadline: 'N/A', active: 0, draft: 0, completed: 0 };
      }
      
      // Count objectives by status
      const statusCounts = {
        active: objectives.filter(obj => obj.status === 'active').length,
        draft: objectives.filter(obj => obj.status === 'draft').length,
        completed: objectives.filter(obj => obj.status === 'completed').length
      };
      
      console.log(`📊 [${type}] Status breakdown:`, statusCounts);

      // For individual objectives, we need to calculate progress from key_results
      if (type === 'individual') {
        // Fetch key results for all individual objectives
        const objectiveIds = objectives.map(obj => obj.id);
        const { data: keyResults, error: krError } = await supabase
          .from('key_results')
          .select('individual_objective_id, current_value, target_value, progress_percentage, metric_type')
          .in('individual_objective_id', objectiveIds);

        if (krError) {
          console.error('Error fetching key results for individual objectives:', krError);
          // Fallback to using progress_percentage from objectives
          const avgProgress = objectives.reduce((sum, obj) => sum + (obj.progress_percentage || 0), 0) / totalObjectives;
          return {
            avgProgress: Math.round(avgProgress),
            totalObjectives,
            nextDeadline: 'N/A',
            active: statusCounts.active,
            draft: statusCounts.draft,
            completed: statusCounts.completed
          };
        }

        // Calculate progress for each objective based on its key results
        const objectiveProgresses = objectiveIds.map(objectiveId => {
          const objKeyResults = keyResults?.filter(kr => kr.individual_objective_id === objectiveId) || [];
          
          if (objKeyResults.length === 0) {
            // No key results, use progress_percentage from objective
            const obj = objectives.find(o => o.id === objectiveId);
            return obj?.progress_percentage || 0;
          }

          // Calculate average progress from key results
          const totalKrProgress = objKeyResults.reduce((sum, kr) => {
            if (kr.metric_type === 'number') {
              // For numerical metrics, calculate percentage
              const currentValue = kr.current_value || 0;
              const targetValue = kr.target_value || 1;
              return sum + (targetValue > 0 ? (currentValue / targetValue) * 100 : 0);
            } else {
              // For percentage metrics, use progress_percentage
              return sum + (kr.progress_percentage || 0);
            }
          }, 0);

          return totalKrProgress / objKeyResults.length;
        });

        // Calculate average progress across all objectives
        const avgProgress = objectiveProgresses.reduce((sum, progress) => sum + progress, 0) / totalObjectives;

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
          nextDeadline,
          active: statusCounts.active,
          draft: statusCounts.draft,
          completed: statusCounts.completed
        };
      }

      // For company objectives, calculate progress from department_objectives (not key_results)
      if (type === 'company') {
        // Fetch department objectives for all company objectives
        const objectiveIds = objectives.map(obj => obj.id);
        console.log(`📊 [company] Fetching department objectives for company objectives:`, objectiveIds);
        
        const { data: deptObjectives, error: deptError } = await supabase
          .from('department_objectives')
          .select('company_objective_id, progress_percentage')
          .in('company_objective_id', objectiveIds);

        console.log(`📊 [company] Department objectives fetched:`, {
          count: deptObjectives?.length || 0,
          deptObjectives: deptObjectives?.map(dept => ({
            company_objective_id: dept.company_objective_id,
            progress_percentage: dept.progress_percentage
          }))
        });

        if (deptError) {
          console.error('❌ [company] Error fetching department objectives for company objectives:', deptError);
          // Fallback to using progress_percentage from objectives
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
            nextDeadline,
            active: statusCounts.active,
            draft: statusCounts.draft,
            completed: statusCounts.completed
          };
        }

        // Calculate progress for each objective based on its department objectives
        const objectiveProgresses = objectiveIds.map(objectiveId => {
          const objDeptObjectives = deptObjectives?.filter(dept => dept.company_objective_id === objectiveId) || [];
          
          console.log(`📊 [company] Objective ${objectiveId} has ${objDeptObjectives.length} department objectives`);
          
          if (objDeptObjectives.length === 0) {
            // No department objectives, use progress_percentage from objective
            const obj = objectives.find(o => o.id === objectiveId);
            const fallbackProgress = obj?.progress_percentage || 0;
            console.log(`📊 [company] No department objectives, using fallback progress: ${fallbackProgress}%`);
            return fallbackProgress;
          }

          // Calculate average progress from department objectives
          const totalDeptProgress = objDeptObjectives.reduce((sum, dept) => {
            console.log(`📊 [company] Department objective progress: ${dept.progress_percentage}%`);
            return sum + (dept.progress_percentage || 0);
          }, 0);

          const objectiveProgress = totalDeptProgress / objDeptObjectives.length;
          console.log(`📊 [company] Objective ${objectiveId} progress: ${objectiveProgress}%`);
          return objectiveProgress;
        });

        // Calculate average progress across all objectives
        const avgProgress = objectiveProgresses.reduce((sum, progress) => sum + progress, 0) / totalObjectives;
        console.log(`📊 [company] Final average progress: ${avgProgress}%`);

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
          nextDeadline,
          active: statusCounts.active,
          draft: statusCounts.draft,
          completed: statusCounts.completed
        };
      }

      // For department objectives, use the original logic
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
        nextDeadline,
        active: statusCounts.active,
        draft: statusCounts.draft,
        completed: statusCounts.completed
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};