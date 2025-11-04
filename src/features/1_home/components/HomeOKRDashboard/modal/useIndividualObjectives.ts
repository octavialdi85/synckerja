import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';

export interface IndividualObjective {
  id: string;
  organization_id: string;
  cycle_id: string;
  department_objective_id?: string;
  employee_id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress_percentage: number;
  weight: number;
  start_date?: string;
  end_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  employees?: { full_name: string; email: string };
  department_objectives?: { title: string; description: string };
  okr_cycles?: { name: string; year: number; quarter?: string };
}

interface CreateIndividualObjectiveData {
  organization_id: string;
  cycle_id: string;
  department_objective_id?: string;
  employee_id: string;
  owner_id: string;
  title: string;
  description?: string;
  why_important?: string;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  weight?: number;
  start_date?: string;
  end_date?: string;
  created_by: string;
}

export const useIndividualObjectives = (organizationId?: string, cycleIds?: string[]) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Real-time subscription for individual objectives
  useEffect(() => {
    if (!organizationId) return;

    // Prevent duplicate subscriptions
    if (subscriptionRef.current) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Setting up real-time subscription for individual objectives with org:', organizationId);
    }

    subscriptionRef.current = supabase
      .channel(`individual_objectives_realtime_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'individual_objectives',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('📡 REAL-TIME UPDATE for individual objectives:', {
              event: payload.eventType,
              table: payload.table,
              new: payload.new,
              old: payload.old
            });
          }
          
          // Force immediate invalidation
          queryClient.invalidateQueries({ 
            queryKey: ['individual-objectives'],
            exact: false 
          });
          
          // Also invalidate specific org queries
          queryClient.invalidateQueries({ 
            queryKey: ['individual-objectives', organizationId],
            exact: false 
          });
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Individual objectives subscription status:', status);
        }
      });

    return () => {
      if (subscriptionRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Cleaning up individual objectives subscription');
        }
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ['individual-objectives', organizationId, cycleIds],
    queryFn: async () => {
      if (!organizationId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ No organizationId provided');
        }
        return [];
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Fetching individual objectives:', { organizationId, cycleIds });
      }
      
      // OPTIMIZATION: Simplified query to prevent timeout
      // Only select essential fields, reduced joins depth
      let query = supabase
        .from('individual_objectives')
        .select(`
          id,
          title,
          description,
          status,
          progress_percentage,
          weight,
          start_date,
          end_date,
          cycle_id,
          department_objective_id,
          employee_id,
          organization_id,
          created_at,
          updated_at,
          employees!inner(full_name),
          okr_cycles!inner(name, year, quarter)
        `)
        .eq('organization_id', organizationId)
        .limit(50); // Limit results to prevent timeout

      // Filter by multiple cycle IDs if provided
      if (cycleIds && cycleIds.length > 0) {
        query = query.in('cycle_id', cycleIds);
      }

      // TIMEOUT PROTECTION: Add timeout to prevent hanging
      const queryPromise = query.order('created_at', { ascending: false });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Individual objectives query timeout')), 8000)
      );

      let data: any;
      let error: any;
      
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        data = result.data;
        error = result.error;
      } catch (timeoutError: any) {
        console.warn('⚠️ Individual objectives query timed out, using empty array');
        return []; // Graceful degradation - return empty array
      }

      if (error) {
        console.error('❌ Error fetching individual objectives:', error);
        // Graceful degradation - return empty array instead of throwing
        return [];
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Individual objectives fetched:', data);
      }
      return data || [];
    },
    enabled: !!organizationId,
  });
};

export const useCreateIndividualObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveData: CreateIndividualObjectiveData) => {
      console.log('🚀 Creating individual objective:', objectiveData);

      const { data, error } = await supabase
        .from('individual_objectives')
        .insert(objectiveData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating individual objective:', error);
        throw error;
      }

      console.log('✅ Individual objective created successfully:', data);
      return data;
    },
    onSuccess: () => {
      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-hierarchy'] });
      // Invalidate objective stats queries for all types
      queryClient.invalidateQueries({ queryKey: ['objective-stats'] });
      toast({
        title: 'Success',
        description: 'Individual objective created successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to create individual objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to create individual objective',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateIndividualObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IndividualObjective> }) => {
      console.log('🔄 Updating individual objective:', { id, updates });

      const { data, error } = await supabase
        .from('individual_objectives')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating individual objective:', error);
        throw error;
      }

      console.log('✅ Individual objective updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-hierarchy'] });
      // Invalidate objective stats queries for all types
      queryClient.invalidateQueries({ queryKey: ['objective-stats'] });
      toast({
        title: 'Success',
        description: 'Individual objective updated successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to update individual objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to update individual objective',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteIndividualObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      console.log('🗑️ Deleting individual objective:', objectiveId);

      try {
        // First, delete related weekly check-ins via key results
        const { data: keyResults } = await supabase
          .from('key_results')
          .select('id')
          .eq('individual_objective_id', objectiveId);

        if (keyResults && keyResults.length > 0) {
          const keyResultIds = keyResults.map(kr => kr.id);
          
          // Delete weekly check-ins for these key results (correct table name: weekly_checkins)
          const { error: checkinError } = await supabase
            .from('weekly_checkins')
            .delete()
            .in('key_result_id', keyResultIds);

          if (checkinError) {
            console.warn('⚠️ Warning deleting weekly check-ins:', checkinError);
          } else {
            console.log('✅ Deleted weekly check-ins for key results');
          }

          // Delete activities for these key results (check if column exists)
          const { error: activityError } = await supabase
            .from('activities')
            .delete()
            .in('key_result_id', keyResultIds);

          if (activityError) {
            console.warn('⚠️ Warning deleting activities by key_result_id:', activityError);
            // Try alternative column names
            const { error: altActivityError } = await supabase
              .from('activities')
              .delete()
              .in('objective_id', keyResultIds);

            if (altActivityError) {
              console.warn('⚠️ Alternative activity deletion also failed:', altActivityError);
            } else {
              console.log('✅ Deleted activities using alternative column');
            }
          } else {
            console.log('✅ Deleted activities for key results');
          }

          // Delete the key results themselves
          const { error: keyResultError } = await supabase
            .from('key_results')
            .delete()
            .eq('individual_objective_id', objectiveId);

          if (keyResultError) {
            console.error('❌ Error deleting key results:', keyResultError);
            throw keyResultError;
          } else {
            console.log('✅ Deleted key results for individual objective');
          }
        }

        // Delete activities directly linked to the objective
        const { error: directActivityError } = await supabase
          .from('activities')
          .delete()
          .eq('individual_objective_id', objectiveId);

        if (directActivityError) {
          console.warn('⚠️ Warning deleting direct activities:', directActivityError);
          // Try alternative column names
          const { error: altDirectActivityError } = await supabase
            .from('activities')
            .delete()
            .eq('objective_id', objectiveId);

          if (altDirectActivityError) {
            console.warn('⚠️ Alternative direct activity deletion also failed:', altDirectActivityError);
          } else {
            console.log('✅ Deleted direct activities using alternative column');
          }
        } else {
          console.log('✅ Deleted direct activities for individual objective');
        }

        // Finally, delete the individual objective itself
        const { error } = await supabase
          .from('individual_objectives')
          .delete()
          .eq('id', objectiveId);

        if (error) {
          console.error('❌ Error deleting individual objective:', error);
          throw error;
        }

        console.log('✅ Individual objective deleted successfully');
      } catch (error) {
        console.error('❌ Error in delete process:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-hierarchy'] });
      // Invalidate objective stats queries for all types
      queryClient.invalidateQueries({ queryKey: ['objective-stats'] });
      toast({
        title: 'Success',
        description: 'Individual objective deleted successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to delete individual objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete individual objective',
        variant: 'destructive',
      });
    },
  });
};