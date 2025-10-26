import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

  // Real-time subscription for individual objectives
  useEffect(() => {
    if (!organizationId) return;

    console.log('🔄 Setting up real-time subscription for individual objectives with org:', organizationId);

    const channel = supabase
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
          console.log('📡 REAL-TIME UPDATE for individual objectives:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
          
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
        console.log('📊 Individual objectives subscription status:', status);
      });

    return () => {
      console.log('🔄 Cleaning up individual objectives subscription');
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ['individual-objectives', organizationId, cycleIds],
    queryFn: async () => {
      if (!organizationId) {
        console.log('❌ No organizationId provided');
        return [];
      }
      
      console.log('🔍 Fetching individual objectives:', { organizationId, cycleIds });
      
      let query = supabase
        .from('individual_objectives')
        .select(`
          *,
          employees!inner(full_name, email),
          department_objectives(title, description),
          okr_cycles!inner(name, year, quarter)
        `)
        .eq('organization_id', organizationId);

      // Filter by multiple cycle IDs if provided
      if (cycleIds && cycleIds.length > 0) {
        query = query.in('cycle_id', cycleIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching individual objectives:', error);
        throw error;
      }

      console.log('✅ Individual objectives fetched:', data);
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
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
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

      const { error } = await supabase
        .from('individual_objectives')
        .delete()
        .eq('id', objectiveId);

      if (error) {
        console.error('❌ Error deleting individual objective:', error);
        throw error;
      }

      console.log('✅ Individual objective deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
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