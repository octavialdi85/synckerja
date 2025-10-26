
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Separator } from '@/features/ui/separator';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { useLinkComments } from '../hook/useLinkComments';
import { formatDistanceToNow } from 'date-fns';

interface TitleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | null;
  onSave: (title: string) => void;
  socialMediaPlanId?: string;
}

const TitleDialog: React.FC<TitleDialogProps> = ({
  isOpen,
  onClose,
  title,
  onSave,
  socialMediaPlanId
}) => {
  const [titleText, setTitleText] = useState('');
  const [newComment, setNewComment] = useState('');

  // FIXED: Reset state when dialog opens/closes or when socialMediaPlanId changes
  useEffect(() => {
    if (isOpen) {
      setTitleText(title || '');
      setNewComment(''); // Clear comment input when opening
    } else {
      // Clear all state when closing
      setTitleText('');
      setNewComment('');
    }
  }, [isOpen, title, socialMediaPlanId]);

  const {
    comments,
    isLoading: commentsLoading,
    addComment,
    deleteComment
  } = useLinkComments(socialMediaPlanId || '', 'title');

  const handleSave = () => {
    onSave(titleText.trim());
    onClose();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !socialMediaPlanId) return;
    
    await addComment({ commentText: newComment.trim() });
    setNewComment(''); // Clear after adding
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto seamless-scroll">
        <DialogHeader>
          <DialogTitle>Content Title</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Content Title</label>
            <Textarea
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              placeholder="Enter content title here..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {socialMediaPlanId && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Comments</span>
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    size="sm"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto seamless-scroll">
                  {commentsLoading ? (
                    <div className="text-sm text-gray-500">Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="text-sm text-gray-500">No comments yet</div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {comment.creator?.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <span className="font-medium text-sm">
                              {comment.creator?.full_name || 'Unknown User'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm">{comment.comment_text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TitleDialog;
