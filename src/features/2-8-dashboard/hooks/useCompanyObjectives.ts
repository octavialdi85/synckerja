import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { filterValidCycleIds } from '@/utils/uuidValidation';

export interface CompanyObjective {
  id: string;
  organization_id: string;
  cycle_id: string;
  title: string;
  why_important?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress_percentage: number;
  weight: number;
  start_date?: string;
  end_date?: string;
  owner_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateCompanyObjectiveData {
  organization_id: string;
  cycle_id: string;
  title: string;
  why_important?: string;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  weight?: number;
  start_date?: string;
  end_date?: string;
  owner_id: string;
  created_by: string;
}

export const useCompanyObjectives = (organizationId?: string, cycleIds?: string[]) => {
  const queryClient = useQueryClient();

  // Real-time subscription for company objectives
  useEffect(() => {
    if (!organizationId) return;

    console.log('🔄 Setting up real-time subscription for company objectives with org:', organizationId);

    const channel = supabase
      .channel(`company_objectives_realtime_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_objectives',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 REAL-TIME UPDATE for company objectives:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
          
          // Force immediate invalidation
          queryClient.invalidateQueries({ 
            queryKey: ['company-objectives'],
            exact: false 
          });
          
          // Also invalidate specific org queries
          queryClient.invalidateQueries({ 
            queryKey: ['company-objectives', organizationId],
            exact: false 
          });
        }
      )
      .subscribe((status) => {
        console.log('📊 Company objectives subscription status:', status);
      });

    return () => {
      console.log('🔄 Cleaning up company objectives subscription');
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ['company-objectives', organizationId, cycleIds],
    queryFn: async () => {
      if (!organizationId) {
        console.log('❌ No organizationId provided');
        return [];
      }
      
      console.log('🔍 Fetching company objectives:', { organizationId, cycleIds });
      
      let query = supabase
        .from('company_objectives')
        .select('*')
        .eq('organization_id', organizationId);

      // Filter by multiple cycle IDs if provided (only valid UUIDs)
      const validCycleIds = filterValidCycleIds(cycleIds);
      if (validCycleIds.length > 0) {
        query = query.in('cycle_id', validCycleIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching company objectives:', error);
        throw error;
      }

      console.log('✅ Company objectives fetched:', data);
      return data || [];
    },
    enabled: !!organizationId,
  });
};

export const useCreateCompanyObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveData: CreateCompanyObjectiveData) => {
      console.log('🚀 Creating company objective:', objectiveData);

      const { data, error } = await supabase
        .from('company_objectives')
        .insert(objectiveData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating company objective:', error);
        throw error;
      }

      console.log('✅ Company objective created successfully:', data);
      return data;
    },
    onSuccess: () => {
      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      toast({
        title: 'Success',
        description: 'Company objective created successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to create company objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to create company objective',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateCompanyObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CompanyObjective> }) => {
      console.log('🔄 Updating company objective:', { id, updates });

      const { data, error } = await supabase
        .from('company_objectives')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating company objective:', error);
        throw error;
      }

      console.log('✅ Company objective updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      toast({
        title: 'Success',
        description: 'Company objective updated successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to update company objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company objective',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteCompanyObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      console.log('🗑️ Deleting company objective:', objectiveId);

      const { error } = await supabase
        .from('company_objectives')
        .delete()
        .eq('id', objectiveId);

      if (error) {
        console.error('❌ Error deleting company objective:', error);
        throw error;
      }

      console.log('✅ Company objective deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      toast({
        title: 'Success',
        description: 'Company objective deleted successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to delete company objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete company objective',
        variant: 'destructive',
      });
    },
  });
};
