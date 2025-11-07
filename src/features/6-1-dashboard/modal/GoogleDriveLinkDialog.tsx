import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Badge } from '@/features/ui/badge';
import { ExternalLink, Check, RotateCcw, LinkIcon, Calendar, FileText, Tag, Lock } from 'lucide-react';
import { OptimizedCommentPanel } from './OptimizedCommentPanel';
import GoogleDriveFolderCarousel from './GoogleDriveFolderCarousel';
import GoogleDriveAuthButton from '@/components/6-1-dashboard/GoogleDriveAuthButton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { devLog } from '@/config/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

// Helper function to get embed URL (defined before component)
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

// Component to handle Google Drive file preview with CSP error fallback
const GoogleDriveFilePreview: React.FC<{ link: string }> = ({ link }) => {
  const [iframeError, setIframeError] = useState(false);
  const embedUrl = getEmbedUrl(link);

  const handleIframeError = () => {
    devLog.debug('⚠️ Google Drive iframe failed to load (CSP error), showing fallback');
    setIframeError(true);
  };

  if (iframeError || !embedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center p-8">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-sm text-gray-700 mb-4 max-w-sm">
            Google Drive preview is not available due to security restrictions.
          </p>
          <Button 
            onClick={() => window.open(link, '_blank')} 
            variant="outline" 
            size="sm" 
            className="rounded-lg"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Google Drive
          </Button>
        </div>
      </div>
    );
  }

  // Use useEffect to detect CSP errors immediately
  // Note: CSP errors are browser security violations that cannot be suppressed
  // They are expected from Google Drive and don't affect functionality
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // If iframe hasn't loaded after 1 second, likely CSP blocked it
      // Check for CSP errors by trying to access iframe
      try {
        const iframe = document.querySelector(`iframe[data-embed-url="${embedUrl}"]`) as HTMLIFrameElement;
        if (iframe) {
          // Try to access contentWindow - will throw if CSP blocked
          try {
            iframe.contentWindow?.location; // This will throw if CSP blocked
          } catch (e) {
            // CSP error detected - show fallback UI silently
            // Don't log as this is expected behavior from Google Drive
            handleIframeError();
          }
        }
      } catch (e) {
        // CSP error detected - show fallback UI silently
        handleIframeError();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [embedUrl]);

  return (
    <div className="w-full h-full relative">
      <iframe 
        src={embedUrl} 
        data-embed-url={embedUrl}
        className="w-full h-full border-0 rounded-lg" 
        title="Google Drive Preview" 
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups" 
        loading="lazy"
        onError={handleIframeError}
        onLoad={() => {
          // Iframe loaded successfully
          devLog.debug('✅ Google Drive iframe loaded successfully');
        }}
      />
      {/* Error overlay - will show if CSP blocks */}
      {iframeError && (
        <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center z-10">
          <div className="text-center p-8">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-700 mb-4 max-w-sm">
              Google Drive preview is not available due to security restrictions.
            </p>
            <Button 
              onClick={() => window.open(link, '_blank')} 
              variant="outline" 
              size="sm" 
              className="rounded-lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Drive
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  productionApproved?: boolean; // Lock input field if production is approved
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
  postDate,
  productionApproved = false
}) => {
  const [currentLink, setCurrentLink] = useState(googleDriveLink);
  const [canShowApprovalButtons, setCanShowApprovalButtons] = useState(false);
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  
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
        devLog.debug('No prod_approved configuration found, falling back to admin access');
        return userRole.role === 'owner' || userRole.role === 'admin';
      }

      // Check if user's role is in the allowed roles
      const hasRoleAccess = config.allowed_roles?.includes(userRole.role);
      
      // Check if user is in the exceptions list
      const isException = config.exceptions?.includes(employee.id);

      devLog.debug('🔐 Prod approval access check:', {
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

  // Track previous link to only log on actual changes
  const prevLinkRef = useRef<string | undefined>(undefined);
  const isInitialMount = useRef(true);
  
  // Update currentLink when googleDriveLink prop changes
  useEffect(() => {
    // Skip log on initial mount (prevLinkRef is undefined)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevLinkRef.current = googleDriveLink;
      setCurrentLink(googleDriveLink);
      return;
    }
    
    // Only log if link actually changed (not initial mount)
    if (prevLinkRef.current !== googleDriveLink) {
      devLog.debug('🔗 GoogleDriveLinkDialog - googleDriveLink changed:', {
        previousLink: prevLinkRef.current,
        newLink: googleDriveLink,
        socialMediaPlanId
      });
      prevLinkRef.current = googleDriveLink;
    }
    setCurrentLink(googleDriveLink);
  }, [googleDriveLink, socialMediaPlanId]);

  // Auto-save functionality with debouncing (disabled when production is approved)
  useEffect(() => {
    // Don't auto-save if production is approved (field is locked)
    if (productionApproved) {
      return;
    }

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
  }, [currentLink, googleDriveLink, onSave, productionApproved]);

  const openLink = () => {
    if (currentLink) {
      window.open(currentLink, '_blank');
    }
  };

  // POINT 1: Handle close with production status update
  const handleClose = async () => {
    // Don't save if production is approved (field is locked)
    if (productionApproved) {
      onClose();
      return;
    }

    // Save any pending changes before closing - this ensures all updates go through proper mutation
    if (currentLink !== googleDriveLink) {
      // Call onSave to ensure changes are saved through proper mutation (which updates cache)
      // onSave will trigger handleFieldChange which handles clearing production_completion_date
      onSave(currentLink);
    } else if (currentLink && currentLink.trim() !== '') {
      // If link is filled and unchanged, ensure production status is updated
      try {
        const {
          supabase
        } = await import('@/integrations/supabase/client');
        const completionDate = new Date().toISOString();
        const {
          data,
          error
        } = await supabase.from('social_media_plans').update({
          production_status: 'Need Review',
          production_completion_date: completionDate
        }).eq('id', socialMediaPlanId)
        .select()
        .single();
        
        if (error) {
          console.error('Error updating production status:', error);
          toast.error('Failed to update production status');
        } else {
          devLog.debug('Production status updated to Need Review with completion date');
          // Update cache with new data using correct query key
          if (organizationId && data) {
            queryClient.setQueryData(
              ['social-media-plans', organizationId],
              (oldData: any) => {
                if (!oldData) return oldData;
                return oldData.map((plan: any) => 
                  plan.id === socialMediaPlanId ? { ...plan, ...data } : plan
                );
              }
            );
            // Also invalidate to ensure all related queries refresh
            queryClient.invalidateQueries({ queryKey: ['social-media-plans', organizationId] });
          }
        }
      } catch (error) {
        console.error('Error in handleClose:', error);
      }
    } else if (googleDriveLink && (!currentLink || currentLink.trim() === '')) {
      // If link was removed (had link before, but now empty), clear production_completion_date
      // This should be handled by onSave, but we do it here as backup
      try {
        const {
          supabase
        } = await import('@/integrations/supabase/client');
        const {
          data,
          error
        } = await supabase.from('social_media_plans').update({
          production_completion_date: null
        }).eq('id', socialMediaPlanId)
        .select()
        .single();
        
        if (error) {
          console.error('Error clearing production completion date:', error);
        } else {
          devLog.debug('Production completion date cleared when Google Drive link was removed');
          // Update cache with new data using correct query key
          if (organizationId && data) {
            queryClient.setQueryData(
              ['social-media-plans', organizationId],
              (oldData: any) => {
                if (!oldData) return oldData;
                return oldData.map((plan: any) => 
                  plan.id === socialMediaPlanId ? { ...plan, production_completion_date: null } : plan
                );
              }
            );
            // Also invalidate to ensure all related queries refresh
            queryClient.invalidateQueries({ queryKey: ['social-media-plans', organizationId] });
          } else {
            // Fallback: invalidate all social-media-plans queries
            queryClient.invalidateQueries({ queryKey: ['social-media-plans'] });
          }
        }
      } catch (error) {
        console.error('Error in handleClose (clearing date):', error);
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
        devLog.debug('Production completion date cleared and status set to Request Revision');
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
        devLog.debug('Production status set to Approved, production_approved turned ON, and approved date recorded at:', approvedDate);
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
        <DialogHeader>
          <DialogTitle className="sr-only">Google Drive Link</DialogTitle>
          <DialogDescription className="sr-only">Manage Google Drive link and comments for this content plan</DialogDescription>
        </DialogHeader>
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
                      </div> : isFileLink(currentLink) ? <GoogleDriveFilePreview link={currentLink} /> : <div className="w-full h-full flex items-center justify-center bg-gray-50">
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
                {productionApproved && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <Lock className="h-3 w-3" />
                    <span>Link is locked because production is approved. Set production approved to false to edit.</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input 
                      value={currentLink} 
                      onChange={e => setCurrentLink(e.target.value)} 
                      placeholder="Paste Google Drive link here..." 
                      className={`flex-1 h-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg ${productionApproved ? 'bg-gray-50 cursor-not-allowed pr-8' : ''}`}
                      disabled={productionApproved}
                      readOnly={productionApproved}
                    />
                    {productionApproved && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    )}
                  </div>
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
