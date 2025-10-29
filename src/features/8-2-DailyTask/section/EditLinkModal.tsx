import React, { useState, useEffect } from 'react';
import { Link, X } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { useToast } from '@/features/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StepLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  created_at: string;
}

interface EditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: StepLink | null;
  onSuccess?: () => void;
}

export const EditLinkModal: React.FC<EditLinkModalProps> = ({
  isOpen,
  onClose,
  link,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Populate form when link changes
  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setDescription(link.description || '');
    }
  }, [link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!link) return;
    
    if (!title.trim() || !url.trim()) {
      toast({
        title: 'Error',
        description: 'Title and URL are required',
        variant: 'destructive',
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('task_step_links')
        .update({
          title: title.trim(),
          url: url.trim(),
          description: description.trim() || null,
        })
        .eq('id', link.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Link updated successfully',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTitle('');
      setUrl('');
      setDescription('');
      onClose();
    }
  };

  if (!link) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Edit Link
          </DialogTitle>
          <DialogDescription>
            Update the link information for this step.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter link title"
              disabled={isLoading}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">URL *</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
              disabled={isLoading}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter link description"
              disabled={isLoading}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title.trim() || !url.trim()}
            >
              {isLoading ? 'Updating...' : 'Update Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
