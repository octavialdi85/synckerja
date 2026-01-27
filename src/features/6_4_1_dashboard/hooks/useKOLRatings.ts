import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';

interface KOLRating {
  id: string;
  kol_id: string;
  rating: number;
  comment?: string;
  rated_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateRatingData {
  kol_id: string;
  rating: number;
  comment?: string;
}

export const useKOLRatings = () => {
  const { currentOrg } = useCurrentOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // DISABLED: Table kol_ratings does not exist - return empty data without querying
  const { data: ratings, isLoading, error } = useQuery({
    queryKey: ['kol-ratings', currentOrg?.id],
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

  // Get ratings for specific KOL
  const getKOLRatings = (kolId: string) => {
    return ratings?.filter(rating => rating.kol_id === kolId) || [];
  };

  // Calculate average rating for KOL
  const getAverageRating = (kolId: string) => {
    const kolRatings = getKOLRatings(kolId);
    if (kolRatings.length === 0) return 0;
    
    const sum = kolRatings.reduce((acc, rating) => acc + rating.rating, 0);
    return sum / kolRatings.length;
  };

  // DISABLED: Mutations disabled - table kol_ratings does not exist
  const addRating = useMutation({
    mutationFn: async (ratingData: CreateRatingData) => {
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

  const updateRating = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<KOLRating> & { id: string }) => {
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

  const deleteRating = useMutation({
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
    ratings,
    isLoading,
    error,
    getKOLRatings,
    getAverageRating,
    addRating,
    updateRating,
    deleteRating,
  };
};
