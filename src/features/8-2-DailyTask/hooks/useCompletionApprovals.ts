import { useState, useCallback, useEffect, useRef } from 'react';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import {
  fetchPendingApprovalsForAssigner,
  fetchRejectedForAssignee,
  approveCompletion,
  rejectCompletion,
  type CompletionApprovalRow,
} from '../services/completionApprovalService';

/** Delay (ms) before fetching approval data so main task list loads first; keeps page load fast. */
const DEFER_APPROVAL_FETCH_MS = 800;

/** Key per (entity + assignee) for dedup; same entity rejected multiple times -> keep latest (first in DESC order). */
function getRejectionKeyForRow(row: CompletionApprovalRow): string {
  if (row.entity_type === 'task') return `task_${row.daily_task_id}_${row.assignee_employee_id}`;
  if (row.entity_type === 'step' && row.task_step_id) return `step_${row.task_step_id}_${row.assignee_employee_id}`;
  if (row.entity_type === 'substep' && row.task_steps_to_steps_id) return `substep_${row.task_steps_to_steps_id}_${row.assignee_employee_id}`;
  return '';
}

export function useCompletionApprovals(refreshDeps: unknown[] = []) {
  const { organizationId } = useCurrentOrg();
  const { data: currentEmployee } = useCurrentEmployee();
  const [pending, setPending] = useState<CompletionApprovalRow[]>([]);
  const [rejected, setRejected] = useState<CompletionApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const deferredRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!organizationId || !currentEmployee?.id) {
      setPending([]);
      setRejected([]);
      setLoading(false);
      setFetchError(null);
      return;
    }
    setLoading(true);
    setFetchError(null);
    const [pendingRes, rejectedRes] = await Promise.all([
      fetchPendingApprovalsForAssigner(organizationId, currentEmployee.id),
      fetchRejectedForAssignee(organizationId, currentEmployee.id),
    ]);
    if (!pendingRes.error) setPending(pendingRes.data);
    else console.warn('[useCompletionApprovals] Fetch pending approvals failed:', pendingRes.error.message);
    if (!rejectedRes.error) {
      const raw = rejectedRes.data ?? [];
      const seen = new Set<string>();
      const deduped = raw.filter((row) => {
        const key = getRejectionKeyForRow(row);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setRejected(deduped);
    } else console.warn('[useCompletionApprovals] Fetch rejected for assignee failed:', rejectedRes.error.message);
    setFetchError(pendingRes.error ?? rejectedRes.error ?? null);
    setLoading(false);
  }, [organizationId, currentEmployee?.id, ...refreshDeps]);

  useEffect(() => {
    if (!organizationId || !currentEmployee?.id) return;
    if (deferredRef.current) {
      refresh();
      return;
    }
    deferredRef.current = true;
    const t = setTimeout(() => {
      refresh();
    }, DEFER_APPROVAL_FETCH_MS);
    return () => clearTimeout(t);
  }, [organizationId, currentEmployee?.id, refresh]);

  const approve = useCallback(
    async (approvalId: string) => {
      if (!currentEmployee?.id) return { error: new Error('Not logged in') };
      const result = await approveCompletion(approvalId, currentEmployee.id);
      if (!result.error) await refresh();
      return result;
    },
    [currentEmployee?.id, refresh]
  );

  const reject = useCallback(
    async (approvalId: string, reason: string) => {
      if (!currentEmployee?.id) return { error: new Error('Not logged in') };
      const result = await rejectCompletion(approvalId, currentEmployee.id, reason);
      if (!result.error) await refresh();
      return result;
    },
    [currentEmployee?.id, refresh]
  );

  return { pending, rejected, loading, fetchError, refresh, approve, reject };
}
