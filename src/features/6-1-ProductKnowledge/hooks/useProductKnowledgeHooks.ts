import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useUserData } from '@/features/6-1-dashboard/hook/useUserData';

export interface ProductKnowledgeHook {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  hook_content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductKnowledgeHookInput {
  name: string;
  description?: string;
  hook_content?: string;
}

export interface UpdateProductKnowledgeHookInput {
  name?: string;
  description?: string;
  hook_content?: string;
}

export const useProductKnowledgeHooks = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['product-knowledge-hooks', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('product_knowledge_hooks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching product knowledge hooks:', error);
        throw error;
      }

      return (data || []) as unknown as ProductKnowledgeHook[];
    },
    enabled: !!organizationId,
  });
};

export const useProductKnowledgeHooksMutations = () => {
  const { organizationId } = useCurrentOrg();
  const { profile } = useUserData();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateProductKnowledgeHookInput) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Get the auth user ID for created_by
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || profile?.user_id || null;

      const { data: result, error } = await supabase
        .from('product_knowledge_hooks')
        .insert({
          organization_id: organizationId,
          name: data.name,
          description: data.description || null,
          hook_content: data.hook_content || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating product knowledge hook:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-knowledge-hooks', organizationId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateProductKnowledgeHookInput;
    }) => {
      const { data: result, error } = await supabase
        .from('product_knowledge_hooks')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product knowledge hook:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-knowledge-hooks', organizationId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_knowledge_hooks').delete().eq('id', id);

      if (error) {
        console.error('Error deleting product knowledge hook:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-knowledge-hooks', organizationId] });
    },
  });

  return {
    createProductKnowledgeHook: createMutation.mutateAsync,
    updateProductKnowledgeHook: updateMutation.mutateAsync,
    deleteProductKnowledgeHook: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

