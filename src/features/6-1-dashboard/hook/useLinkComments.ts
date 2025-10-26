
import { useMemo } from 'react';
import { useLinkCommentsQuery } from './useLinkCommentsQuery';
import { useAddLinkComment, useUpdateLinkComment, useDeleteLinkComment } from './useLinkCommentMutations';

export { type LinkComment } from './useLinkCommentsQuery';

export const useLinkComments = (socialMediaPlanId: string, linkUrl: string) => {
  const {
    data: comments = [],
    isLoading,
    error
  } = useLinkCommentsQuery(socialMediaPlanId, linkUrl);

  const addCommentMutation = useAddLinkComment(socialMediaPlanId, linkUrl);
  const updateCommentMutation = useUpdateLinkComment(socialMediaPlanId, linkUrl);
  const deleteCommentMutation = useDeleteLinkComment(socialMediaPlanId, linkUrl);

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    comments,
    isLoading,
    error,
    addComment: addCommentMutation.mutateAsync,
    updateComment: updateCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    isAddingComment: addCommentMutation.isPending,
    isUpdatingComment: updateCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending
  }), [
    comments,
    isLoading,
    error,
    addCommentMutation.mutateAsync,
    addCommentMutation.isPending,
    updateCommentMutation.mutate,
    updateCommentMutation.isPending,
    deleteCommentMutation.mutate,
    deleteCommentMutation.isPending
  ]);
};
