import React, { useMemo, useState, useEffect } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { BlockerDetailsModal } from './BlockerDetailsModal';
import { CheckCircle, ClipboardList, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useToast } from '@/features/ui/use-toast';
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

interface ResolvedBlockerRow {
  id: string;
  task_step_history_id: string;
  taskTitle: string;
  stepTitle: string;
  subStepTitle: string | null;
  resolved_at: string;
  blocker_description: string;
  resolution_details: string;
  days_to_resolve: number;
  blocker_created_at: string;
}

export const PerformanceTable = () => {
  const { filtered: rows, loading, getBlockersForStep, filteredBlockers, filters } = useDailyTaskReport();
  const { organizationId } = useCurrentOrg();
  const { toast } = useToast();
  const [openForStep, setOpenForStep] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'performance' | 'resolved'>('performance');
  const [resolvedRows, setResolvedRows] = useState<ResolvedBlockerRow[]>([]);
  const [loadingResolved, setLoadingResolved] = useState(false);
  const [editingRow, setEditingRow] = useState<ResolvedBlockerRow | null>(null);
  const [editResolutionText, setEditResolutionText] = useState('');
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get all resolved blockers from context
  const resolvedBlockers = useMemo(() => {
    return (filteredBlockers || []).filter((b: any) => b.is_resolved);
  }, [filteredBlockers]);

  // Fetch resolved blocker details when switching to resolved view
  useEffect(() => {
    const fetchResolvedDetails = async () => {
      if (viewMode !== 'resolved' || !organizationId) return;
      
      setLoadingResolved(true);
      try {
        console.log('🔍 Fetching resolved blockers for organization:', organizationId);
        
        // Use RPC function to get all resolved blockers with complete info
        // This is much simpler and faster than multiple queries
        const { data: resolvedData, error } = await (supabase as any).rpc('get_all_resolved_blockers', {
          p_organization_id: organizationId,
          p_limit: 100
        });

        if (error) {
          console.error('❌ Error loading resolved blockers:', error);
          console.error('Error details:', error);
          setResolvedRows([]);
          setLoadingResolved(false);
          return;
        }

        console.log('📦 RPC response:', resolvedData);

        if (!resolvedData || resolvedData.length === 0) {
          console.log('📭 No resolved blockers found in database');
          setResolvedRows([]);
          setLoadingResolved(false);
          return;
        }

        // Map to table rows
        const mapped: ResolvedBlockerRow[] = resolvedData.map((row: any) => {
          // Calculate days to resolve
          const createdAt = new Date(row.blocker_created_at);
          const resolvedAt = new Date(row.resolved_at || row.blocker_created_at);
          const daysToResolve = Math.ceil((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: row.blocker_resolved_id || row.id, // Use blocker_resolved_id if available, fallback to id
            task_step_history_id: row.task_step_history_id || row.id, // Use correct task_step_history_id
            taskTitle: row.task_title || '-',
            stepTitle: row.step_title || '-',
            subStepTitle: row.sub_step_title,
            resolved_at: row.resolved_at || row.blocker_created_at,
            blocker_description: row.blocker_description || '-',
            resolution_details: row.resolution_description || 'No resolution details provided',
            days_to_resolve: Math.max(0, daysToResolve),
            blocker_created_at: row.blocker_created_at
          };
        });

        setResolvedRows(mapped);
        console.log('✅ Loaded resolved blockers:', mapped.length);
      } catch (error) {
        console.error('Error in fetchResolvedDetails:', error);
        setResolvedRows([]);
      } finally {
        setLoadingResolved(false);
      }
    };

    fetchResolvedDetails();
  }, [viewMode, organizationId]);

  // Handle edit resolution details
  const handleEditResolution = (row: ResolvedBlockerRow) => {
    setEditingRow(row);
    setEditResolutionText(row.resolution_details);
  };

  const handleSaveEdit = async () => {
    if (!editingRow || isSaving) return;

    // Prevent duplicate requests
    setIsSaving(true);

    console.log('🔄 Saving resolution edit:', {
      id: editingRow.id,
      task_step_history_id: editingRow.task_step_history_id,
      newDescription: editResolutionText.trim()
    });

    try {
      // Update using id as the WHERE clause (primary key - more efficient)
      const { data, error } = await supabase
        .from('task_step_history_blocker_resolved')
        .update({ description: editResolutionText.trim() })
        .eq('id', editingRow.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating resolution:', error);
        toast({
          title: 'Error',
          description: `Failed to update resolution: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Resolution updated successfully:', data);

      // Update local state
      setResolvedRows(prev => prev.map(row => 
        row.id === editingRow.id
          ? { ...row, resolution_details: editResolutionText.trim() }
          : row
      ));

      setEditingRow(null);
      setEditResolutionText('');

      toast({
        title: 'Success',
        description: 'Resolution details updated successfully',
      });
    } catch (error: any) {
      console.error('❌ Unexpected error updating resolution:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete resolution
  const handleDeleteResolution = async () => {
    if (!deletingRowId) return;

    setIsDeleting(true);
    try {
      const rowToDelete = resolvedRows.find(r => r.id === deletingRowId);
      if (!rowToDelete) return;

      // Delete from task_step_history_blocker_resolved using primary key for better performance
      const { error: deleteResError } = await supabase
        .from('task_step_history_blocker_resolved')
        .delete()
        .eq('id', rowToDelete.id);

      if (deleteResError) {
        console.error('Error deleting resolution:', deleteResError);
        toast({
          title: 'Error',
          description: `Failed to delete resolution: ${deleteResError.message}`,
          variant: 'destructive',
        });
        setIsDeleting(false);
        return;
      }

      // Update is_resolved back to false in task_step_history
      const { error: updateError } = await supabase
        .from('task_step_history')
        .update({ is_resolved: false })
        .eq('id', rowToDelete.task_step_history_id);

      if (updateError) {
        console.error('Error updating blocker status:', updateError);
        toast({
          title: 'Warning',
          description: 'Resolution deleted but blocker status not updated',
          variant: 'destructive',
        });
      }

      // Remove from local state
      setResolvedRows(prev => prev.filter(row => row.id !== deletingRowId));
      setDeletingRowId(null);

      toast({
        title: 'Success',
        description: 'Resolution deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting resolution:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-medium">
          {viewMode === 'performance' ? 'Assignments Performance' : 'Blocker Resolved'}
        </span>
        <div className="flex items-center gap-2">
          {viewMode === 'performance' ? (
            <button
              onClick={() => setViewMode('resolved')}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Blocker Resolved
              {resolvedBlockers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-green-600 text-white rounded-full font-semibold">
                  {resolvedBlockers.length}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setViewMode('performance')}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Assignments Performance
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 seamless-scroll overflow-auto">
        {viewMode === 'performance' ? (
          /* Assignments Performance Table */
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="text-left px-3 py-2 bg-gray-50">PIC</th>
                <th className="text-left px-3 py-2 bg-gray-50">Task</th>
                <th className="text-left px-3 py-2 bg-gray-50">Step</th>
                <th className="text-left px-3 py-2 bg-gray-50">Blocker</th>
                <th className="text-left px-3 py-2 bg-gray-50">Due Date</th>
                <th className="text-left px-3 py-2 bg-gray-50">Finished</th>
                <th className="text-left px-3 py-2 bg-gray-50">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No data</td></tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 text-gray-900">{r.employeeName}</td>
                    <td className="px-3 py-2 text-gray-700">{r.taskTitle}</td>
                    <td className="px-3 py-2 text-gray-700">{r.stepTitle}</td>
                    <td className="px-3 py-2">
                      {(() => {
                        const items = getBlockersForStep(r.stepId);
                        const count = items.length;
                        return count > 0 ? (
                          <button onClick={() => setOpenForStep(r.stepId)} className="text-xs font-medium text-purple-700 hover:underline">
                            Found {count} Blocker{count > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '-'}</td>
                    <td className="px-3 py-2">
                      {r.isOnTime === null ? (
                        <span className="text-xs text-gray-500">N/A</span>
                      ) : r.isOnTime ? (
                        <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">On-Time</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 border border-red-200 rounded px-2 py-0.5">Late {r.lateDays}d</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* Blocker Resolved Table */
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="text-left px-3 py-2 w-[15%] bg-gray-50">Task</th>
                <th className="text-left px-3 py-2 w-[12%] bg-gray-50">Step</th>
                <th className="text-left px-3 py-2 w-[12%] bg-gray-50">Sub-step</th>
                <th className="text-left px-3 py-2 w-[10%] bg-gray-50">Resolved At</th>
                <th className="text-left px-3 py-2 w-[18%] bg-gray-50">Blocker</th>
                <th className="text-left px-3 py-2 w-[18%] bg-gray-50">Resolution Details</th>
                <th className="text-center px-3 py-2 w-[10%] bg-gray-50">Days Resolved</th>
                <th className="text-center px-3 py-2 w-[5%] bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingResolved ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Loading resolved blockers...</td></tr>
              ) : resolvedRows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No resolved blockers found</td></tr>
              ) : (
                resolvedRows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">{row.taskTitle}</td>
                    <td className="px-3 py-2 text-gray-700">{row.stepTitle}</td>
                    <td className="px-3 py-2 text-gray-600 font-medium">{row.subStepTitle || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {new Date(row.resolved_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-3 py-2 text-gray-700" title={row.blocker_description}>
                      <div className="line-clamp-2">{row.blocker_description}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-900" title={row.resolution_details}>
                      <div className="line-clamp-2">{row.resolution_details}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 rounded-md">
                        {row.days_to_resolve} {row.days_to_resolve === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditResolution(row)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit resolution details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRowId(row.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete resolution"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <BlockerDetailsModal
        open={!!openForStep}
        onOpenChange={(o) => !o && setOpenForStep(null)}
        items={openForStep ? getBlockersForStep(openForStep) : []}
      />

      {/* Edit Resolution Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Resolution Details</h3>
            
            <div className="space-y-3 mb-4">
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Task: <span className="font-medium text-gray-900">{editingRow.taskTitle}</span></div>
                <div className="text-xs text-gray-600 mb-1">Step: <span className="font-medium text-gray-900">{editingRow.stepTitle}</span></div>
                {editingRow.subStepTitle && (
                  <div className="text-xs text-gray-600 mb-1">Sub-step: <span className="font-medium text-gray-900">{editingRow.subStepTitle}</span></div>
                )}
                <div className="text-sm text-gray-700 mt-2">{editingRow.blocker_description}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Details</label>
                <textarea
                  value={editResolutionText}
                  onChange={(e) => setEditResolutionText(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter resolution details..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingRow(null);
                  setEditResolutionText('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editResolutionText.trim() || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRowId} onOpenChange={(open) => !open && setDeletingRowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resolution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resolution? This will mark the blocker as unresolved again.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResolution}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


