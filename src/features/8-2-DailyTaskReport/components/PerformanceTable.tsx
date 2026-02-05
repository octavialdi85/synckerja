import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { BlockerDetailsModal } from './BlockerDetailsModal';
import { ReportMainFooter } from './ReportMainFooter';
import { CheckCircle, ClipboardList, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useToast } from '@/features/ui/use-toast';
import { formatDateTime } from '@/features/share/utils/dateFormatter';
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
  const { filtered: rows, loading, getBlockersForStep, filteredBlockers, filters, formatDateRangeDisplay } = useDailyTaskReport();
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

  // Helper to convert filters to date range for RPC (server-side filtering)
  // Reuses same logic as ReportContext.getDateRange() for consistency
  const getDateRangeForRPC = useCallback(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    
    if (filters.timePeriod === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (filters.timePeriod === 'yesterday') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (filters.timePeriod === 'this_week') {
      // This week: Monday to Sunday (not Sunday to Saturday)
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Calculate days to Monday (1 = Monday)
      const daysToMonday = day === 0 ? 6 : day - 1; // If Sunday, go back 6 days to Monday
      start = new Date(now);
      start.setDate(now.getDate() - daysToMonday);
      start.setHours(0, 0, 0, 0);
      // End is Sunday (6 days after Monday)
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (filters.timePeriod === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filters.timePeriod === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (filters.timePeriod === 'custom' && filters.customStart && filters.customEnd) {
      start = new Date(filters.customStart);
      end = new Date(filters.customEnd);
      end.setHours(23, 59, 59, 999);
    }
    
    return {
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null
    };
  }, [filters.timePeriod, filters.customStart, filters.customEnd]);

  // Fetch resolved blocker details with server-side date filtering
  // Includes debouncing and request cancellation for optimal performance
  useEffect(() => {
    if (viewMode !== 'resolved' || !organizationId) return;
    
    const abortController = new AbortController();
    let isCancelled = false;
    
    const fetchResolvedDetails = async () => {
      setLoadingResolved(true);
      try {
        // Get date range from filters for server-side filtering
        const { start, end } = getDateRangeForRPC();

        // Call RPC with date parameters (server-side filtering for better performance)
        const { data: resolvedData, error } = await (supabase as any).rpc('get_all_resolved_blockers', {
          p_organization_id: organizationId,
          p_limit: 100,
          p_start_date: start,
          p_end_date: end
        });

        if (isCancelled) return; // Check if request was cancelled

        if (error) {
          if (!isCancelled) {
            setResolvedRows([]);
            toast({
              title: 'Error',
              description: `Failed to load resolved blockers: ${error.message}`,
              variant: 'destructive',
            });
          }
          return;
        }

        if (!resolvedData || resolvedData.length === 0) {
          if (!isCancelled) {
            setResolvedRows([]);
          }
          return;
        }

        // Map to table rows (no client-side filtering needed - already filtered by server)
        const mapped: ResolvedBlockerRow[] = resolvedData.map((row: any) => {
          // Calculate days to resolve
          const createdAt = new Date(row.blocker_created_at);
          const resolvedAt = new Date(row.resolved_at || row.blocker_created_at);
          const daysToResolve = Math.ceil((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: row.blocker_resolved_id || row.id,
            task_step_history_id: row.task_step_history_id || row.id,
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

        if (!isCancelled) {
          setResolvedRows(mapped);
        }
      } catch {
        if (!isCancelled) {
          setResolvedRows([]);
          toast({
            title: 'Error',
            description: 'An unexpected error occurred while loading resolved blockers',
            variant: 'destructive',
          });
        }
      } finally {
        if (!isCancelled) {
          setLoadingResolved(false);
        }
      }
    };

    // Debounce fetch to prevent excessive API calls when filter changes rapidly
    const timeoutId = setTimeout(() => {
      fetchResolvedDetails();
    }, 300);

    return () => {
      isCancelled = true;
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [viewMode, organizationId, filters.timePeriod, filters.customStart, filters.customEnd, getDateRangeForRPC, toast]);

  // Handle edit resolution details
  const handleEditResolution = (row: ResolvedBlockerRow) => {
    setEditingRow(row);
    setEditResolutionText(row.resolution_details);
  };

  const handleSaveEdit = async () => {
    if (!editingRow || isSaving) return;

    // Prevent duplicate requests
    setIsSaving(true);

    try {
      // Update using id as the WHERE clause (primary key - more efficient)
      const { data, error } = await supabase
        .from('task_step_history_blocker_resolved')
        .update({ description: editResolutionText.trim() })
        .eq('id', editingRow.id)
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: `Failed to update resolution: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

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

  // Get date range display string
  const dateRangeDisplay = formatDateRangeDisplay();

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
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
        {/* Date range display */}
        {dateRangeDisplay && (
          <div className="text-xs text-gray-500 mt-1">
            {dateRangeDisplay}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 seamless-scroll overflow-x-auto overflow-y-auto">
        {viewMode === 'performance' ? (
          /* Assignments Performance Table */
          <table className="text-sm" style={{ minWidth: '100%', tableLayout: 'auto' }}>
            <thead className="bg-gray-50 text-gray-600 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ width: '120px', minWidth: '120px' }}>PIC</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ minWidth: '150px' }}>Task</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ minWidth: '150px' }}>Step</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ minWidth: '150px' }}>Sub Step</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ width: '140px', minWidth: '140px' }}>Blocker</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ width: '140px', minWidth: '140px' }}>Assigned At</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ width: '100px', minWidth: '100px' }}>Due Date</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ width: '160px', minWidth: '160px' }}>Finished</th>
                <th className="text-left px-3 py-2 bg-gray-50" style={{ width: '112px', minWidth: '112px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">No data</td></tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 text-left text-gray-900" style={{ width: '120px', minWidth: '120px' }}>{r.employeeName}</td>
                    <td className="px-3 py-2 text-left text-gray-700" style={{ minWidth: '150px' }}>{r.taskTitle}</td>
                    <td className="px-3 py-2 text-left text-gray-700" style={{ minWidth: '150px' }}>{r.stepTitle}</td>
                    <td className="px-3 py-2 text-left text-gray-600" style={{ minWidth: '150px' }}>{r.subStepTitle || '-'}</td>
                    <td className="px-3 py-2 text-left align-middle" style={{ width: '140px', minWidth: '140px' }}>
                      {(() => {
                        // Get blockers for step (includes sub-step blockers mapped to parent step)
                        const stepBlockers = getBlockersForStep(r.stepId || '');
                        // If this is a sub-step row, also filter blockers for this specific sub-step
                        const items = r.type === 'substep' && r.subStepId
                          ? stepBlockers.filter((b: any) => b.task_steps_to_steps_id === r.subStepId)
                          : stepBlockers.filter((b: any) => !b.task_steps_to_steps_id || b.task_step_id === r.stepId);
                        const count = items.length;
                        return count > 0 ? (
                          <button 
                            onClick={() => setOpenForStep(r.stepId || '')} 
                            className="text-xs font-medium text-purple-700 hover:underline m-0 p-0 text-left"
                            style={{ textAlign: 'left' }}
                          >
                            Found {count} Blocker{count > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-left text-gray-600 whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>
                      {r.assignedAt ? formatDateTime(r.assignedAt) : '-'}
                    </td>
                    <td className="px-3 py-2 text-left text-gray-600 whitespace-nowrap" style={{ width: '100px', minWidth: '100px' }}>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-'}</td>
                    <td className="px-3 py-2 text-left text-gray-600 whitespace-nowrap" style={{ width: '160px', minWidth: '160px' }}>{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '-'}</td>
                    <td className="px-3 py-2 text-left whitespace-nowrap" style={{ width: '112px', minWidth: '112px' }}>
                      {r.isOnTime === null ? (
                        <span className="text-xs text-gray-500">N/A</span>
                      ) : r.isOnTime ? (
                        <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5 whitespace-nowrap">On-Time</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 border border-red-200 rounded px-2 py-0.5 whitespace-nowrap">Late {r.lateDays}d</span>
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

      {/* Footer */}
      <ReportMainFooter />
    </div>
  );
};


