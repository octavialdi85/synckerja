import { useState, useCallback, useEffect } from 'react';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import {
  fetchPendingApprovalsForAssigner,
  fetchRejectedForAssignee,
  approveCompletion,
  rejectCompletion,
  type CompletionApprovalRow,
} from '../services/completionApprovalService';

export function useCompletionApprovals(refreshDeps: unknown[] = []) {
  const { organizationId } = useCurrentOrg();
  const { data: currentEmployee } = useCurrentEmployee();
  const [pending, setPending] = useState<CompletionApprovalRow[]>([]);
  const [rejected, setRejected] = useState<CompletionApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!organizationId || !currentEmployee?.id) {
      setPending([]);
      setRejected([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pendingRes, rejectedRes] = await Promise.all([
      fetchPendingApprovalsForAssigner(organizationId, currentEmployee.id),
      fetchRejectedForAssignee(organizationId, currentEmployee.id),
    ]);
    if (!pendingRes.error) setPending(pendingRes.data);
    if (!rejectedRes.error) setRejected(rejectedRes.data);
    setLoading(false);
  }, [organizationId, currentEmployee?.id, ...refreshDeps]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  return { pending, rejected, loading, refresh, approve, reject };
}
