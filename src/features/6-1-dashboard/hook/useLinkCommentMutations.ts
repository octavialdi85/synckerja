
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LinkComment } from './useLinkCommentsQuery';

export const useAddLinkComment = (socialMediaPlanId: string, linkUrl: string) => {
  const queryClient = useQueryClient();
  const effectiveLinkUrl = linkUrl || 'default-link';
  const queryKey = ['link-comments', socialMediaPlanId, effectiveLinkUrl];

  return useMutation({
    mutationFn: async ({
      commentText
    }: {
      commentText: string;
    }) => {
      console.log('💬 Adding comment - START:', {
        socialMediaPlanId,
        linkUrl,
        effectiveLinkUrl,
        commentTextLength: commentText?.length
      });

      if (!commentText?.trim()) {
        console.error('❌ No comment text provided');
        throw new Error('Comment text is required');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError);
        throw new Error('User not authenticated');
      }

      console.log('👤 Current user:', user.id);

      // First, let's check if the social_media_plan exists and user has access
      console.log('🔍 Checking social_media_plan access...');
      const { data: planData, error: planError } = await supabase
        .from('social_media_plans')
        .select('id, organization_id')
        .eq('id', socialMediaPlanId)
        .single();

      if (planError || !planData) {
        console.error('❌ Social media plan not found or no access:', planError);
        throw new Error('Social media plan not found or no access');
      }

      console.log('✅ Social media plan found:', planData);

      // Check user's active organization
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_organization_id, full_name')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error('❌ Profile not found:', profileError);
        throw new Error('Profile not found');
      }

      console.log('👤 User profile:', {
        activeOrgId: profileData.active_organization_id,
        planOrgId: planData.organization_id,
        match: profileData.active_organization_id === planData.organization_id
      });

      if (profileData.active_organization_id !== planData.organization_id) {
        console.error('❌ Organization mismatch');
        throw new Error('User not authorized for this organization');
      }

      const insertData = {
        social_media_plan_id: socialMediaPlanId,
        link_url: linkUrl || 'default-link',
        comment_text: commentText.trim(),
        created_by: user.id
      };

      console.log('📝 Inserting comment data:', {
        ...insertData,
        originalLinkUrl: linkUrl,
        effectiveLinkUrl
      });

      const { data, error } = await supabase
        .from('link_comments')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting comment:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Comment inserted successfully:', data.id);

      // Fetch creator info separately
      try {
        const creatorInfo = {
          full_name: profileData.full_name || 'Unknown User',
          email: user.email || ''
        };

        console.log('👤 Creator info:', creatorInfo);

        return {
          ...data,
          creator: creatorInfo
        } as LinkComment;
      } catch (err) {
        console.warn('Could not fetch creator info for new comment');
        return {
          ...data,
          creator: undefined
        } as LinkComment;
      }
    },
    onSuccess: (newComment) => {
      console.log('✅ Comment added successfully:', newComment.id);
      console.log('🔄 Invalidating queries with key:', queryKey);
      console.log('📊 New comment data:', {
        id: newComment.id,
        text: newComment.comment_text?.substring(0, 50) + '...',
        socialMediaPlanId: newComment.social_media_plan_id,
        linkUrl: newComment.link_url,
        originalLinkUrl: linkUrl,
        effectiveLinkUrl
      });
      
      // Invalidate and refetch immediately
      queryClient.invalidateQueries({
        queryKey,
        exact: true
      });
      
      // Also refetch to ensure immediate update
      queryClient.refetchQueries({
        queryKey,
        exact: true
      });
      
      console.log('🔄 Query invalidation and refetch completed');
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error adding comment:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to add comment';
      if (error.message?.includes('auth')) {
        errorMessage = 'Authentication required';
      } else if (error.message?.includes('Comment text')) {
        errorMessage = 'Comment text is required';
      } else if (error.message?.includes('organization')) {
        errorMessage = 'Organization access denied';
      } else if (error.message?.includes('row-level security')) {
        errorMessage = 'Permission denied - please check your access rights';
      }
      
      toast.error(errorMessage);
    }
  });
};

export const useUpdateLinkComment = (socialMediaPlanId: string, linkUrl: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['link-comments', socialMediaPlanId, linkUrl];

  return useMutation({
    mutationFn: async ({
      commentId,
      commentText
    }: {
      commentId: string;
      commentText: string;
    }) => {
      console.log('✏️ Updating comment:', commentId);

      const updates = {
        comment_text: commentText,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('link_comments')
        .update(updates)
        .eq('id', commentId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating comment:', error);
        throw error;
      }

      // Fetch creator info separately
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', data.created_by)
          .single();

        return {
          ...data,
          creator: profileData || undefined
        } as LinkComment;
      } catch (err) {
        return {
          ...data,
          creator: undefined
        } as LinkComment;
      }
    },
    onSuccess: () => {
      console.log('✅ Comment updated successfully');
      queryClient.invalidateQueries({
        queryKey
      });
      toast.success('Comment updated successfully');
    },
    onError: (error) => {
      console.error('❌ Error updating comment:', error);
      toast.error('Failed to update comment');
    }
  });
};

export const useDeleteLinkComment = (socialMediaPlanId: string, linkUrl: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['link-comments', socialMediaPlanId, linkUrl];

  return useMutation({
    mutationFn: async (commentId: string) => {
      console.log('🗑️ Deleting comment:', commentId);

      const { error } = await supabase
        .from('link_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('❌ Error deleting comment:', error);
        throw error;
      }

      console.log('✅ Comment deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey
      });
      toast.success('Comment deleted successfully');
    },
    onError: (error) => {
      console.error('❌ Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  });
};
