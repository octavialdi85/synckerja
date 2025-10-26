
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { ScrollArea } from '@/features/ui/scroll-area';
import { Save, X, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useSocialMediaLinks } from '@/features/6-1-dashboard/hook/useSocialMediaLinks';
import { useSocialMediaNames } from '../hook/useSocialMediaNames';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { CreateSocialMediaLinkData } from '@/types/social-media-links';

interface SocialMediaLinksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  socialMediaPlanId: string;
  planTitle?: string;
}

interface SocialMediaLinkForm {
  id: string;
  platform: string;
  social_media_name: string;
  url: string;
  isNew?: boolean;
}

const PLATFORM_OPTIONS = [
  'Instagram',
  'TikTok', 
  'YouTube',
  'Facebook',
  'LinkedIn',
  'Twitter',
  'Shopee',
  'Tokopedia',
  'Other'
];

const SocialMediaLinksDialog: React.FC<SocialMediaLinksDialogProps> = ({
  isOpen,
  onClose,
  socialMediaPlanId,
  planTitle
}) => {
  const { organizationId } = useCurrentOrg();
  const [formLinks, setFormLinks] = useState<SocialMediaLinkForm[]>([]);
  const { 
    links, 
    isLoading, 
    createLink, 
    updateLink, 
    deleteLink, 
    createMultipleLinks,
    isCreating,
    isUpdating,
    isDeleting 
  } = useSocialMediaLinks(socialMediaPlanId);

  const { socialMediaNames, getNamesByPlatform } = useSocialMediaNames(organizationId);

  // Initialize form data when dialog opens or links change
  useEffect(() => {
    if (isOpen) {
      if (links.length > 0) {
        // Convert existing links to form format
        const existingLinks: SocialMediaLinkForm[] = links.map(link => ({
          id: link.id,
          platform: link.platform,
          social_media_name: link.social_media_name,
          url: link.url,
          isNew: false
        }));
        setFormLinks(existingLinks);
      } else {
        // Start with one empty link
        setFormLinks([{
          id: `new-${Date.now()}`,
          platform: '',
          social_media_name: '',
          url: '',
          isNew: true
        }]);
      }
    }
  }, [isOpen, links]);

  const handleAddLink = () => {
    setFormLinks(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        platform: '',
        social_media_name: '',
        url: '',
        isNew: true
      }
    ]);
  };

  const handleRemoveLink = async (id: string, isNew: boolean = false) => {
    if (isNew) {
      // Just remove from form if it's a new link
      setFormLinks(prev => prev.filter(link => link.id !== id));
    } else {
      // Delete from database if it's an existing link
      await deleteLink(id);
      // Remove from form as well
      setFormLinks(prev => prev.filter(link => link.id !== id));
    }
  };

  const handleFieldChange = (id: string, field: keyof SocialMediaLinkForm, value: string) => {
    setFormLinks(prev => prev.map(link => {
      if (link.id === id) {
        const updatedLink = { ...link, [field]: value };
        
        // If platform changed, reset social_media_name
        if (field === 'platform') {
          updatedLink.social_media_name = '';
        }
        
        return updatedLink;
      }
      return link;
    }));
  };

  const handleOpenSocialLink = (url: string) => {
    if (url && typeof url === 'string' && url !== '' && (url.startsWith('http://') || url.startsWith('https://'))) {
      window.open(url, '_blank');
    }
  };

  const handleSave = async () => {
    try {
      // Validate all links
      const validLinks = formLinks.filter(link => 
        link.platform && link.platform.trim() !== '' && 
        link.social_media_name && link.social_media_name.trim() !== '' &&
        link.url && link.url.trim() !== '' &&
        (link.url.startsWith('http://') || link.url.startsWith('https://') || link.url.includes('.'))
      );

      if (validLinks.length === 0) {
        return;
      }

      // Separate new links and existing links to update
      const newLinks: CreateSocialMediaLinkData[] = [];
      const updatedLinks: { id: string; updates: any }[] = [];

      for (const link of validLinks) {
        if (link.isNew) {
          newLinks.push({
            social_media_plan_id: socialMediaPlanId,
            platform: link.platform,
            social_media_name: link.social_media_name,
            url: link.url
          });
        } else {
          // Check if the existing link has changes
          const originalLink = links.find(l => l.id === link.id);
          if (originalLink && (
            originalLink.platform !== link.platform ||
            originalLink.social_media_name !== link.social_media_name ||
            originalLink.url !== link.url
          )) {
            updatedLinks.push({
              id: link.id,
              updates: {
                platform: link.platform,
                social_media_name: link.social_media_name,
                url: link.url
              }
            });
          }
        }
      }

      // Execute mutations
      if (newLinks.length > 0) {
        await createMultipleLinks(newLinks);
      }

      for (const updatedLink of updatedLinks) {
        await updateLink(updatedLink);
      }

      onClose();
    } catch (error) {
      console.error('Error saving social media links:', error);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const hasValidLinks = formLinks.some(link => 
    link.platform && link.platform.trim() !== '' && 
    link.social_media_name && link.social_media_name.trim() !== '' &&
    link.url && link.url.trim() !== ''
  );

  const isSaving = isCreating || isUpdating || isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only close when user explicitly closes, not when interacting with select
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="w-[800px] h-[600px] max-w-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Social Media Links</span>
          </DialogTitle>
          {planTitle && (
            <p className="text-sm text-gray-600 mt-1">
              Content: {planTitle}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium">Add social media links</Label>
            <Button
              onClick={handleAddLink}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={isSaving}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Loading...</p>
              </div>
            ) : (
              <div className="space-y-4 pr-2">
                {formLinks.map((link, index) => (
                  <div key={link.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-gray-600">Platform</Label>
                        <Select
                          value={link.platform}
                          onValueChange={(value) => {
                            // Prevent event bubbling that might close dialog
                            handleFieldChange(link.id, 'platform', value);
                          }}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORM_OPTIONS.map((platform) => (
                              <SelectItem key={platform} value={platform}>
                                {platform}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-gray-600">Social Media Name</Label>
                        {link.platform ? (
                          <Select
                            value={link.social_media_name}
                            onValueChange={(value) => {
                              // Prevent event bubbling that might close dialog
                              handleFieldChange(link.id, 'social_media_name', value);
                            }}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select account name" />
                            </SelectTrigger>
                            <SelectContent>
                              {getNamesByPlatform(link.platform).map((name) => (
                                <SelectItem key={name.id} value={name.name}>
                                  {name.name}
                                </SelectItem>
                              ))}
                              {getNamesByPlatform(link.platform).length === 0 && (
                                <SelectItem value="no-names-available" disabled>
                                  No names available for {link.platform}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value=""
                            placeholder="Select platform first"
                            className="h-10"
                            disabled
                          />
                        )}
                      </div>
                      
                      <div className="col-span-5 space-y-1">
                        <Label className="text-xs text-gray-600">URL</Label>
                        <div className="relative">
                          <Input
                            value={link.url}
                            onChange={(e) => handleFieldChange(link.id, 'url', e.target.value)}
                            placeholder="https://..."
                            className="h-10 pr-8"
                            disabled={isSaving}
                          />
                          {link.url && (link.url.startsWith('http://') || link.url.startsWith('https://')) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                              onClick={() => handleOpenSocialLink(link.url)}
                              title="Open link"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <Button
                          onClick={() => handleRemoveLink(link.id, link.isNew)}
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={isSaving}
                          title="Delete link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {formLinks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No social media links added yet.</p>
                    <Button
                      onClick={handleAddLink}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex items-center gap-2"
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex items-center gap-2"
            disabled={!hasValidLinks || isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Links'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialMediaLinksDialog;
