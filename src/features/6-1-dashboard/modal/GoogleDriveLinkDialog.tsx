import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Badge } from '@/features/ui/badge';
import { ExternalLink, Check, RotateCcw, LinkIcon, Calendar, FileText, Tag } from 'lucide-react';
import { OptimizedCommentPanel } from './OptimizedCommentPanel';
import GoogleDriveFolderCarousel from './GoogleDriveFolderCarousel';
import GoogleDriveAuthButton from '@/components/6-1-dashboard/GoogleDriveAuthButton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GoogleDriveLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  googleDriveLink: string;
  onSave: (link: string) => void;
  socialMediaPlanId: string;
  planTitle?: string;
  onApprove?: () => void;
  onRevision?: () => void;
  status?: 'draft' | 'approved' | 'revision' | 'completed';
  // New props for content information
  contentTitle?: string;
  contentType?: string;
  postDate?: string;
}

const GoogleDriveLinkDialog: React.FC<GoogleDriveLinkDialogProps> = ({
  isOpen,
  onClose,
  googleDriveLink,
  onSave,
  socialMediaPlanId,
  planTitle,
  onApprove,
  onRevision,
  status = 'draft',
  contentTitle,
  contentType,
  postDate
}) => {
  const [currentLink, setCurrentLink] = useState(googleDriveLink);
  const [canShowApprovalButtons, setCanShowApprovalButtons] = useState(false);
  
  // Check approval access for prod_approved column based on configuration
  const checkApprovalAccess = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get user's active organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.active_organization_id) {
        console.error('Error fetching user profile:', profileError);
        return false;
      }

      // Get user's role in the organization
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile.active_organization_id)
        .single();

      if (roleError || !userRole) {
        console.error('Error fetching user role:', roleError);
        return false;
      }

      // Get user's employee record to check exceptions
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', profile.active_organization_id)
        .single();

      if (employeeError || !employee) {
        console.error('Error fetching employee:', employeeError);
        return false;
      }

      // Get approval configuration for prod_approved column type
      const { data: config, error: configError } = await supabase
        .from('approval_access_configurations')
        .select('*')
        .eq('organization_id', profile.active_organization_id)
        .eq('column_type', 'prod_approved')
        .eq('is_active', true)
        .single();

      if (configError || !config) {
        // If no configuration found, fall back to admin-only access
        console.log('No prod_approved configuration found, falling back to admin access');
        return userRole.role === 'owner' || userRole.role === 'admin';
      }

      // Check if user's role is in the allowed roles
      const hasRoleAccess = config.allowed_roles?.includes(userRole.role);
      
      // Check if user is in the exceptions list
      const isException = config.exceptions?.includes(employee.id);

      console.log('🔐 Prod approval access check:', {
        userRole: userRole.role,
        employeeId: employee.id,
        allowedRoles: config.allowed_roles,
        exceptions: config.exceptions,
        hasRoleAccess,
        isException,
        finalAccess: hasRoleAccess || isException
      });

      return hasRoleAccess || isException;
    } catch (error) {
      console.error('Error checking approval access:', error);
      return false;
    }
  };

  // Check approval access when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkApprovalAccess().then(setCanShowApprovalButtons);
    }
  }, [isOpen]);

  // Update currentLink when googleDriveLink prop changes
  useEffect(() => {
    console.log('🔗 GoogleDriveLinkDialog - googleDriveLink changed:', {
      googleDriveLink,
      socialMediaPlanId,
      currentLink,
      effectiveLinkUrl: googleDriveLink || 'default-link'
    });
    setCurrentLink(googleDriveLink);
  }, [googleDriveLink, socialMediaPlanId]);

  // Auto-save functionality with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentLink !== googleDriveLink) {
        onSave(currentLink);
        if (currentLink && currentLink.trim() !== '') {
          toast.success('Google Drive Link saved automatically');
        } else if (googleDriveLink && (!currentLink || currentLink.trim() === '')) {
          toast.success('Google Drive Link removed automatically');
        }
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [currentLink, googleDriveLink, onSave]);

  const openLink = () => {
    if (currentLink) {
      window.open(currentLink, '_blank');
    }
  };

  // POINT 1: Handle close with production status update
  const handleClose = async () => {
    // If link is filled, set production status to "Need Review" and record completion date
    if (currentLink && currentLink.trim() !== '') {
      try {
        const {
          supabase
        } = await import('@/integrations/supabase/client');
        const completionDate = new Date().toISOString();
        const {
          error
        } = await supabase.from('social_media_plans').update({
          production_status: 'Need Review',
          production_completion_date: completionDate
        }).eq('id', socialMediaPlanId);
        if (error) {
          console.error('Error updating production status:', error);
          toast.error('Failed to update production status');
        } else {
          console.log('Production status updated to Need Review with completion date');
        }
      } catch (error) {
        console.error('Error in handleClose:', error);
      }
    }
    onClose();
  };

  // POINT 2 & 3: Handle revision with production status update and clear completion date
  const handleRevision = async () => {
    if (!canShowApprovalButtons) {
      toast.error('You do not have permission to request revision');
      return;
    }

    if (onRevision) {
      onRevision();
    }
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('social_media_plans')
        .update({
          production_status: 'Request Revision',
          production_completion_date: null, // POINT 2: Clear completion date when requesting revision
          production_approved: false, // Reset approval status
          production_approved_date: null // Clear approved date
        })
        .eq('id', socialMediaPlanId);
        
      if (error) {
        console.error('Error updating production status for revision:', error);
        toast.error('Failed to update production status');
      } else {
        toast.success('Production status updated to Request Revision');
        console.log('Production completion date cleared and status set to Request Revision');
      }
    } catch (error) {
      console.error('Error in handleRevision:', error);
      toast.error('Failed to update production status');
    }

    onClose();
  };

  // POINT 1 & 3: Handle approve with production status update and set approved date
  const handleApprove = async () => {
    if (!canShowApprovalButtons) {
      toast.error('You do not have permission to approve content');
      return;
    }

    if (onApprove) {
      onApprove();
    }
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const approvedDate = new Date().toISOString();
      const { error } = await supabase
        .from('social_media_plans')
        .update({
          production_status: 'Approved',
          production_approved: true,
          production_approved_date: approvedDate // POINT 1: Set approved date when approved with real-time timestamp
        })
        .eq('id', socialMediaPlanId);
        
      if (error) {
        console.error('Error updating production status for approval:', error);
        toast.error('Failed to update production status');
      } else {
        toast.success('Production approved successfully');
        console.log('Production status set to Approved, production_approved turned ON, and approved date recorded at:', approvedDate);
      }
    } catch (error) {
      console.error('Error in handleApprove:', error);
      toast.error('Failed to approve production');
    }

    onClose();
  };

  const isFolderLink = (url: string) => {
    return url.includes('drive.google.com/drive/folders/');
  };
  const isFileLink = (url: string) => {
    return url.includes('drive.google.com/file/d/');
  };
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
      const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return null;
    }
    return url;
  };
  const isYouTubeLink = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };
  const getStatusBadge = () => {
    const statusConfig = {
      draft: {
        label: 'Draft',
        variant: 'secondary' as const,
        className: 'bg-gray-100 text-gray-700'
      },
      approved: {
        label: 'Approved',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-700'
      },
      revision: {
        label: 'Needs Revision',
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-700'
      },
      completed: {
        label: 'Completed',
        variant: 'default' as const,
        className: 'bg-blue-100 text-blue-700'
      }
    };
    const config = statusConfig[status];
    return <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>;
  };
  const formatDisplayDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col bg-white border-0 shadow-2xl rounded-2xl">
        <div className="flex flex-1 gap-6 min-h-0 py-4">
          {/* Left side - Preview area with full width/height */}
          <div className="flex-[2] flex flex-col min-h-0">
            {/* Preview area - Always show if there's a link */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-gray-900">Preview</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-gray-600" />
                      <span className="text-gray-700 font-medium">Title:</span>
                      <span className="text-gray-800 truncate max-w-[200px]">{contentTitle || 'No title'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-gray-600" />
                      <span className="text-gray-700 font-medium">Type:</span>
                      <span className="text-gray-800">{contentType || 'No type'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-600" />
                      <span className="text-gray-700 font-medium">Date:</span>
                      <span className="text-gray-800">{postDate ? formatDisplayDate(postDate) : 'No date'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-white min-h-0 p-4 flex items-center justify-center">
                {currentLink ? <>
                    {isFolderLink(currentLink) ? <div className="w-full h-full">
                        <GoogleDriveFolderCarousel folderUrl={currentLink} />
                      </div> : isYouTubeLink(currentLink) ? <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center p-8">
                          <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ExternalLink className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-700 mb-4 max-w-sm">
                            YouTube links cannot be previewed here due to security restrictions.
                          </p>
                          <Button onClick={openLink} variant="outline" size="sm" className="rounded-lg">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open YouTube Link
                          </Button>
                        </div>
                      </div> : isFileLink(currentLink) ? <div className="w-full h-full">
                        <iframe src={getEmbedUrl(currentLink)} className="w-full h-full border-0 rounded-lg" title="Google Drive Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" loading="lazy" />
                      </div> : <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center p-8">
                          <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LinkIcon className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-700 mb-4 max-w-sm">
                            Preview not available for this link type
                          </p>
                        </div>
                      </div>}
                  </> : <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8">
                      <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LinkIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-700 mb-4 max-w-sm">
                        Enter a Google Drive link to see preview
                      </p>
                    </div>
                  </div>}
              </div>
            </div>
          </div>

          {/* Right side - Comments Panel (larger width) */}
          <div className="w-[540px] min-w-[540px] border-l border-gray-200 flex flex-col min-h-0">
            {/* Comments panel - flexible height, no horizontal scroll */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <OptimizedCommentPanel 
                socialMediaPlanId={socialMediaPlanId} 
                linkUrl={googleDriveLink || 'default-link'}
              />
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom with horizontally aligned controls */}
        <div className="px-3 py-2 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="flex items-center justify-between gap-3">
            {/* Left side - Link input section with content information */}
            <div className="flex-1 max-w-2xl">

              <div className="space-y-1">
                
                <div className="flex gap-2">
                  <Input value={currentLink} onChange={e => setCurrentLink(e.target.value)} placeholder="Paste Google Drive link here..." className="flex-1 h-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg" />
                  <Button variant="outline" onClick={openLink} disabled={!currentLink} className="h-9 px-3 border-gray-200 hover:bg-gray-50 rounded-lg">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose} className="h-9 px-4 border-gray-200 hover:bg-gray-50 rounded-lg">
                Close
              </Button>
              
              {/* Show approval buttons only if user has access based on configuration */}
              {canShowApprovalButtons && (
                <>
                  <Button 
                    onClick={handleApprove} 
                    disabled={status === 'approved'} 
                    className="h-9 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium px-4 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve Content
                  </Button>
                  
                  <Button 
                    onClick={handleRevision} 
                    variant="outline" 
                    className="h-9 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 rounded-lg font-medium px-4"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Request Revision
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};

export default GoogleDriveLinkDialog;
