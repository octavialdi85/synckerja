import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useKOLContentPosts, KOLContentPost } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';

interface EditContentPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPost: KOLContentPost | null;
}

export const EditContentPostModal: React.FC<EditContentPostModalProps> = ({
  open,
  onOpenChange,
  contentPost
}) => {
  const { updateContentPost, isUpdating } = useKOLContentPosts();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    platform: '',
    content_type: '',
    post_url: '',
    post_date: '',
    caption: '',
    hashtags: '',
    mentions: '',
    status: 'draft' as 'draft' | 'posted' | 'archived'
  });

  useEffect(() => {
    if (contentPost && open) {
      setFormData({
        platform: contentPost.platform || '',
        content_type: contentPost.content_type || '',
        post_url: contentPost.post_url || '',
        post_date: contentPost.post_date ? new Date(contentPost.post_date).toISOString().slice(0, 16) : '',
        caption: contentPost.caption || '',
        hashtags: contentPost.hashtags?.join(', ') || '',
        mentions: contentPost.mentions?.join(', ') || '',
        status: contentPost.status || 'draft'
      });
    }
  }, [contentPost, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contentPost) return;

    try {
      const updateData = {
        id: contentPost.id,
        platform: formData.platform,
        content_type: formData.content_type,
        post_url: formData.post_url || undefined,
        post_date: formData.post_date || undefined,
        caption: formData.caption || undefined,
        hashtags: formData.hashtags ? formData.hashtags.split(',').map(tag => tag.trim()) : undefined,
        mentions: formData.mentions ? formData.mentions.split(',').map(mention => mention.trim()) : undefined,
        status: formData.status
      };

      await updateContentPost(updateData);
      
      toast({
        title: "Success",
        description: "Content post updated successfully",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating content post:', error);
      toast({
        title: "Error",
        description: "Failed to update content post",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Content Post</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={formData.platform} onValueChange={(value) => handleInputChange('platform', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content_type">Content Type</Label>
              <Select value={formData.content_type} onValueChange={(value) => handleInputChange('content_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="post_url">Post URL (Optional)</Label>
            <Input 
              id="post_url"
              value={formData.post_url}
              onChange={(e) => handleInputChange('post_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="post_date">Post Date (Optional)</Label>
            <Input 
              id="post_date"
              type="datetime-local"
              value={formData.post_date}
              onChange={(e) => handleInputChange('post_date', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="caption">Caption (Optional)</Label>
            <Textarea 
              id="caption"
              value={formData.caption}
              onChange={(e) => handleInputChange('caption', e.target.value)}
              placeholder="Post caption..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hashtags">Hashtags (Optional)</Label>
              <Input 
                id="hashtags"
                value={formData.hashtags}
                onChange={(e) => handleInputChange('hashtags', e.target.value)}
                placeholder="#tag1, #tag2, #tag3"
              />
            </div>

            <div>
              <Label htmlFor="mentions">Mentions (Optional)</Label>
              <Input 
                id="mentions"
                value={formData.mentions}
                onChange={(e) => handleInputChange('mentions', e.target.value)}
                placeholder="@user1, @user2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: 'draft' | 'posted' | 'archived') => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Content Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
