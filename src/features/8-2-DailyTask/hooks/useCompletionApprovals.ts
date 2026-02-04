import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
/** Delay (ms) before subscribing to approval realtime so initial load stays fast. */
const DEFER_REALTIME_MS = 1500;

export function useCompletionApprovals(refreshDeps: unknown[] = []) {
  const { organizationId } = useCurrentOrg();
  const { data: currentEmployee } = useCurrentEmployee();
  const [pending, setPending] = useState<CompletionApprovalRow[]>([]);
  const [rejected, setRejected] = useState<CompletionApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const deferredRef = useRef(false);
  const refreshRef = useRef<() => Promise<void>>();
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
    if (!rejectedRes.error) setRejected(rejectedRes.data);
    else console.warn('[useCompletionApprovals] Fetch rejected for assignee failed:', rejectedRes.error.message);
    setFetchError(pendingRes.error ?? rejectedRes.error ?? null);
    setLoading(false);
  }, [organizationId, currentEmployee?.id, ...refreshDeps]);

  refreshRef.current = refresh;

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

  // Realtime: when assignee checks a box (INSERT) or status changes (UPDATE), refresh pending/rejected list.
  // Defer subscription so initial page load stays fast (subscribe after approval data has loaded).
  useEffect(() => {
    if (!organizationId || !currentEmployee?.id) return;

    const employeeId = currentEmployee.id;
    const t = setTimeout(() => {
      const ch = supabase
        .channel(`completion-approvals-${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'completion_approvals',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            const row = payload.new as { assigner_employee_id?: string; assignee_employee_id?: string };
            if (row.assigner_employee_id === employeeId || row.assignee_employee_id === employeeId) {
              refreshRef.current?.();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'completion_approvals',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as { assigner_employee_id?: string; assignee_employee_id?: string };
            if (row.assigner_employee_id === employeeId || row.assignee_employee_id === employeeId) {
              refreshRef.current?.();
            }
          }
        )
        .subscribe();
      realtimeChannelRef.current = ch;
    }, DEFER_REALTIME_MS);

    return () => {
      clearTimeout(t);
      const ch = realtimeChannelRef.current;
      if (ch) {
        supabase.removeChannel(ch);
        realtimeChannelRef.current = null;
      }
    };
  }, [organizationId, currentEmployee?.id]);

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
