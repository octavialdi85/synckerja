import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';

export interface DepartmentObjective {
  id: string;
  organization_id: string;
  cycle_id: string;
  company_objective_id: string;
  department_id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress_percentage: number;
  weight: number;
  start_date?: string;
  end_date?: string;
  owner_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  departments?: { name: string };
  company_objectives?: { title: string };
  okr_cycles?: { name: string; year: number; quarter?: string };
}

interface CreateDepartmentObjectiveData {
  organization_id: string;
  cycle_id: string;
  company_objective_id: string;
  department_id: string;
  title: string;
  description?: string;
  why_important?: string;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  weight?: number;
  start_date?: string;
  end_date?: string;
  owner_id: string;
  created_by: string;
}

interface CreateDepartmentObjectiveWithKeyResults extends CreateDepartmentObjectiveData {
  key_results?: Array<{
    title: string;
    description?: string;
    metric_type: 'number' | 'percentage' | 'currency' | 'boolean';
    calculation_type: 'increase' | 'decrease' | 'maintain';
    start_value: number;
    target_value: number;
    unit: string;
    weight: number;
  }>;
}

export const useDepartmentObjectives = (organizationId?: string, cycleIds?: string[]) => {
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
      if (!organizationId) {
        console.log('❌ No organizationId provided');
        return [];
      }
      
      console.log('🔍 Fetching department objectives:', { organizationId, cycleIds });
      
      let query = supabase
        .from('department_objectives')
        .select(`
          *,
          departments!inner(name),
          company_objectives!inner(title),
          okr_cycles!inner(name, year, quarter)
        `)
        .eq('organization_id', organizationId);

      // Filter by multiple cycle IDs if provided
      if (cycleIds && cycleIds.length > 0) {
        query = query.in('cycle_id', cycleIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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

export const useCreateDepartmentObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveData: CreateDepartmentObjectiveWithKeyResults) => {
      console.log('🚀 Creating department objective:', objectiveData);

      // Extract key_results from objective data
      const { key_results, ...departmentObjectiveData } = objectiveData;

      // First, create the department objective
      const { data: departmentObjective, error: objectiveError } = await supabase
        .from('department_objectives')
        .insert(departmentObjectiveData)
        .select()
        .single();

      if (objectiveError) {
        console.error('❌ Error creating department objective:', objectiveError);
        throw objectiveError;
      }

      console.log('✅ Department objective created successfully:', departmentObjective);

      // Automatically create a key result in the parent company objective
      console.log('🔑 Creating key result in company objective for department objective:', departmentObjective.id);
      
      const companyKeyResultData = {
        organization_id: departmentObjectiveData.organization_id,
        company_objective_id: departmentObjectiveData.company_objective_id,
        department_objective_id: departmentObjective.id,
        title: departmentObjective.title,
        description: '', // Keep description empty to prevent auto-generation issue
        metric_type: 'percentage' as const,
        calculation_type: 'increase' as const,
        start_value: 0,
        target_value: 100,
        current_value: departmentObjective.progress_percentage || 0,
        unit: '%',
        weight: departmentObjective.weight || 100,
        progress_percentage: departmentObjective.progress_percentage || 0,
        is_inverse: false,
        owner_level: 'department' as const,
        created_by: departmentObjectiveData.created_by,
        department_id: departmentObjectiveData.department_id,
      };

      const { data: companyKeyResult, error: companyKRError } = await supabase
        .from('key_results')
        .insert(companyKeyResultData)
        .select()
        .single();

      if (companyKRError) {
        console.error('❌ Error creating key result in company objective:', companyKRError);
      } else {
        console.log('✅ Key result created in company objective:', companyKeyResult);
      }

      // If key_results are provided, create them separately for the department objective
      if (key_results && key_results.length > 0) {
        console.log('🔑 Creating key results for department objective:', departmentObjective.id);
        
        const keyResultsData = key_results.map(kr => ({
          organization_id: departmentObjectiveData.organization_id,
          department_objective_id: departmentObjective.id,
          title: kr.title,
          description: kr.description || '',
          metric_type: kr.metric_type,
          calculation_type: kr.calculation_type,
          start_value: kr.start_value,
          target_value: kr.target_value,
          current_value: kr.start_value,
          unit: kr.unit,
          weight: kr.weight,
          progress_percentage: 0,
          is_inverse: false,
          owner_level: 'department' as const,
          created_by: departmentObjectiveData.created_by,
          department_id: departmentObjectiveData.department_id,
        }));

        const { data: keyResults, error: keyResultsError } = await supabase
          .from('key_results')
          .insert(keyResultsData)
          .select();

        if (keyResultsError) {
          console.error('❌ Error creating key results:', keyResultsError);
          // Don't throw here, just log the error as the main objective was created
          console.warn('Department objective created but key results failed');
        } else {
          console.log('✅ Key results created successfully:', keyResults);
        }
      }

      return departmentObjective;
    },
    onSuccess: () => {
      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['company-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['individual-objectives'] });
      toast({
        title: 'Success',
        description: 'Department objective created successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to create department objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to create department objective',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateDepartmentObjective = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DepartmentObjective> }) => {
      console.log('🔄 Updating department objective:', { id, updates });

      const { data, error } = await supabase
        .from('department_objectives')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating department objective:', error);
        throw error;
      }

      console.log('✅ Department objective updated successfully:', data);

      // If progress_percentage was updated, sync it to the corresponding key result
      if (updates.progress_percentage !== undefined) {
        console.log('🔄 Syncing progress to company objective key result');
        
        const { data: keyResult, error: keyResultError } = await supabase
          .from('key_results')
          .update({
            current_value: updates.progress_percentage,
            progress_percentage: updates.progress_percentage,
            updated_at: new Date().toISOString()
          })
          .eq('department_objective_id', id)
          .select()
          .single();

        if (keyResultError) {
          console.error('❌ Error syncing progress to key result:', keyResultError);
        } else {
          console.log('✅ Progress synced to key result:', keyResult);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-objectives'] });
      toast({
        title: 'Success',
        description: 'Department objective updated successfully',
      });
    },
    onError: (error) => {
      console.error('❌ Failed to update department objective:', error);
      toast({
        title: 'Error',
        description: 'Failed to update department objective',
        variant: 'destructive',
      });
    },
  });
};