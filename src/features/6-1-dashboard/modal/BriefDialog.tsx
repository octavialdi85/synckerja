import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Separator } from '@/features/ui/separator';
import { MessageCircle, Send, Trash2, FileText, Globe, RotateCcw, CheckCircle } from 'lucide-react';
import { useLinkComments } from '../hook/useLinkComments';
import { formatDistanceToNow } from 'date-fns';
import { LinkPreviewPanel } from './LinkPreviewPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BriefDialogProps {
  isOpen: boolean;
  onClose: () => void;
  brief: string | null;
  onSave: (brief: string) => void;
  socialMediaPlanId?: string;
  onStatusUpdate?: (planId: string, updates: any) => void; // Add callback for status updates
}

const BriefDialog: React.FC<BriefDialogProps> = ({
  isOpen,
  onClose,
  brief,
  onSave,
  socialMediaPlanId,
  onStatusUpdate
}) => {
  const [briefText, setBriefText] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showApprovalButtons, setShowApprovalButtons] = useState(false);

  // Reset state when dialog opens/closes or when socialMediaPlanId changes
  useEffect(() => {
    if (isOpen) {
      setBriefText(brief || '');
      setNewComment('');
      setShowPreview(false);
    } else {
      setBriefText('');
      setNewComment('');
      setShowPreview(false);
    }
  }, [isOpen, brief, socialMediaPlanId]);

  const {
    comments,
    isLoading: commentsLoading,
    addComment,
    deleteComment
  } = useLinkComments(socialMediaPlanId || '', 'brief');

  // Check approval access on dialog open
  useEffect(() => {
    const checkApprovalAccess = async () => {
      if (!isOpen) return;
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setShowApprovalButtons(false);
          return;
        }

        // Get user's active organization
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('active_organization_id')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile?.active_organization_id) {
          setShowApprovalButtons(false);
          return;
        }

        // Get user's role in the organization
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', profile.active_organization_id)
          .single();

        if (roleError || !userRole) {
          setShowApprovalButtons(false);
          return;
        }

        // Get user's employee record to check exceptions
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', profile.active_organization_id)
          .single();

        if (employeeError || !employee) {
          setShowApprovalButtons(false);
          return;
        }

        // Get approval configuration for 'approved' column type
        const { data: config, error: configError } = await supabase
          .from('approval_access_configurations')
          .select('*')
          .eq('organization_id', profile.active_organization_id)
          .eq('column_type', 'approved')
          .eq('is_active', true)
          .maybeSingle();

        if (configError || !config) {
          // If no configuration found, fall back to admin-only access
          const hasAdminAccess = userRole.role === 'owner' || userRole.role === 'admin';
          setShowApprovalButtons(hasAdminAccess);
          return;
        }

        // Check if user's role is in the allowed roles
        const hasRoleAccess = config.allowed_roles?.includes(userRole.role);
        
        // Check if user is in the exceptions list
        const isException = config.exceptions?.includes(employee.id);

        setShowApprovalButtons(hasRoleAccess || isException);
      } catch (error) {
        console.error('Error checking approval access in BriefDialog:', error);
        setShowApprovalButtons(false);
      }
    };

    checkApprovalAccess();
  }, [isOpen]);

  const handleSave = async () => {
    if (!socialMediaPlanId) {
      onSave(briefText.trim());
      onClose();
      return;
    }

    try {
      // Update the social media plan with brief, completion date, and status
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('social_media_plans')
        .update({
          brief: briefText.trim(),
          completion_date: now, // Set completion date when saving brief
          status: 'Need Review' // Auto set status to Need Review
        })
        .eq('id', socialMediaPlanId);

      if (error) {
        console.error('Error updating brief:', error);
        toast.error('Failed to save brief');
      } else {
        toast.success('Brief saved successfully');
        
        // Update parent component with brief, completion_date, and status
        if (onStatusUpdate) {
          onStatusUpdate(socialMediaPlanId, {
            brief: briefText.trim(),
            completion_date: now,
            status: 'Need Review'
          });
        }
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Failed to save changes');
    }

    onSave(briefText.trim());
    onClose();
  };

  const handleRequestRevision = async () => {
    if (!socialMediaPlanId) return;
    
    setIsUpdatingStatus(true);
    try {
      // Get current revision count
      const { data: currentPlan, error: fetchError } = await supabase
        .from('social_media_plans')
        .select('revision_count')
        .eq('id', socialMediaPlanId)
        .single();

      if (fetchError) {
        console.error('Error fetching current plan:', fetchError);
        toast.error('Failed to fetch current data');
        return;
      }

      const newRevisionCount = (currentPlan.revision_count || 0) + 1;

      const { error } = await supabase
        .from('social_media_plans')
        .update({
          status: 'Request Revision',
          revision_count: newRevisionCount,
          approved: false,
          completion_date: null // Clear completion date when requesting revision
        })
        .eq('id', socialMediaPlanId);

      if (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to request revision');
      } else {
        toast.success('Status updated to Request Revision');
        
        // Update parent component data
        if (onStatusUpdate) {
          onStatusUpdate(socialMediaPlanId, {
            status: 'Request Revision',
            revision_count: newRevisionCount,
            approved: false,
            completion_date: null // Also clear in parent update
          });
        }
        
        onClose(); // Close popup after successful action
      }
    } catch (error) {
      console.error('Error in handleRequestRevision:', error);
      toast.error('Failed to request revision');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleApproved = async () => {
    if (!socialMediaPlanId) return;
    
    setIsUpdatingStatus(true);
    try {
      const completionDate = new Date().toISOString();
      
      const { error } = await supabase
        .from('social_media_plans')
        .update({
          status: 'Approved',
          approved: true,
          completion_date: completionDate
        })
        .eq('id', socialMediaPlanId);

      if (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to approve');
      } else {
        toast.success('Status updated to Approved');
        
        // Update parent component data
        if (onStatusUpdate) {
          onStatusUpdate(socialMediaPlanId, {
            status: 'Approved',
            approved: true,
            completion_date: completionDate
          });
        }
        
        onClose(); // Close popup after successful action
      }
    } catch (error) {
      console.error('Error in handleApproved:', error);
      toast.error('Failed to approve');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !socialMediaPlanId) return;
    
    await addComment({ commentText: newComment.trim() });
    setNewComment('');
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
  };

  // Check if brief contains Google Docs links
  const hasGoogleDocsLink = briefText.includes('docs.google.com');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only absolute">Content Brief</DialogTitle>
        <DialogDescription className="sr-only absolute">Edit content brief and manage comments</DialogDescription>
        <div className="flex flex-col h-full">
          <div className="flex flex-1 overflow-hidden">
            {/* Left Section - Comments (Narrower) */}
            <div className="w-1/4 border-r border-gray-200 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm text-gray-800">Comments</span>
                </div>
              </div>

              {socialMediaPlanId && (
                <>
                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto seamless-scroll p-4">
                    {commentsLoading ? (
                      <div className="text-sm text-gray-500">Loading comments...</div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-sm text-gray-500">No comments yet</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div key={comment.id} className="bg-white border border-gray-200 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-blue-600">
                                    {comment.creator?.full_name?.charAt(0) || 'U'}
                                  </span>
                                </div>
                                <span className="font-medium text-sm text-gray-800">
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
                            <p className="text-sm text-gray-700">{comment.comment_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Comment Field - Moved to Bottom */}
                  <div className="p-4 border-t border-gray-100 flex-shrink-0">
                    <div className="flex gap-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="min-h-[60px] resize-none text-sm"
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        size="sm"
                        className="self-end px-3"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Section - Brief Content & Preview (Wider) */}
            <div className="w-3/4 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm text-gray-800">Brief Content</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasGoogleDocsLink && (
                    <div className="flex gap-1">
                      <Button
                        variant={!showPreview ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowPreview(false)}
                        className="h-7 px-3 text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant={showPreview ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        className="h-7 px-3 text-xs"
                      >
                        <Globe className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {showPreview && hasGoogleDocsLink ? (
                  <LinkPreviewPanel brief={briefText} />
                ) : (
                  <div className="h-full p-4">
                    <Textarea
                      value={briefText}
                      onChange={(e) => setBriefText(e.target.value)}
                      placeholder="Enter brief content here..."
                      className="w-full h-full resize-none border-gray-200 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50">
            {/* Left side - Action buttons */}
            <div className="flex gap-2">
              {socialMediaPlanId && showApprovalButtons && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRequestRevision}
                    disabled={isUpdatingStatus}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Request Revision
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApproved}
                    disabled={isUpdatingStatus}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approved
                  </Button>
                </>
              )}
            </div>

            {/* Right side - Cancel and Save buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="px-6">
                Cancel
              </Button>
              <Button onClick={handleSave} className="px-6">
                Save Brief
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BriefDialog;
