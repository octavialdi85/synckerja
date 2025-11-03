import React, { useState, useEffect } from 'react';
import { Link, ExternalLink, Trash2, Edit } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { useToast } from '@/features/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AddLinkModal } from './AddLinkModal';
import { EditLinkModal } from './EditLinkModal';

interface StepLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  created_at: string;
}

interface StepLinksProps {
  taskStepId: string;
  isExpanded: boolean;
  onLinksChange?: () => void;
}

export const StepLinks: React.FC<StepLinksProps> = ({ taskStepId, isExpanded, onLinksChange }) => {
  const [links, setLinks] = useState<StepLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<StepLink | null>(null);
  const { toast } = useToast();

  const fetchLinks = async () => {
    if (!isExpanded) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('task_step_links')
        .select('*')
        .eq('task_step_id', taskStepId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
      
      // Notify parent component about links change
      if (onLinksChange) {
        onLinksChange();
      }
    } catch (error: any) {
      console.error('Error fetching links:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch links',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [taskStepId, isExpanded]);

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('task_step_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Link deleted successfully',
      });

      // Refresh links and notify parent
      await fetchLinks();
    } catch (error: any) {
      console.error('Error deleting link:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete link',
        variant: 'destructive',
      });
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEditLink = (link: StepLink) => {
    setEditingLink(link);
  };

  const handleUpdateLink = async () => {
    await fetchLinks();
    setEditingLink(null);
  };

  if (!isExpanded) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            Links ({links.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Link className="w-3 h-3 mr-1" />
          Add Link
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-gray-500">Loading links...</div>
      ) : links.length === 0 ? (
        <div className="text-xs text-gray-400 italic">No links added yet</div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {link.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openLink(link.url)}
                    className="h-5 w-5 p-0 text-gray-400 hover:text-blue-600"
                    title="Open link"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
                {link.description && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {link.description}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(link.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditLink(link)}
                  className="h-5 w-5 p-0 text-gray-400 hover:text-blue-600"
                  title="Edit link"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteLink(link.id)}
                  className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
                  title="Delete link"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddLinkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        taskStepId={taskStepId}
        onSuccess={fetchLinks}
      />

      <EditLinkModal
        isOpen={!!editingLink}
        onClose={() => setEditingLink(null)}
        link={editingLink}
        onSuccess={handleUpdateLink}
      />
    </div>
  );
};
