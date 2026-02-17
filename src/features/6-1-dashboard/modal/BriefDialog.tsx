import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { MessageCircle, Send, Trash2, FileText, Globe, RotateCcw, CheckCircle, ExternalLink, CircleCheck } from 'lucide-react';
import { useLinkComments } from '../hook/useLinkComments';
import { useBriefExtended } from '../hook/useBriefExtended';
import { formatDistanceToNow } from 'date-fns';
import { LinkPreviewPanel } from './LinkPreviewPanel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { devLog } from '@/config/logger';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface BriefDialogProps {
  isOpen: boolean;
  onClose: () => void;
  brief: string | null;
  onSave: (brief: string) => void;
  socialMediaPlanId?: string;
  onStatusUpdate?: (planId: string, updates: any) => void;
  targetAudience?: string | null;
  caption?: string | null;
  linkReference?: string | null;
}

const BriefDialog: React.FC<BriefDialogProps> = ({
  isOpen,
  onClose,
  brief,
  onSave,
  socialMediaPlanId,
  onStatusUpdate,
  targetAudience: targetAudienceProp,
  caption: captionProp,
  linkReference: linkReferenceProp
}) => {
  const { t } = useAppTranslation();
  const [briefText, setBriefText] = useState('');
  const [targetAudienceText, setTargetAudienceText] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [linkReferenceText, setLinkReferenceText] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<string>('brief');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showApprovalButtons, setShowApprovalButtons] = useState(false);
  const skipNextAutoSaveRef = useRef(false);

  const {
    targetAudience: targetAudienceFetched,
    caption: captionFetched,
    linkReference: linkReferenceFetched,
    isLoading: extendedLoading,
    invalidate: invalidateExtended
  } = useBriefExtended(socialMediaPlanId, isOpen);

  const {
    comments,
    isLoading: commentsLoading,
    addComment,
    deleteComment
  } = useLinkComments(socialMediaPlanId || '', 'brief');

  // Reset or sync state when dialog opens/closes or data changes
  useEffect(() => {
    if (!isOpen) {
      setBriefText('');
      setTargetAudienceText('');
      setCaptionText('');
      setLinkReferenceText('');
      setNewComment('');
      setShowPreview(false);
      setAccordionOpen('brief');
      return;
    }
    setBriefText(brief || '');
    setNewComment('');
    setShowPreview(false);
    setAccordionOpen('brief');
    setTargetAudienceText(targetAudienceProp !== undefined ? (targetAudienceProp ?? '') : '');
    setCaptionText(captionProp !== undefined ? (captionProp ?? '') : '');
    setLinkReferenceText(linkReferenceProp !== undefined ? (linkReferenceProp ?? '') : '');
    skipNextAutoSaveRef.current = true;
  }, [isOpen, brief, socialMediaPlanId]);

  // When extended data finishes loading, populate target audience and caption (if not controlled by props)
  useEffect(() => {
    if (!isOpen || extendedLoading || targetAudienceProp !== undefined) return;
    setTargetAudienceText(targetAudienceFetched ?? '');
  }, [isOpen, extendedLoading, targetAudienceFetched, targetAudienceProp]);

  useEffect(() => {
    if (!isOpen || extendedLoading || captionProp !== undefined) return;
    setCaptionText(captionFetched ?? '');
  }, [isOpen, extendedLoading, captionFetched, captionProp]);

  useEffect(() => {
    if (!isOpen || extendedLoading || linkReferenceProp !== undefined) return;
    setLinkReferenceText(linkReferenceFetched ?? '');
  }, [isOpen, extendedLoading, linkReferenceFetched, linkReferenceProp]);

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
        devLog.error('Error checking approval access in BriefDialog:', error);
        setShowApprovalButtons(false);
      }
    };

    checkApprovalAccess();
  }, [isOpen]);

  const performSave = async (options: { closeAfter?: boolean } = {}) => {
    const { closeAfter = false } = options;
    if (!socialMediaPlanId) {
      onSave(briefText.trim());
      if (closeAfter) onClose();
      return;
    }

    try {
      const now = new Date().toISOString();

      const { error: planError } = await supabase
        .from('social_media_plans')
        .update({
          brief: briefText.trim(),
          completion_date: now,
          status: 'Need Review'
        })
        .eq('id', socialMediaPlanId);

      if (planError) {
        devLog.error('Error updating brief:', planError);
        toast.error('Failed to save brief');
        return;
      }

      const { error: audienceError } = await supabase
        .from('brief_target_audiences')
        .upsert(
          {
            social_media_plan_id: socialMediaPlanId,
            description: targetAudienceText.trim() || null,
            updated_at: now
          },
          { onConflict: 'social_media_plan_id' }
        );

      if (audienceError) {
        devLog.error('Error saving target audience:', audienceError);
        toast.error('Failed to save target audience');
        return;
      }

      const { error: captionError } = await supabase
        .from('brief_captions')
        .upsert(
          {
            social_media_plan_id: socialMediaPlanId,
            content: captionText.trim() || null,
            updated_at: now
          },
          { onConflict: 'social_media_plan_id' }
        );

      if (captionError) {
        devLog.error('Error saving caption:', captionError);
        toast.error('Failed to save caption');
        return;
      }

      const { error: linkRefError } = await supabase
        .from('brief_link_references')
        .upsert(
          {
            social_media_plan_id: socialMediaPlanId,
            content: linkReferenceText.trim() || null,
            updated_at: now
          },
          { onConflict: 'social_media_plan_id' }
        );

      if (linkRefError) {
        devLog.error('Error saving link reference:', linkRefError);
        toast.error('Failed to save link reference');
        return;
      }

      invalidateExtended();
      if (closeAfter) {
        toast.success('Brief saved successfully');
        if (onStatusUpdate) {
          onStatusUpdate(socialMediaPlanId, {
            brief: briefText.trim(),
            completion_date: now,
            status: 'Need Review'
          });
        }
        onSave(briefText.trim());
        onClose();
      }
    } catch (error) {
      devLog.error('Error in handleSave:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleSave = () => performSave({ closeAfter: true });

  // Auto-save when accordion fields change (debounced); skip first run after dialog open
  useEffect(() => {
    if (!isOpen || !socialMediaPlanId) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      performSave({ closeAfter: false });
    }, 1200);
    return () => clearTimeout(timer);
  }, [isOpen, socialMediaPlanId, briefText, targetAudienceText, captionText, linkReferenceText]);

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
        devLog.error('Error fetching current plan:', fetchError);
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
        devLog.error('Error updating status:', error);
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
      devLog.error('Error in handleRequestRevision:', error);
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
        devLog.error('Error updating status:', error);
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
      devLog.error('Error in handleApproved:', error);
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

  // Extract first URL from link reference text for "View reference" button
  const firstLinkReferenceUrl = (() => {
    const match = linkReferenceText.match(/https?:\/\/[^\s]+/i);
    return match ? match[0].replace(/[.,;:!?)]+$/, '') : null;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only absolute">Content Brief</DialogTitle>
        <DialogDescription className="sr-only absolute">Edit content brief and manage comments</DialogDescription>
        <div className="flex flex-col h-full min-h-0">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left Section - Comments (Narrower) */}
            <div className="w-1/4 border-r border-gray-200 flex flex-col min-h-0">
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
            <div className="w-3/4 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm text-gray-800">{t('briefDialog.sectionBriefContent', 'Brief Content')}</span>
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
                        {t('briefDialog.edit', 'Edit')}
                      </Button>
                      <Button
                        variant={showPreview ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        className="h-7 px-3 text-xs"
                      >
                        <Globe className="h-3 w-3 mr-1" />
                        {t('briefDialog.preview', 'Preview')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {showPreview && hasGoogleDocsLink ? (
                  <LinkPreviewPanel brief={briefText} />
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4">
                    <Accordion
                      type="single"
                      collapsible
                      value={accordionOpen}
                      onValueChange={(v) => setAccordionOpen(v ?? '')}
                      className="w-full flex-1 flex flex-col min-h-0 gap-1"
                    >
                      <AccordionItem value="brief" className="border border-gray-200 rounded-lg px-4 bg-white flex flex-col data-[state=open]:flex-1 data-[state=open]:min-h-0">
                        <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-3 flex-shrink-0">
                          <span className="flex items-center gap-2">
                            {briefText.trim() ? (
                              <CircleCheck className="h-4 w-4 text-green-600 shrink-0" aria-hidden />
                            ) : (
                              <span className="w-4 h-4 shrink-0 rounded-full border-2 border-gray-300" aria-hidden />
                            )}
                            {t('briefDialog.sectionBriefContent', 'Brief Content')}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent
                          primitiveClassName="data-[state=open]:!h-full"
                          className="flex-1 min-h-0 overflow-hidden flex flex-col pb-4 pt-0 min-h-[280px] h-full"
                        >
                          <div className="min-h-[260px] flex-1 flex flex-col overflow-hidden h-full">
                            <Textarea
                              value={briefText}
                              onChange={(e) => setBriefText(e.target.value)}
                              placeholder={t('briefDialog.placeholderBrief', 'Enter brief content here...')}
                              className="w-full h-full min-h-[240px] resize-none border-gray-200 text-sm"
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="targetAudience" className="border border-gray-200 rounded-lg px-4 bg-white flex flex-col data-[state=open]:flex-1 data-[state=open]:min-h-0">
                        <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-3 flex-shrink-0">
                          <span className="flex items-center gap-2">
                            {targetAudienceText.trim() ? (
                              <CircleCheck className="h-4 w-4 text-green-600 shrink-0" aria-hidden />
                            ) : (
                              <span className="w-4 h-4 shrink-0 rounded-full border-2 border-gray-300" aria-hidden />
                            )}
                            {t('briefDialog.sectionTargetAudience', 'Target Audience')}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent
                          primitiveClassName="data-[state=open]:!h-full"
                          className="flex-1 min-h-0 overflow-hidden flex flex-col pb-4 pt-0 min-h-[280px] h-full"
                        >
                          <div className="min-h-[260px] flex-1 flex flex-col overflow-hidden h-full">
                            <Textarea
                              value={targetAudienceText}
                              onChange={(e) => setTargetAudienceText(e.target.value)}
                              placeholder={t('briefDialog.placeholderTargetAudience', 'Target audience description (free-form)...')}
                              className="w-full h-full min-h-[240px] resize-none border-gray-200 text-sm"
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="caption" className="border border-gray-200 rounded-lg px-4 bg-white flex flex-col data-[state=open]:flex-1 data-[state=open]:min-h-0">
                        <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-3 flex-shrink-0">
                          <span className="flex items-center gap-2">
                            {captionText.trim() ? (
                              <CircleCheck className="h-4 w-4 text-green-600 shrink-0" aria-hidden />
                            ) : (
                              <span className="w-4 h-4 shrink-0 rounded-full border-2 border-gray-300" aria-hidden />
                            )}
                            {t('briefDialog.sectionCaption', 'Caption')}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent
                          primitiveClassName="data-[state=open]:!h-full"
                          className="flex-1 min-h-0 overflow-hidden flex flex-col pb-4 pt-0 min-h-[280px] h-full"
                        >
                          <div className="min-h-[260px] flex-1 flex flex-col overflow-hidden h-full">
                            <Textarea
                              value={captionText}
                              onChange={(e) => setCaptionText(e.target.value)}
                              placeholder={t('briefDialog.placeholderCaption', 'Caption and hashtags...')}
                              className="w-full h-full min-h-[240px] resize-none border-gray-200 text-sm"
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="linkReference" className="border border-gray-200 rounded-lg px-4 bg-white flex flex-col data-[state=open]:flex-1 data-[state=open]:min-h-0">
                        <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-3 flex-shrink-0">
                          <span className="flex items-center gap-2">
                            {linkReferenceText.trim() ? (
                              <CircleCheck className="h-4 w-4 text-green-600 shrink-0" aria-hidden />
                            ) : (
                              <span className="w-4 h-4 shrink-0 rounded-full border-2 border-gray-300" aria-hidden />
                            )}
                            {t('briefDialog.sectionLinkReference', 'Link Reference')}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent
                          primitiveClassName="data-[state=open]:!h-full"
                          className="flex-1 min-h-0 overflow-hidden flex flex-col pb-4 pt-0 min-h-[280px] h-full"
                        >
                          <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                            <div className="flex-shrink-0 mb-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!firstLinkReferenceUrl}
                                onClick={() => firstLinkReferenceUrl && window.open(firstLinkReferenceUrl, '_blank', 'noopener,noreferrer')}
                                className="gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                {t('briefDialog.viewLinkReference', 'View reference video')}
                              </Button>
                            </div>
                            <div className="min-h-[260px] flex-1 flex flex-col overflow-hidden">
                              <Textarea
                                value={linkReferenceText}
                                onChange={(e) => setLinkReferenceText(e.target.value)}
                                placeholder={t('briefDialog.placeholderLinkReference', 'Paste link(s) or reference URL(s)...')}
                                className="w-full h-full min-h-[240px] resize-none border-gray-200 text-sm"
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
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
                    {t('briefDialog.requestRevision', 'Request Revision')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApproved}
                    disabled={isUpdatingStatus}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('briefDialog.approved', 'Approved')}
                  </Button>
                </>
              )}
            </div>

            {/* Right side - Cancel and Save buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="px-6">
                {t('briefDialog.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSave} className="px-6">
                {t('briefDialog.saveBrief', 'Save Brief')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BriefDialog;
