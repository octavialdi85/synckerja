import React, { useMemo, useState } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { BlockerDetailsModal } from './BlockerDetailsModal';
import { BlockerResolutionModal } from './BlockerResolutionModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { Trash2, Edit } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/alert-dialog';

export const BlockersPanel = () => {
  const { filteredBlockers: blockers, loading, refreshReport } = useDailyTaskReport() as any;
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'list' | 'resolved'>('list');
  const [resolutionFor, setResolutionFor] = useState<any | null>(null);
  const [locResolved, setLocResolved] = useState<Record<string, boolean>>({});
  const [deletingBlocker, setDeletingBlocker] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locDeleted, setLocDeleted] = useState<Record<string, boolean>>({});
  const [editingBlocker, setEditingBlocker] = useState<any | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleResolve = async (blocker: any) => {
    // Open resolution modal to get resolution details
    // Modal will handle inserting to task_step_history_blocker_resolved
    setResolutionFor(blocker);
  };

  const handleResolutionComplete = async () => {
    if (!resolutionFor) return;
    
    try {
      // Update is_resolved flag in task_step_history
      // NOTE: This is called AFTER resolution details are inserted to task_step_history_blocker_resolved
      const { error } = await supabase
        .from('task_step_history')
        .update({ is_resolved: true } as any)
        .eq('id', resolutionFor.id);
      
      if (error) {
        toast({
          title: 'Error',
          description: `Failed to mark blocker as resolved: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }
      
      // Verify that resolution was actually saved to task_step_history_blocker_resolved
      const { data: resolutionCheck, error: checkError } = await (supabase as any)
        .rpc('get_blocker_resolutions', {
          p_task_step_history_ids: [resolutionFor.id]
        });
      
      if (!checkError && (!resolutionCheck || resolutionCheck.length === 0)) {
        toast({
          title: 'Warning',
          description: 'Blocker marked as resolved but resolution details may not have been saved',
          variant: 'destructive',
        });
      }

      // Update local state
      setLocResolved(prev => ({ ...prev, [resolutionFor.id]: true }));
      
      // Close modal
      setResolutionFor(null);
      
      toast({
        title: 'Success',
        description: 'Blocker marked as resolved',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while updating blocker status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (blocker: any) => {
    setDeletingBlocker(blocker);
  };

  const confirmDelete = async () => {
    if (!deletingBlocker) return;

    setIsDeleting(true);
    try {
      // Delete the blocker from task_step_history
      const { error } = await supabase
        .from('task_step_history')
        .delete()
        .eq('id', deletingBlocker.id);

      if (error) {
        toast({
          title: 'Error',
          description: `Failed to delete blocker: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      // If blocker was resolved, also delete from task_step_history_blocker_resolved
      if (deletingBlocker.is_resolved) {
        const { error: resError } = await supabase
          .from('task_step_history_blocker_resolved')
          .delete()
          .eq('task_step_history_id', deletingBlocker.id);

        if (resError) {
          // Resolution entry delete failed (non-blocking)
        }
      }

      // Mark as deleted locally
      setLocDeleted(prev => ({ ...prev, [deletingBlocker.id]: true }));
      setDeletingBlocker(null);

      toast({
        title: 'Success',
        description: 'Blocker deleted successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (blocker: any) => {
    setEditingBlocker(blocker);
    setEditDescription(blocker.description || '');
  };

  const saveEdit = async () => {
    if (!editingBlocker || !editDescription.trim()) return;

    setIsSaving(true);
    try {
      // Update blocker description in task_step_history
      const { error } = await supabase
        .from('task_step_history')
        .update({ description: editDescription.trim() })
        .eq('id', editingBlocker.id);

      if (error) {
        toast({
          title: 'Error',
          description: `Failed to update blocker: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      // Update in local state by refreshing
      setEditingBlocker(null);
      setEditDescription('');

      toast({
        title: 'Success',
        description: 'Blocker updated successfully',
      });

      if (refreshReport) await refreshReport();
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    (blockers || []).forEach((b: any) => {
      const task = b.taskTitle || '-';
      const step = b.stepTitle || '-';
      map[task] = map[task] || {};
      map[task][step] = map[task][step] || [];
      map[task][step].push(b);
    });
    return map;
  }, [blockers]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium">Blockers</div>
      <div className="p-3 space-y-2 seamless-scroll max-h-[calc(100vh-300px)] overflow-auto">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : (blockers || []).length === 0 ? (
          <div className="text-sm text-gray-500">No blockers reported.</div>
        ) : (
          Object.entries(grouped).map(([taskTitle, steps]) => (
            <div key={taskTitle} className="border border-gray-200 rounded-md bg-gray-50 p-2 mb-2">
              <div className="text-sm font-semibold text-gray-900 mb-1">Task: {taskTitle}</div>
              <div className="space-y-2">
                {Object.entries(steps).map(([stepTitle, items]) => (
                  <div key={taskTitle + stepTitle} className="border border-gray-200 rounded-md bg-white p-2 ml-1">
                    <div className="text-sm font-medium text-gray-800 mb-1">Step: {stepTitle}</div>
                    <div className="space-y-1 ml-1">
                      {(items as any[]).filter((b: any) => !locDeleted[b.id]).map((b: any) => (
                        <div key={b.id} className="p-2 border border-red-200 bg-red-50 rounded text-sm">
                          {b.subStepTitle && (
                            <div className="text-red-700 font-semibold mb-0.5">Sub-step: {b.subStepTitle}</div>
                          )}
                          <div className="text-red-700 font-medium">{b.blocker_type || 'Blocker'}</div>
                          {b.description && <div className="text-red-800">{b.description}</div>}
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-red-600">{new Date(b.created_at).toLocaleString()}</div>
                            <div className="flex items-center gap-2">
                              {(b.is_resolved || locResolved[b.id]) && (
                                <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">Resolved</span>
                              )}
                              <button
                                className={`text-xs rounded px-2 py-1 border ${(b.is_resolved || locResolved[b.id]) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-green-600 text-white border-green-700 hover:bg-green-700'}`}
                                disabled={!!(b.is_resolved || locResolved[b.id])}
                                onClick={() => handleResolve(b)}
                              >
                                Resolve
                              </button>
                              <button
                                className="p-1.5 rounded border bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                                onClick={() => handleEdit(b)}
                                title="Edit blocker"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded border bg-red-600 text-white border-red-700 hover:bg-red-700"
                                onClick={() => handleDelete(b)}
                                title="Delete blocker"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <BlockerDetailsModal open={open} onOpenChange={setOpen} items={blockers || []} initialTab={initialTab} />
      <BlockerResolutionModal
        open={!!resolutionFor}
        onOpenChange={(o) => {
          if (!o) {
            setResolutionFor(null);
          }
        }}
        blocker={resolutionFor ? {
          id: resolutionFor.id,
          blocker_type: resolutionFor.blocker_type,
          description: resolutionFor.description,
          created_at: resolutionFor.created_at,
          taskTitle: resolutionFor.taskTitle,
          stepTitle: resolutionFor.stepTitle,
          subStepTitle: resolutionFor.subStepTitle,
        } : null}
        onResolutionComplete={handleResolutionComplete}
      />

      {/* Edit Blocker Modal */}
      {editingBlocker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Blocker</h3>
            
            <div className="space-y-3 mb-4">
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Task: <span className="font-medium text-gray-900">{editingBlocker.taskTitle}</span></div>
                <div className="text-xs text-gray-600 mb-1">Step: <span className="font-medium text-gray-900">{editingBlocker.stepTitle}</span></div>
                {editingBlocker.subStepTitle && (
                  <div className="text-xs text-gray-600 mb-1">Sub-step: <span className="font-medium text-gray-900">{editingBlocker.subStepTitle}</span></div>
                )}
                <div className="text-xs text-gray-600 mt-2">Type: <span className="font-medium text-gray-900">{editingBlocker.blocker_type}</span></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blocker Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter blocker description..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingBlocker(null);
                  setEditDescription('');
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editDescription.trim() || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBlocker} onOpenChange={(open) => !open && setDeletingBlocker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blocker</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingBlocker && (
                <div className="space-y-2">
                  <p>Are you sure you want to delete this blocker?</p>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                    <div className="font-medium text-gray-900 mb-1">
                      {deletingBlocker.blocker_type || 'Blocker'}
                    </div>
                    <div className="text-gray-700">{deletingBlocker.description}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Task: {deletingBlocker.taskTitle} • Step: {deletingBlocker.stepTitle}
                      {deletingBlocker.subStepTitle && ` • Sub-step: ${deletingBlocker.subStepTitle}`}
                    </div>
                  </div>
                  <p className="text-red-600 font-medium">This action cannot be undone.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Blocker'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


