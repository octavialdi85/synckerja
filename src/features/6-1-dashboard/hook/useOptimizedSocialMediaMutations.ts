import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { ContentPlan } from '../types/social-media';
import { toast } from 'sonner';
import { devLog } from '@/config/logger';

export const useOptimizedSocialMediaMutations = () => {
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();

  // Update content plan mutation
  const updateContentPlanMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContentPlan> }) => {
      // Validate pic_production_id if it's being updated
      if (updates.pic_production_id !== undefined && updates.pic_production_id !== null) {
        // Verify that the employee exists before updating
        const { data: employeeExists, error: checkError } = await supabase
          .from('employees')
          .select('id')
          .eq('id', updates.pic_production_id)
          .maybeSingle();
        
        if (checkError || !employeeExists) {
          const errorMsg = `Invalid employee ID: ${updates.pic_production_id}. Employee not found in database.`;
          devLog.error('❌ Foreign key constraint validation failed:', {
            pic_production_id: updates.pic_production_id,
            error: checkError
          });
          throw new Error(errorMsg);
        }
      }

      const { data, error } = await (supabase as any)
        .from('social_media_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Handle foreign key constraint violations specifically
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          const fieldName = error.message?.includes('pic_production_id') ? 'PIC Production' : 'related field';
          devLog.error('❌ Foreign key constraint violation:', {
            code: error.code,
            message: error.message,
            updates
          });
          throw new Error(`Invalid ${fieldName} ID. Please select a valid employee.`);
        }
        throw error;
      }
      return data;
    },
      onSuccess: (updatedData) => {
        // Google Sheets style - update cache directly without refetch
        if (organizationId && updatedData) {
          // Optimistic update - update cache directly with new data
          queryClient.setQueryData(
            ['social-media-plans', organizationId],
            (oldData: any) => {
              if (!oldData) return oldData;
              return oldData.map((plan: any) => 
                plan.id === updatedData.id ? updatedData : plan
              );
            }
          );
          
          devLog.debug('✅ Data updated in cache without reload');
        }
      },
      onError: (error: any) => {
        // Show user-friendly error message
        const errorMessage = error?.message || 'Failed to update content plan';
        toast.error(errorMessage);
        devLog.error('❌ Error updating content plan:', error);
      },
  });

  // Add content plan mutation
  const addContentPlanMutation = useMutation({
    mutationFn: async (newPlan: Partial<ContentPlan>) => {
      // Ensure organization_id is set, but don't duplicate if already present
      const planData = {
        ...newPlan,
        organization_id: newPlan.organization_id || organizationId,
        // Ensure required fields have proper defaults
        revision_count: newPlan.revision_count || 0,
        production_revision_count: newPlan.production_revision_count || 0,
        approved: newPlan.approved || false,
        production_approved: newPlan.production_approved || false,
        done: newPlan.done || false,
        status: newPlan.status || '',
        production_status: newPlan.production_status || '',
        on_time_status: newPlan.on_time_status || '',
        status_content: newPlan.status_content || ''
      };
      
      // Remove any undefined values that might cause issues
      const cleanPlanData = Object.fromEntries(
        Object.entries(planData).filter(([_, value]) => value !== undefined)
      );
      
      console.log('Inserting content plan with data:', cleanPlanData);
      
      const { data, error } = await (supabase as any)
        .from('social_media_plans')
        .insert(cleanPlanData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting content plan:', error);
        console.error('Plan data:', cleanPlanData);
        console.error('Organization ID:', organizationId);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      return data;
    },
    onSuccess: (newData) => {
      // Google Sheets style - add to cache directly without refetch
      if (organizationId) {
        // Optimistic update - add new data to cache
        queryClient.setQueryData(
          ['social-media-plans', organizationId],
          (oldData: any) => {
            if (!oldData) return [newData];
            // Add new plan at the beginning of the array
            return [newData, ...oldData];
          }
        );
        
        console.log('✅ New data added to cache without reload');
      }
    },
  });

  // Delete content plan mutation
  const deleteContentPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('social_media_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      // Google Sheets style - remove from cache directly without refetch
      if (organizationId) {
        // Optimistic update - remove deleted item from cache
        queryClient.setQueryData(
          ['social-media-plans', organizationId],
          (oldData: any) => {
            if (!oldData) return oldData;
            // Filter out the deleted plan
            return oldData.filter((plan: any) => plan.id !== deletedId);
          }
        );
        
        console.log('✅ Data removed from cache without reload');
      }
    },
  });

  return {
    updateContentPlan: (id: string, updates: Partial<ContentPlan>) => 
      updateContentPlanMutation.mutate({ id, updates }),
    addContentPlan: (newPlan: Partial<ContentPlan>) => 
      addContentPlanMutation.mutate(newPlan),
    deleteContentPlan: (id: string) => 
      deleteContentPlanMutation.mutate(id),
    
    // Loading states
    isUpdating: updateContentPlanMutation.isPending,
    isAdding: addContentPlanMutation.isPending,
    isDeleting: deleteContentPlanMutation.isPending,
  };
};