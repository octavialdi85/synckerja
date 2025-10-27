import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';

export const useDepartmentObjectivesList = (organizationId: string, cycleIds?: string[]) => {
  const queryClient = useQueryClient();

  // Real-time subscription for department objectives
  useEffect(() => {
    if (!organizationId) return;

    console.log('🔄 Setting up real-time subscription for department objectives with org:', organizationId);

    const channel = supabase
      .channel(`department_objectives_realtime_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'department_objectives',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 REAL-TIME UPDATE for department objectives:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
          
          // Force immediate invalidation
          queryClient.invalidateQueries({ 
            queryKey: ['department-objectives'],
            exact: false 
          });
          
          // Also invalidate specific org queries
          queryClient.invalidateQueries({ 
            queryKey: ['department-objectives', organizationId],
            exact: false 
          });
        }
      )
      .subscribe((status) => {
        console.log('📊 Department objectives subscription status:', status);
      });

    return () => {
      console.log('🔄 Cleaning up department objectives subscription');
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ['department-objectives', organizationId, cycleIds],
    queryFn: async () => {
      console.log('🔍 Fetching department objectives:', { organizationId, cycleIds });

      let query = supabase
        .from('department_objectives')
        .select(`
          *,
          departments!inner(name),
          company_objectives!inner(title),
          okr_cycles!inner(name, year, quarter),
          individual_objectives(
            id,
            title,
            description,
            progress_percentage,
            status,
            employees!inner(full_name)
          )
        `)
        .eq('organization_id', organizationId);

      // Filter by cycle IDs if provided
      if (cycleIds && cycleIds.length > 0) {
        query = query.in('cycle_id', cycleIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching department objectives:', error);
        throw error;
      }

      console.log('✅ Department objectives fetched:', data);
      return data || [];
    },
    enabled: !!organizationId,
  });
};

export const useDeleteDepartmentObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      console.log('🗑️ Deleting department objective:', objectiveId);

      try {
        // First, delete related weekly check-ins via key results
        const { data: keyResults } = await supabase
          .from('key_results')
          .select('id')
          .eq('department_objective_id', objectiveId);

        if (keyResults && keyResults.length > 0) {
          const keyResultIds = keyResults.map(kr => kr.id);
          console.log('🗑️ Deleting weekly check-ins for key results:', keyResultIds);
          
          const { error: checkinError } = await supabase
            .from('weekly_checkins')
            .delete()
            .in('key_result_id', keyResultIds);

          if (checkinError) {
            console.error('❌ Error deleting weekly check-ins:', checkinError);
            throw checkinError;
          }
        }

        // Second, delete related key results
        console.log('🗑️ Deleting key results for department objective');
        const { error: keyResultError } = await supabase
          .from('key_results')
          .delete()
          .eq('department_objective_id', objectiveId);

        if (keyResultError) {
          console.error('❌ Error deleting key results:', keyResultError);
          throw keyResultError;
        }

        // Third, delete related individual objectives
        console.log('🗑️ Deleting individual objectives for department objective');
        const { error: individualError } = await supabase
          .from('individual_objectives')
          .delete()
          .eq('department_objective_id', objectiveId);

        if (individualError) {
          console.error('❌ Error deleting individual objectives:', individualError);
          throw individualError;
        }

        // Finally, delete the department objective itself
        console.log('🗑️ Deleting department objective');
        const { error } = await supabase
          .from('department_objectives')
          .delete()
          .eq('id', objectiveId);

        if (error) {
          console.error('❌ Error deleting department objective:', error);
          throw error;
        }

        console.log('✅ Department objective and all related data deleted successfully');
      } catch (error) {
        console.error('❌ Error in cascade delete:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      toast({
        title: 'Success',
        description: 'Department objective deleted successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to delete department objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete department objective',
        variant: 'destructive',
      });
    },
  });
};