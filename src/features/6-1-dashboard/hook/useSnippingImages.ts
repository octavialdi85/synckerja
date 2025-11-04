import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { devLog } from '@/config/logger';

// Global cache to track if table exists - shared across all instances
const tableExistsCache = new Map<string, boolean>();

// Function to invalidate all sniping-images queries and set them to empty array
// This ensures ALL queries (including new ones) return empty array without network requests
const invalidateAllSnipingImagesQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  // Cancel any in-flight queries first
  queryClient.cancelQueries({ queryKey: ['sniping-images'] });
  
  // Set all related queries to empty array immediately
  queryClient.setQueriesData(
    { queryKey: ['sniping-images'], exact: false },
    () => []
  );
  
  // Set default options for all future queries with this pattern
  // This ensures new queries also get empty array without network request
  queryClient.setQueryDefaults(
    ['sniping-images'],
    {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      placeholderData: [], // All new queries will get empty array immediately
      initialData: [], // All new queries will get empty array as initial data
    }
  );
};

export interface SnipingImage {
  id: string;
  social_media_plan_id: string;
  link_url: string;
  image_path: string;
  image_name: string;
  image_type?: string;
  image_size?: number;
  link_comments_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

const useSnippingImagesQuery = (socialMediaPlanId: string, linkUrl: string) => {
  const queryClient = useQueryClient();
  const effectiveLinkUrl = linkUrl || 'default-link';
  const queryKey = useMemo(() => 
    ['sniping-images', socialMediaPlanId, effectiveLinkUrl], 
    [socialMediaPlanId, effectiveLinkUrl]
  );

  // Check cache first - if table doesn't exist, skip query entirely
  const cacheKey = 'sniping_images_table_exists';
  const tableExists = tableExistsCache.get(cacheKey);
  
  // If table doesn't exist, return immediately without query
  if (tableExists === false) {
    return useQuery({
      queryKey,
      queryFn: async () => [] as SnipingImage[], // Should never be called
      enabled: false, // Disabled - table doesn't exist
      placeholderData: [],
      initialData: [],
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    });
  }
  
  return useQuery({
    queryKey,
    queryFn: async (): Promise<SnipingImage[]> => {
      if (!socialMediaPlanId) return [];

      // Check cache again inside queryFn (in case cache was set after hook initialization)
      const currentTableExists = tableExistsCache.get(cacheKey);
      if (currentTableExists === false) {
        // Table known to not exist - return immediately without query
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('sniping_images')
          .select('*')
          .eq('social_media_plan_id', socialMediaPlanId)
          .eq('link_url', effectiveLinkUrl)
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist, cache the result globally and invalidate all related queries
          if (error.code === '42P01') {
            tableExistsCache.set(cacheKey, false);
            devLog.debug('⚠️ sniping_images table does not exist (first detection), cached globally');
            
            // Invalidate and set all related queries to empty array to prevent future requests
            invalidateAllSnipingImagesQueries(queryClient);
            
            return [];
          }
          console.error('❌ Error fetching sniping images:', error);
          throw error;
        }

        // Table exists, cache it
        if (currentTableExists !== true) {
          tableExistsCache.set(cacheKey, true);
          devLog.debug('✅ sniping_images table exists, cached');
        }
        return (data || []) as SnipingImage[];
      } catch (error: any) {
        // Handle table not found gracefully
        if (error?.code === '42P01') {
          tableExistsCache.set(cacheKey, false);
          devLog.debug('⚠️ sniping_images table does not exist (catch), cached globally');
          
          // Invalidate and set all related queries to empty array
          invalidateAllSnipingImagesQueries(queryClient);
          
          return [];
        }
        throw error;
      }
    },
    enabled: !!socialMediaPlanId && tableExists !== false, // Disable if table known to not exist
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
};

const useAddSnipingImage = (socialMediaPlanId: string, linkUrl: string) => {
  const queryClient = useQueryClient();
  const effectiveLinkUrl = linkUrl || 'default-link';
  const queryKey = ['sniping-images', socialMediaPlanId, effectiveLinkUrl];

  return useMutation({
    mutationFn: async ({
      imagePath,
      imageName,
      imageType,
      imageSize,
      linkCommentsId
    }: {
      imagePath: string;
      imageName: string;
      imageType?: string;
      imageSize?: number;
      linkCommentsId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('sniping_images')
        .insert({
          social_media_plan_id: socialMediaPlanId,
          link_url: effectiveLinkUrl,
          image_path: imagePath,
          image_name: imageName,
          image_type: imageType,
          image_size: imageSize,
          link_comments_id: linkCommentsId || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist, show warning but don't throw
        if (error.code === '42P01') {
          console.warn('⚠️ sniping_images table does not exist yet');
          toast.error('Image upload feature is not available yet. Please contact administrator.');
          throw new Error('Table does not exist');
        }
        console.error('❌ Error adding sniping image:', error);
        throw error;
      }

      return data as SnipingImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.refetchQueries({ queryKey });
    },
    onError: (error: any) => {
      console.error('❌ Error adding sniping image:', error);
      toast.error('Failed to add image');
    }
  });
};

const useDeleteSnipingImage = (socialMediaPlanId: string, linkUrl: string) => {
  const queryClient = useQueryClient();
  const effectiveLinkUrl = linkUrl || 'default-link';
  const queryKey = ['sniping-images', socialMediaPlanId, effectiveLinkUrl];

  return useMutation({
    mutationFn: async (imageId: string) => {
      // First get the image to delete the file from storage
      const { data: image, error: fetchError } = await supabase
        .from('sniping_images')
        .select('image_path')
        .eq('id', imageId)
        .single();

      if (fetchError) {
        // If table doesn't exist, just try to delete from storage
        if (fetchError.code === '42P01') {
          console.warn('⚠️ sniping_images table does not exist, skipping database deletion');
        } else {
          console.error('❌ Error fetching image for deletion:', fetchError);
          throw fetchError;
        }
      } else {
        // Delete from storage
        if (image?.image_path) {
          const { error: storageError } = await supabase.storage
            .from('sniping-images')
            .remove([image.image_path]);

          if (storageError) {
            console.error('❌ Error deleting image from storage:', storageError);
            // Continue even if storage deletion fails
          }
        }

        // Delete from database
        const { error } = await supabase
          .from('sniping_images')
          .delete()
          .eq('id', imageId);

        if (error) {
          // If table doesn't exist, that's okay
          if (error.code === '42P01') {
            console.warn('⚠️ sniping_images table does not exist');
            return;
          }
          console.error('❌ Error deleting sniping image:', error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.refetchQueries({ queryKey });
      toast.success('Image deleted successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error deleting sniping image:', error);
      toast.error('Failed to delete image');
    }
  });
};

export const useSnippingImages = (socialMediaPlanId: string, linkUrl: string) => {
  const { data: images = [], isLoading, error } = useSnippingImagesQuery(socialMediaPlanId, linkUrl);
  const addImageMutation = useAddSnipingImage(socialMediaPlanId, linkUrl);
  const deleteImageMutation = useDeleteSnipingImage(socialMediaPlanId, linkUrl);

  return useMemo(() => ({
    images,
    isLoading,
    error,
    addImage: (imagePath: string, imageName: string, imageType?: string, imageSize?: number, linkCommentsId?: string | null) => 
      addImageMutation.mutateAsync({ imagePath, imageName, imageType, imageSize, linkCommentsId }),
    deleteImage: (imageId: string) => deleteImageMutation.mutate(imageId),
    isAddingImage: addImageMutation.isPending,
    isDeletingImage: deleteImageMutation.isPending
  }), [
    images,
    isLoading,
    error,
    addImageMutation.mutateAsync,
    addImageMutation.isPending,
    deleteImageMutation.mutate,
    deleteImageMutation.isPending
  ]);
};

