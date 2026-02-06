import React, { useState } from 'react';
import { CheckCircle, XCircle, User, Loader2, ClipboardCheck } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/features/ui/dialog';
import { useCompletionApprovals } from '../hooks/useCompletionApprovals';
import { useDailyTask } from '../DailyTaskContext';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useToast } from '@/features/ui/use-toast';
import type { CompletionApprovalRow } from '../services/completionApprovalService';

function getDisplayTitle(row: CompletionApprovalRow): string {
  const taskTitle = row.daily_tasks?.title ?? 'Task';
  if (row.entity_type === 'task') return taskTitle;
  const stepTitle = row.task_steps?.title ?? 'Step';
  if (row.entity_type === 'step') return `${taskTitle} → ${stepTitle}`;
  const subTitle = row.task_steps_to_steps?.title ?? 'Sub-step';
  return `${taskTitle} → ${stepTitle} → ${subTitle}`;
}

function getEntityTypeLabel(entityType: string, t: (k: string, fallback: string) => string): string {
  if (entityType === 'task') return t('dailyTask.approval.entityTask', 'Task');
  if (entityType === 'step') return t('dailyTask.approval.entityStep', 'Step');
  return t('dailyTask.approval.entitySubstep', 'Sub-step');
}

export const PendingApprovalSection = () => {
  const { t } = useAppTranslation();
  const { pending, rejected, loading, fetchError, approve, reject, refresh } = useCompletionApprovals([]);
  const { refetchTasks, uncheckCompletionLocally, setPendingApprovalFocus, navigateToTask } = useDailyTask();
  const { toast } = useToast();
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; row: CompletionApprovalRow | null; reason: string }>({
    open: false,
    row: null,
    reason: '',
  });
  const [actingId, setActingId] = useState<string | null>(null);

  const handleApprove = async (row: CompletionApprovalRow) => {
    setActingId(row.id);
    const { error } = await approve(row.id);
    setActingId(null);
    if (error) {
      toast({ title: t('dailyTask.approval.error', 'Error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('dailyTask.approval.approved', 'Approved'), description: t('dailyTask.approval.approvedDesc', 'Completion approved.') });
    refresh();
  };

  const handleRejectClick = (row: CompletionApprovalRow) => {
    setRejectDialog({ open: true, row, reason: '' });
  };

  const handleRejectSubmit = async () => {
    if (!rejectDialog.row || !rejectDialog.reason.trim()) {
      toast({
        title: t('dailyTask.approval.reasonRequired', 'Reason required'),
        description: t('dailyTask.approval.reasonRequiredDesc', 'Please enter a reason for rejection.'),
        variant: 'destructive',
      });
      return;
    }
    const row = rejectDialog.row;
    const reason = rejectDialog.reason.trim();
    setActingId(row.id);
    const { error } = await reject(row.id, reason);
    setActingId(null);
    setRejectDialog({ open: false, row: null, reason: '' });
    if (error) {
      toast({ title: t('dailyTask.approval.error', 'Error'), description: error.message, variant: 'destructive' });
      return;
    }
    // Optimistic update: uncheck item in main table immediately so user sees change without manual refresh
    uncheckCompletionLocally({
      entityType: row.entity_type,
      dailyTaskId: row.daily_task_id,
      taskStepId: row.task_step_id ?? undefined,
      taskStepsToStepsId: row.task_steps_to_steps_id ?? undefined,
    });
    toast({ title: t('dailyTask.approval.rejected', 'Rejected'), description: t('dailyTask.approval.rejectedDesc', 'Completion rejected; item unchecked.') });
    refresh();
    await refetchTasks();
  };

  const handleTitleClick = (row: CompletionApprovalRow) => {
    const taskId = row.daily_task_id;
    const stepId = row.task_step_id ?? undefined;
    if (row.entity_type === 'task') {
      setPendingApprovalFocus({ taskId });
      navigateToTask(taskId);
    } else if (row.entity_type === 'step') {
      setPendingApprovalFocus({ taskId, stepId });
      navigateToTask(taskId, stepId);
    } else {
      // substep: focus task + step and open sub-step modal for this step
      setPendingApprovalFocus({ taskId, stepId, openSubStepModalForStepId: stepId });
      navigateToTask(taskId, stepId);
    }
  };

  return (
    <>
      {/* Pending Approval card (same style as Task Summary cards) */}
      <div className="mt-4">
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between min-h-[60px]"
        >
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-700">
              {t('dailyTask.approval.pendingTitle', 'Pending your approval')}
            </span>
          </div>
          <span className="text-xl font-bold text-amber-600">{pending.length}</span>
        </div>

        {/* List of items to approve (seamless vertical scroll) */}
        <div className="mt-2 max-h-[min(40vh,320px)] overflow-y-auto overflow-x-hidden seamless-scroll min-h-0">
          {fetchError ? (
            <p className="text-xs text-red-600 py-2">
              {t('dailyTask.approval.fetchError', 'Failed to load approvals. Please try again.')}
              <button type="button" onClick={() => refresh()} className="ml-2 underline font-medium">
                {t('dailyTask.approval.retry', 'Retry')}
              </button>
            </p>
          ) : loading && pending.length === 0 ? (
            <p className="text-xs text-gray-500 py-2 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
              {t('dailyTask.approval.loading', 'Loading...')}
            </p>
          ) : pending.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">{t('dailyTask.approval.noPending', 'No items pending approval.')}</p>
          ) : (
            <ul className="space-y-2 pr-1">
              {pending.map((row) => (
                <li
                  key={row.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white text-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleTitleClick(row)}
                    className="w-full text-left font-medium text-gray-900 truncate cursor-pointer hover:text-amber-700 hover:underline focus:outline-none focus:ring-1 focus:ring-amber-400 rounded"
                    title={getDisplayTitle(row)}
                  >
                    {getDisplayTitle(row)}
                  </button>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>{row.assignee?.full_name ?? t('dailyTask.approval.assignee', 'Assignee')}</span>
                    <span className="text-gray-400">·</span>
                    <span>{getEntityTypeLabel(row.entity_type, t)}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleApprove(row)}
                      disabled={actingId === row.id}
                    >
                      {actingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      {t('dailyTask.approval.approve', 'Approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleRejectClick(row)}
                      disabled={actingId === row.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t('dailyTask.approval.reject', 'Reject')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Rejected by assigner (for assignee) */}
      {rejected.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-900 text-sm mb-2">
            {t('dailyTask.approval.rejectedTitle', 'Rejected by assigner')}
          </h4>
          <ul className="space-y-2">
            {rejected.slice(0, 10).map((row) => (
              <li key={row.id} className="border border-red-100 rounded-lg p-3 bg-red-50/50 text-sm">
                <div className="font-medium text-gray-900 truncate">{getDisplayTitle(row)}</div>
                {row.reject_reason && (
                  <p className="text-xs text-gray-600 mt-1">{row.reject_reason}</p>
                )}
              </li>
            ))}
          </ul>
          {rejected.length > 10 && (
            <p className="text-xs text-gray-500 mt-1">{t('dailyTask.approval.showingRecent', 'Showing 10 most recent.')}</p>
          )}
        </div>
      )}

      {/* Reject reason dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, row: null, reason: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dailyTask.approval.rejectReasonTitle', 'Reject completion')}</DialogTitle>
            <DialogDescription>
              {t('dailyTask.approval.rejectReasonDesc', 'Provide a reason so the assignee knows what to adjust. The task/step will be unchecked.')}
            </DialogDescription>
          </DialogHeader>
          {rejectDialog.row && (
            <p className="text-sm text-gray-600 truncate">{getDisplayTitle(rejectDialog.row)}</p>
          )}
          <Textarea
            placeholder={t('dailyTask.approval.reasonPlaceholder', 'Reason for rejection (required)...')}
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            rows={3}
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, row: null, reason: '' })}>
              {t('dailyTask.approval.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectDialog.reason.trim() || actingId !== null}>
              {actingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('dailyTask.approval.reject', 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
