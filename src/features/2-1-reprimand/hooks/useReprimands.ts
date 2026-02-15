import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { toast } from 'sonner';

export interface ReprimandData {
  id: string;
  employee_id: string;
  reprimand_type: 'verbal_warning' | 'written_warning' | 'final_warning' | 'suspension' | 'termination';
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  violation_category: 'attendance' | 'performance' | 'conduct' | 'safety' | 'policy_violation' | 'insubordination' | 'other';
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  violation_description: string;
  evidence_details?: string;
  witness_names?: string;
  previous_warnings_count: number;
  corrective_action_plan?: string;
  improvement_deadline?: string;
  follow_up_date?: string;
  acknowledgment_required: boolean;
  is_formal: boolean;
  impact_on_performance_review: boolean;
  notes?: string;
  document_path?: string;
  status: 'active' | 'resolved' | 'appealed' | 'cancelled';
  created_at: string;
  updated_at: string;
  employees?: {
    id: string;
    full_name: string;
    email: string;
    employee_id: string;
    department_name?: string;
    job_position_name?: string;
    profile_photo_url?: string;
    photo_url?: string;
  };
}

export interface CreateReprimandData {
  employee_id: string;
  reprimand_type: 'verbal_warning' | 'written_warning' | 'final_warning' | 'suspension' | 'termination';
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  violation_category: 'attendance' | 'performance' | 'conduct' | 'safety' | 'policy_violation' | 'insubordination' | 'other';
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  violation_description: string;
  evidence_details?: string;
  witness_names?: string;
  previous_warnings_count?: number;
  corrective_action_plan?: string;
  improvement_deadline?: string;
  follow_up_date?: string;
  acknowledgment_required?: boolean;
  is_formal?: boolean;
  impact_on_performance_review?: boolean;
  notes?: string;
  document_path?: string;
}

export const useReprimands = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const { data: reprimands = [], isLoading, error } = useQuery({
    queryKey: ['reprimands', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('🔍 Fetching reprimands for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('reprimands')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching reprimands:', error);
        throw error;
      }
      
      console.log('✅ Reprimands fetched:', data?.length || 0);
      return data as ReprimandData[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const createReprimand = useMutation({
    mutationFn: async (reprimandData: CreateReprimandData) => {
      if (!organizationId) {
        throw new Error('No organization ID found');
      }

      console.log('📝 Creating reprimand:', reprimandData);
      
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data, error } = await supabase
        .from('reprimands')
        .insert([{
          ...reprimandData,
          organization_id: organizationId,
          created_by: userId,
          issued_by: userId,
          status: 'active',
          previous_warnings_count: reprimandData.previous_warnings_count || 0,
          acknowledgment_required: reprimandData.acknowledgment_required ?? true,
          is_formal: reprimandData.is_formal ?? true,
          impact_on_performance_review: reprimandData.impact_on_performance_review ?? true,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating reprimand:', error);
        throw error;
      }

      console.log('✅ Reprimand created:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reprimands', organizationId] });
      toast.success('Reprimand created successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error creating reprimand:', error);
      toast.error('Failed to create reprimand');
    },
  });

  const updateReprimand = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<ReprimandData> & { id: string }) => {
      console.log('📝 Updating reprimand:', id, updateData);
      
      const { data, error } = await supabase
        .from('reprimands')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating reprimand:', error);
        throw error;
      }

      console.log('✅ Reprimand updated:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reprimands', organizationId] });
      toast.success('Reprimand updated successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error updating reprimand:', error);
      toast.error('Failed to update reprimand');
    },
  });

  const deleteReprimand = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Deleting reprimand:', id);
      
      const { error } = await supabase
        .from('reprimands')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting reprimand:', error);
        throw error;
      }

      console.log('✅ Reprimand deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reprimands', organizationId] });
      toast.success('Reprimand deleted successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error deleting reprimand:', error);
      toast.error('Failed to delete reprimand');
    },
  });

  return {
    reprimands,
    isLoading,
    error,
    createReprimand,
    updateReprimand,
    deleteReprimand,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['reprimands', organizationId] }),
  };
};

export const useCreateReprimand = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reprimandData: CreateReprimandData) => {
      if (!organizationId) {
        throw new Error('No organization ID found');
      }

      console.log('📝 Creating reprimand:', reprimandData);
      
      // Filter out empty string values for optional date fields
      const cleanedData = { ...reprimandData };
      
      // Remove empty string values for optional date fields
      if (cleanedData.improvement_deadline === '') {
        delete cleanedData.improvement_deadline;
      }
      if (cleanedData.follow_up_date === '') {
        delete cleanedData.follow_up_date;
      }
      if (cleanedData.incident_time === '') {
        delete cleanedData.incident_time;
      }
      if (cleanedData.incident_location === '') {
        delete cleanedData.incident_location;
      }
      if (cleanedData.evidence_details === '') {
        delete cleanedData.evidence_details;
      }
      if (cleanedData.witness_names === '') {
        delete cleanedData.witness_names;
      }
      if (cleanedData.corrective_action_plan === '') {
        delete cleanedData.corrective_action_plan;
      }
      if (cleanedData.notes === '') {
        delete cleanedData.notes;
      }
      if (cleanedData.document_path === '') {
        delete cleanedData.document_path;
      }
      
      const { data, error } = await supabase
        .from('reprimands')
        .insert([{
          ...cleanedData,
          organization_id: organizationId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          issued_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'active',
          previous_warnings_count: cleanedData.previous_warnings_count || 0,
          acknowledgment_required: cleanedData.acknowledgment_required ?? true,
          is_formal: cleanedData.is_formal ?? true,
          impact_on_performance_review: cleanedData.impact_on_performance_review ?? true,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating reprimand:', error);
        throw error;
      }

      console.log('✅ Reprimand created:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reprimands', organizationId] });
      toast.success('Reprimand created successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error creating reprimand:', error);
      toast.error('Failed to create reprimand');
    },
  });
};
