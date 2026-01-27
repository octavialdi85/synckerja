import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';

interface KOLOperationsData {
  id: string;
  kol_id: string;
  operation_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useOptimizedKOLOperations = () => {
  const { currentOrg } = useCurrentOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // DISABLED: Table kol_operations does not exist - return empty data without querying
  const { data: operations, isLoading, error } = useQuery({
    queryKey: ['kol-operations', currentOrg?.id],
    queryFn: async () => {
      // Return empty array immediately - table does not exist
      return [];
    },
    enabled: false, // Disabled - table does not exist
    retry: false,
    staleTime: Infinity, // Never refetch
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // DISABLED: Mutations disabled - table kol_operations does not exist
  const createOperation = useMutation({
    mutationFn: async (operationData: Partial<KOLOperationsData>) => {
      // Table does not exist - return mock data
      return null as any;
    },
    onSuccess: () => {
      // No-op - table does not exist
    },
    onError: () => {
      // No-op - table does not exist
    },
  });

  const updateOperation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<KOLOperationsData> & { id: string }) => {
      // Table does not exist - return mock data
      return null as any;
    },
    onSuccess: () => {
      // No-op - table does not exist
    },
    onError: () => {
      // No-op - table does not exist
    },
  });

  const deleteOperation = useMutation({
    mutationFn: async (id: string) => {
      // Table does not exist - no-op
    },
    onSuccess: () => {
      // No-op - table does not exist
    },
    onError: () => {
      // No-op - table does not exist
    },
  });

  return {
    operations,
    isLoading,
    error,
    createOperation,
    updateOperation,
    deleteOperation,
  };
};
