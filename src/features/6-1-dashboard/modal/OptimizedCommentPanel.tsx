import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { ScrollArea } from '@/features/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/features/ui/avatar';
import { Badge } from '@/features/ui/badge';
import { Trash2, Edit, Save, X, MessageSquare, Loader2, Image as ImageIcon, Camera } from 'lucide-react';
import { useLinkComments } from '../hook/useLinkComments';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
interface OptimizedCommentPanelProps {
  socialMediaPlanId: string;
  linkUrl: string;
}
const CommentItem = React.memo<{
  comment: LinkComment;
  editingCommentId: string | null;
  editingText: string;
  isUpdatingComment: boolean;
  isDeletingComment: boolean;
  onEditComment: (comment: LinkComment) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteComment: (commentId: string) => void;
  onEditingTextChange: (text: string) => void;
  onImageClick: (imageUrl: string, imageName: string, createdAt: string) => void;
  socialMediaPlanId: string;
  linkUrl: string;
}>(({
  comment,
  editingCommentId,
  editingText,
  isUpdatingComment,
  isDeletingComment,
  onEditComment,
  onSaveEdit,
  onCancelEdit,
  onDeleteComment,
  onEditingTextChange,
  onImageClick,
  socialMediaPlanId,
  linkUrl
}) => {
  const isEditing = editingCommentId === comment.id;
  return <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start gap-3 mb-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-sm">
            {comment.creator?.full_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {comment.creator?.full_name || 'Unknown User'}
              </span>
              <Badge variant="outline" className="text-xs px-2 py-1 h-5 text-blue-600 border-blue-200">
                <MessageSquare className="h-3 w-3 mr-1" />
                Comment
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEditComment(comment)} disabled={isEditing}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => onDeleteComment(comment.id)} disabled={isDeletingComment}>
                {isDeletingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {format(new Date(comment.created_at), 'dd MMM, HH:mm')}
            </span>
            {/* Display image thumbnails in the selected section */}
            <CommentImageThumbnails commentId={comment.id} socialMediaPlanId={socialMediaPlanId} linkUrl={linkUrl} onImageClick={onImageClick} />
          </div>
        </div>
      </div>

      {isEditing ? <div className="space-y-3">
          <Textarea value={editingText} onChange={e => onEditingTextChange(e.target.value)} className="min-h-[80px] text-sm resize-none" placeholder="Edit your comment..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancelEdit} className="h-9 px-3 text-sm">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSaveEdit} disabled={isUpdatingComment || !editingText.trim()} className="h-9 px-3 text-sm">
              {isUpdatingComment ? <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </> : <>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </>}
            </Button>
          </div>
        </div> : <div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {comment.comment_text || 'No comment text'}
          </p>
          
          {/* Show images associated with this specific comment */}
          <CommentImages commentId={comment.id} socialMediaPlanId={socialMediaPlanId} linkUrl={linkUrl} onImageClick={onImageClick} />
        </div>}
    </div>;
});

// Small thumbnails displayed in the comment header
const CommentImageThumbnails = React.memo<{
  commentId: string;
  socialMediaPlanId: string;
  linkUrl: string;
  onImageClick: (imageUrl: string, imageName: string, createdAt: string) => void;
}>(({
  commentId,
  socialMediaPlanId,
  linkUrl,
  onImageClick
}) => {
  const {
    images
  } = useSnippingImages(socialMediaPlanId, linkUrl);
  const commentImages = images.filter(img => img.link_comments_id === commentId);
  if (commentImages.length === 0) return null;
  return;
});
CommentImageThumbnails.displayName = 'CommentImageThumbnails';

// Component to show images for a specific comment
const CommentImages = React.memo<{
  commentId: string;
  socialMediaPlanId: string;
  linkUrl: string;
  onImageClick: (imageUrl: string, imageName: string, createdAt: string) => void;
}>(({
  commentId,
  socialMediaPlanId,
  linkUrl,
  onImageClick
}) => {
  const {
    images
  } = useSnippingImages(socialMediaPlanId, linkUrl);
  const commentImages = images.filter(img => img.link_comments_id === commentId);
  if (commentImages.length === 0) return null;
  return <div className="mt-3 flex flex-wrap gap-2">
      {commentImages.map(image => {
      // Construct proper image URL with cache-busting to avoid CDN stale/404
      const baseUrl = supabase.storage.from('sniping-images').getPublicUrl(image.image_path).data.publicUrl;
      const version = new Date((image as any).updated_at || image.created_at).getTime();
      const imageUrl = `${baseUrl}?v=${version}`;
      console.log('Comment image details:', {
        imageName: image.image_name,
        imagePath: image.image_path,
        imageUrl,
        commentId: image.link_comments_id
      });
      return <div key={image.id} className="cursor-pointer hover:opacity-80 transition-opacity">
            <img src={imageUrl} alt={image.image_name || 'Comment image'} className="w-20 h-20 rounded-lg border object-cover shadow-sm" onClick={() => onImageClick(imageUrl, image.image_name, image.created_at)} loading="lazy" onLoad={() => console.log('✅ Image loaded successfully:', imageUrl)} onError={e => {
          console.error('❌ Failed to load comment image:', {
            imagePath: image.image_path,
            imageUrl,
            error: e
          });
          // Check if image exists in storage
          supabase.storage.from('sniping-images').download(image.image_path).then(({
            data,
            error
          }) => {
            if (error) {
              console.error('❌ Image not found in storage:', error);
            } else {
              console.log('✅ Image exists in storage but failed to load via URL');
            }
          });

          // Retry once with a fresh cache-buster, then fallback placeholder
          const retryUrl = `${baseUrl}?v=${Date.now()}`;
          (e.currentTarget as HTMLImageElement).src = retryUrl;
        }} />
          </div>;
    })}
    </div>;
});
CommentImages.displayName = 'CommentImages';
export const OptimizedCommentPanel: React.FC<OptimizedCommentPanelProps> = React.memo(({
  socialMediaPlanId,
  linkUrl
}) => {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Image preview modal state
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
    createdAt: string;
    creatorName?: string;
  } | null>(null);
  const {
    comments,
    isLoading,
    addComment,
    updateComment,
    deleteComment,
    isAddingComment,
    isUpdatingComment,
    isDeletingComment,
    error
  } = useOptimizedLinkComments(socialMediaPlanId, linkUrl);

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 OptimizedCommentPanel - Props changed:', {
      socialMediaPlanId,
      linkUrl,
      effectiveLinkUrl: linkUrl || 'default-link',
      commentsCount: comments?.length || 0,
      isLoading,
      error: error?.message,
      comments: comments?.map(c => ({ id: c.id, text: c.comment_text?.substring(0, 30) + '...' }))
    });
  }, [socialMediaPlanId, linkUrl, comments?.length, isLoading, error, comments]);
  const {
    images,
    isLoading: isLoadingImages,
    addImage,
    deleteImage,
    isAddingImage,
    isDeletingImage
  } = useSnippingImages(socialMediaPlanId, linkUrl);

  // State for pasted images preview
  const [pastedImages, setPastedImages] = useState<Array<{
    id: string;
    file: File;
    preview: string;
  }>>([]);
  const handleAddComment = useCallback(async () => {
    const trimmedComment = newComment.trim();
    console.log('🚀 handleAddComment called:', {
      trimmedComment: trimmedComment?.substring(0, 50) + '...',
      pastedImagesCount: pastedImages.length,
      socialMediaPlanId,
      linkUrl,
      effectiveLinkUrl: linkUrl || 'default-link'
    });
    
    if (!trimmedComment && pastedImages.length === 0) {
      toast.error('Please enter a comment or add an image');
      return;
    }
    try {
      let commentId: string | null = null;

      // Add the comment first if there's text
      if (trimmedComment) {
        console.log('📝 Adding comment with text...');
        const commentResult = await addComment(trimmedComment);
        commentId = commentResult?.id;
        console.log('✅ Comment added with ID:', commentId);
      }

      // Upload images if any
      if (pastedImages.length > 0) {
        for (const image of pastedImages) {
          const {
            data: {
              user
            }
          } = await supabase.auth.getUser();
          if (!user) {
            toast.error('You must be logged in to upload images');
            continue;
          }
          const fileName = `paste-${Date.now()}-${image.file.name || 'image.png'}`;
          const filePath = `${user.id}/${fileName}`;
          const {
            data,
            error
          } = await supabase.storage.from('sniping-images').upload(filePath, image.file, {
            contentType: image.file.type
          });
          if (error) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload ${image.file.name}`);
            continue;
          }

          // Add to database with comment reference
          await addImage(filePath, fileName, image.file.type, image.file.size, commentId);
        }
      }
      setNewComment('');
      setPastedImages([]);
      console.log('🎉 Comment addition process completed successfully');
      toast.success('Comment and images added successfully!');
    } catch (error) {
      console.error('❌ Error adding comment with images:', error);
      toast.error('Failed to add comment');
    }
  }, [newComment, addComment, pastedImages, addImage]);
  const handleEditComment = useCallback((comment: LinkComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.comment_text || '');
  }, []);
  const handleSaveEdit = useCallback(async () => {
    if (!editingCommentId || !editingText.trim()) return;
    try {
      await updateComment(editingCommentId, editingText);
      setEditingCommentId(null);
      setEditingText('');
      toast.success('Comment updated successfully');
    } catch (error) {
      toast.error('Failed to update comment');
    }
  }, [editingCommentId, editingText, updateComment]);
  const handleCancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditingText('');
  }, []);
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus komentar ini?')) {
      try {
        await deleteComment(commentId);
        toast.success('Comment deleted successfully');
      } catch (error) {
        toast.error('Failed to delete comment');
      }
    }
  }, [deleteComment]);

  // Handle image paste in textarea - just preview, don't upload yet
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          const imageId = `paste-${Date.now()}-${Math.random()}`;
          setPastedImages(prev => [...prev, {
            id: imageId,
            file,
            preview
          }]);
          toast.success('Image pasted! It will be uploaded when you submit the comment.');
        }
      }
    }
  }, []);

  // Remove pasted image
  const removeImage = useCallback((imageId: string) => {
    setPastedImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  }, []);

  // Handle Enter key to submit comment
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddComment();
    }
  }, [handleAddComment]);

  // Handle snipping tool image capture
  const handleImageCaptured = useCallback(async (imageUrl: string, fileName: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const filePath = `${user.id}/${fileName}`;
      await addImage(filePath, fileName, 'image/png');
      toast.success('Screenshot added successfully!');
    } catch (error) {
      console.error('Error saving captured image:', error);
      toast.error('Failed to save captured image');
    }
  }, [addImage]);

  // Handle image deletion
  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      try {
        await deleteImage(imageId);
        toast.success('Image deleted successfully');
      } catch (error) {
        toast.error('Failed to delete image');
      }
    }
  }, [deleteImage]);

  // Memoize rendered comments to prevent unnecessary re-renders
  const renderedComments = useMemo(() => {
    console.log('🎨 Rendering comments:', {
      commentsCount: comments.length,
      commentIds: comments.map(c => c.id),
      commentTexts: comments.map(c => c.comment_text?.substring(0, 20) + '...')
    });
    return comments.map(comment => <CommentItem key={comment.id} comment={comment} editingCommentId={editingCommentId} editingText={editingText} isUpdatingComment={isUpdatingComment} isDeletingComment={isDeletingComment} onEditComment={handleEditComment} onSaveEdit={handleSaveEdit} onCancelEdit={handleCancelEdit} onDeleteComment={handleDeleteComment} onEditingTextChange={setEditingText} onImageClick={(imageUrl, imageName, createdAt) => setPreviewImage({
      url: imageUrl,
      name: imageName,
      createdAt
    })} socialMediaPlanId={socialMediaPlanId} linkUrl={linkUrl} />);
  }, [socialMediaPlanId, linkUrl, comments, editingCommentId, editingText, isUpdatingComment, isDeletingComment, handleEditComment, handleSaveEdit, handleCancelEdit, handleDeleteComment]);
  if (isLoading) {
    return <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>;
  }
  if (error) {
    console.error('❌ OptimizedCommentPanel error:', error);
    return <div className="p-6">
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <MessageSquare className="h-4 w-4" />
          <span>Error loading comments: {error.message}</span>
        </div>
      </div>;
  }
  return <div className="flex flex-col h-full bg-white">
      {/* Image Preview Modal */}
      {previewImage && <ImagePreviewModal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} imageUrl={previewImage.url} imageName={previewImage.name} createdAt={previewImage.createdAt} creatorName={previewImage.creatorName} />}

      {/* Comments List */}
      <div className="flex-1 overflow-hidden shadow-inner">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {renderedComments}

            {/* Images Section - Only show unassociated images */}
            {images.filter(img => !img.link_comments_id).length > 0 && <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <ImageIcon className="h-4 w-4" />
                  Unassociated Images ({images.filter(img => !img.link_comments_id).length})
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {images.filter(img => !img.link_comments_id).map(image => <div key={image.id} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
                      <img src={`https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/sniping-images/${image.image_path}?v=${new Date((image as any).updated_at || image.created_at).getTime()}`} alt={image.image_name} className="w-full h-20 object-cover cursor-pointer" onClick={() => window.open(`https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/sniping-images/${image.image_path}?v=${new Date((image as any).updated_at || image.created_at).getTime()}`, '_blank')} />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                        <Button variant="destructive" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0" onClick={() => handleDeleteImage(image.id)} disabled={isDeletingImage}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="p-1 text-xs text-gray-600 bg-gray-50">
                        <div className="font-medium truncate">{image.image_name}</div>
                        <div className="text-gray-500">
                          {format(new Date(image.created_at), 'dd MMM, HH:mm')}
                        </div>
                      </div>
                    </div>)}
                </div>
              </div>}

            {comments.length === 0 && images.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Belum ada komentar atau gambar quality control.</p>
                <p>Tambahkan komentar atau gunakan sniping tool di bawah.</p>
                <div className="mt-4 text-xs text-gray-400">
                  Debug: comments={comments.length}, images={images.length}, isLoading={isLoading ? 'true' : 'false'}
                </div>
              </div>}
          </div>
        </ScrollArea>
      </div>

      {/* Add Comment Form - Fixed at bottom with proper alignment */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 shadow-lg">
        <div className="space-y-4">
          <div className="space-y-2">
            
            <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder="Tulis komentar quality control... (Ctrl+Enter untuk submit, paste gambar untuk upload)" className="min-h-[100px] text-sm resize-none" />
            
            {/* Pasted Images Preview */}
            {pastedImages.length > 0 && <div className="mt-2 flex flex-wrap gap-2">
                {pastedImages.map(image => <div key={image.id} className="relative group">
                    <img src={image.preview} alt="Pasted image" className="w-16 h-16 object-cover rounded border" />
                    <button onClick={() => removeImage(image.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600">
                      ×
                    </button>
                  </div>)}
              </div>}
            
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                {comments.length} komentar, {images.length} gambar
              </span>
              <SnippingTool onImageCaptured={handleImageCaptured} disabled={isAddingImage} />
            </div>
            <Button onClick={handleAddComment} disabled={isAddingComment || !newComment.trim() && pastedImages.length === 0} className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              {isAddingComment ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menambahkan...
                </> : <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Tambah Komentar
                </>}
            </Button>
          </div>
        </div>
      </div>
    </div>;
});
OptimizedCommentPanel.displayName = 'OptimizedCommentPanel';