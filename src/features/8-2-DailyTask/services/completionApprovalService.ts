import { supabase } from '@/integrations/supabase/client';
import { calculateProgress, determineStatusFromProgress } from '../utils/taskUtils';

export type CompletionEntityType = 'task' | 'step' | 'substep';

export interface CompletionApprovalRow {
  id: string;
  entity_type: CompletionEntityType;
  daily_task_id: string;
  task_step_id: string | null;
  task_steps_to_steps_id: string | null;
  assignee_employee_id: string;
  assigner_employee_id: string;
  status: 'pending' | 'approved' | 'rejected';
  completed_at: string;
  reject_reason: string | null;
  rejected_at?: string | null;
  daily_tasks?: { title: string } | null;
  task_steps?: { title: string; social_media_plan_id?: string | null; social_media_plans?: { production_approved: boolean | null; production_status?: string | null } | null } | null;
  task_steps_to_steps?: { title: string } | null;
  assignee?: { id: string; full_name: string } | null;
}

/**
 * Create a completion_approval record when assignee marks task/step/substep complete.
 */
export async function createCompletionApprovalIfAssignee(params: {
  organizationId: string;
  entityType: CompletionEntityType;
  dailyTaskId: string;
  taskStepId?: string | null;
  taskStepsToStepsId?: string | null;
  assigneeEmployeeId: string;
  assignerEmployeeId: string;
  completedAt: string;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('completion_approvals').insert({
      organization_id: params.organizationId,
      entity_type: params.entityType,
      daily_task_id: params.dailyTaskId,
      task_step_id: params.taskStepId ?? null,
      task_steps_to_steps_id: params.taskStepsToStepsId ?? null,
      assignee_employee_id: params.assigneeEmployeeId,
      assigner_employee_id: params.assignerEmployeeId,
      status: 'pending',
      completed_at: params.completedAt,
    });
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

const PENDING_APPROVAL_SELECT =
  'id, entity_type, daily_task_id, task_step_id, task_steps_to_steps_id, assignee_employee_id, assigner_employee_id, status, completed_at, reject_reason, daily_tasks(title), task_steps(title, social_media_plan_id, social_media_plans(production_approved, production_status)), task_steps_to_steps(title), assignee:employees!assignee_employee_id(id, full_name)';

/**
 * Fetch pending approvals for the current user as assigner (to show "Pending your approval").
 * Includes task/step/substep titles and assignee name for card display.
 */
export async function fetchPendingApprovalsForAssigner(
  organizationId: string,
  assignerEmployeeId: string
): Promise<{ data: CompletionApprovalRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('completion_approvals')
      .select(PENDING_APPROVAL_SELECT)
      .eq('organization_id', organizationId)
      .eq('assigner_employee_id', assignerEmployeeId)
      .eq('status', 'pending')
      .order('completed_at', { ascending: false });
    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data ?? []) as CompletionApprovalRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

const REJECTED_SELECT =
  'id, entity_type, daily_task_id, task_step_id, task_steps_to_steps_id, assignee_employee_id, assigner_employee_id, status, completed_at, reject_reason, rejected_at, daily_tasks(title), task_steps(title), task_steps_to_steps(title), assignee:employees!assignee_employee_id(id, full_name)';

/** Minimal row for rejection lookup (Job Desc + main table). */
export interface RejectedApprovalLookupRow {
  entity_type: CompletionEntityType;
  daily_task_id: string;
  task_step_id: string | null;
  task_steps_to_steps_id: string | null;
  assignee_employee_id: string;
  reject_reason: string | null;
}

/**
 * Fetch all rejected completions for an organization (for Job Desc / main table rejection display).
 */
export async function fetchRejectedForOrg(
  organizationId: string
): Promise<{ data: RejectedApprovalLookupRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('completion_approvals')
      .select('entity_type, daily_task_id, task_step_id, task_steps_to_steps_id, assignee_employee_id, reject_reason')
      .eq('organization_id', organizationId)
      .eq('status', 'rejected')
      .order('rejected_at', { ascending: false });
    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data ?? []) as RejectedApprovalLookupRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Fetch rejected completions for the current user as assignee (to show "Rejected by assigner").
 * Includes task/step/substep titles and assignee name for card display.
 */
export async function fetchRejectedForAssignee(
  organizationId: string,
  assigneeEmployeeId: string
): Promise<{ data: CompletionApprovalRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('completion_approvals')
      .select(REJECTED_SELECT)
      .eq('organization_id', organizationId)
      .eq('assignee_employee_id', assigneeEmployeeId)
      .eq('status', 'rejected')
      .order('rejected_at', { ascending: false })
      .limit(50);
    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data ?? []) as CompletionApprovalRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Approve a completion. No change to task/step/substep (already completed).
 */
export async function approveCompletion(
  approvalId: string,
  approvedByEmployeeId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('completion_approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedByEmployeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .eq('status', 'pending');
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Reject a completion: update approval row, then uncheck the task/step/substep.
 */
export async function rejectCompletion(
  approvalId: string,
  rejectedByEmployeeId: string,
  rejectReason: string
): Promise<{ error: Error | null }> {
  try {
    const { data: row, error: fetchErr } = await supabase
      .from('completion_approvals')
      .select('id, entity_type, daily_task_id, task_step_id, task_steps_to_steps_id')
      .eq('id', approvalId)
      .eq('status', 'pending')
      .single();
    if (fetchErr || !row) return { error: new Error(fetchErr?.message ?? 'Approval not found') };

    const { error: updateErr } = await supabase
      .from('completion_approvals')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: rejectedByEmployeeId,
        reject_reason: rejectReason.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId);
    if (updateErr) return { error: new Error(updateErr.message) };

    const entityType = row.entity_type as CompletionEntityType;
    if (entityType === 'task') {
      const { error: taskErr } = await supabase
        .from('daily_tasks')
        .update({ status: 'pending' })
        .eq('id', row.daily_task_id);
      if (taskErr) return { error: new Error(taskErr.message) };
    } else if (entityType === 'step') {
      const { error: stepErr } = await supabase
        .from('task_steps')
        .update({ is_completed: false, completed_at: null })
        .eq('id', row.task_step_id);
      if (stepErr) return { error: new Error(stepErr.message) };
    } else if (entityType === 'substep') {
      const { error: subErr } = await supabase
        .from('task_steps_to_steps')
        .update({ is_completed: false, completed_at: null })
        .eq('id', row.task_steps_to_steps_id);
      if (subErr) return { error: new Error(subErr.message) };
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * When Google Drive link is saved in Preview: mark the linked step complete and create a
 * pending completion_approval so assigner sees it in Task Summary (without assignee checking complete on Daily Task).
 * Prefers Content step (is_concept_step = false); falls back to Concept step. Updates daily_tasks.status from progress.
 */
export async function completeStepAndCreateApprovalFromDriveLink(params: {
  organizationId: string;
  socialMediaPlanId: string;
}): Promise<{ error: Error | null }> {
  const { organizationId, socialMediaPlanId } = params;
  try {
    // 1. Find step(s) linked to this plan; prefer Content step
    const { data: contentSteps, error: stepsErr } = await supabase
      .from('task_steps')
      .select('id, task_id, is_concept_step')
      .eq('social_media_plan_id', socialMediaPlanId)
      .eq('is_concept_step', false)
      .limit(1);
    if (stepsErr) return { error: new Error(stepsErr.message) };

    let stepRow: { id: string; task_id: string; is_concept_step: boolean } | null = contentSteps?.[0] ?? null;
    if (!stepRow) {
      const { data: conceptSteps, error: conceptErr } = await supabase
        .from('task_steps')
        .select('id, task_id, is_concept_step')
        .eq('social_media_plan_id', socialMediaPlanId)
        .eq('is_concept_step', true)
        .limit(1);
      if (conceptErr) return { error: new Error(conceptErr.message) };
      stepRow = conceptSteps?.[0] ?? null;
    }
    if (!stepRow) return { error: null };

    const stepId = stepRow.id;
    const taskId = stepRow.task_id;

    // 2. Get assignment for this step (assignee + assigner)
    const { data: assignment, error: assignErr } = await supabase
      .from('task_steps_assigned')
      .select('employee_id, assigned_by')
      .eq('task_step_id', stepId)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assignErr) return { error: new Error(assignErr.message) };

    // 3. Mark step complete
    const completedAt = new Date().toISOString();
    const { error: updateStepErr } = await supabase
      .from('task_steps')
      .update({ is_completed: true, completed_at: completedAt })
      .eq('id', stepId);
    if (updateStepErr) return { error: new Error(updateStepErr.message) };

    // 4. Create completion_approval only if we have assignment and no existing pending
    if (assignment?.employee_id && assignment?.assigned_by) {
      const { data: existingPending } = await supabase
        .from('completion_approvals')
        .select('id')
        .eq('entity_type', 'step')
        .eq('task_step_id', stepId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!existingPending) {
        const { error: insertErr } = await supabase.from('completion_approvals').insert({
          organization_id: organizationId,
          entity_type: 'step',
          daily_task_id: taskId,
          task_step_id: stepId,
          assignee_employee_id: assignment.employee_id,
          assigner_employee_id: assignment.assigned_by,
          status: 'pending',
          completed_at: completedAt,
        });
        if (insertErr) return { error: new Error(insertErr.message) };
      }
    }

    // 5. Update daily_tasks.status from step progress
    const { data: allSteps, error: allStepsErr } = await supabase
      .from('task_steps')
      .select('is_completed')
      .eq('task_id', taskId);
    if (allStepsErr) return { error: new Error(allStepsErr.message) };
    if (allSteps && allSteps.length > 0) {
      const { data: currentTask, error: taskErr } = await supabase
        .from('daily_tasks')
        .select('status')
        .eq('id', taskId)
        .single();
      if (!taskErr && currentTask) {
        const currentStatus = (currentTask as { status?: string })?.status ?? 'pending';
        const progress = calculateProgress(allSteps as { is_completed: boolean }[], currentStatus);
        const finalStatus = determineStatusFromProgress(progress, currentStatus);
        await supabase.from('daily_tasks').update({ status: finalStatus }).eq('id', taskId);
      }
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * When Google Drive link is removed in Preview: uncomplete the linked step and reject any pending
 * completion_approval for that step so it disappears from Task Summary.
 * Uses client-side updates; RLS may block approval update if caller is not the assigner.
 */
export async function revertStepCompletionFromDriveLinkRemoval(params: {
  organizationId: string;
  socialMediaPlanId: string;
  rejectedByEmployeeId?: string | null;
}): Promise<{ error: Error | null }> {
  const { organizationId, socialMediaPlanId, rejectedByEmployeeId } = params;
  const rejectedAt = new Date().toISOString();
  const rejectReason = 'Link removed from Preview';

  try {
    // 1. Find step linked to this plan (same priority: Content then Concept)
    const { data: contentSteps, error: stepsErr } = await supabase
      .from('task_steps')
      .select('id, task_id')
      .eq('social_media_plan_id', socialMediaPlanId)
      .eq('is_concept_step', false)
      .limit(1);
    if (stepsErr) return { error: new Error(stepsErr.message) };

    let stepRow: { id: string; task_id: string } | null = contentSteps?.[0] ?? null;
    if (!stepRow) {
      const { data: conceptSteps, error: conceptErr } = await supabase
        .from('task_steps')
        .select('id, task_id')
        .eq('social_media_plan_id', socialMediaPlanId)
        .eq('is_concept_step', true)
        .limit(1);
      if (conceptErr) return { error: new Error(conceptErr.message) };
      stepRow = conceptSteps?.[0] ?? null;
    }
    if (!stepRow) return { error: null };

    const stepId = stepRow.id;
    const taskId = stepRow.task_id;

    // 2. Uncomplete the step
    const { error: updateStepErr } = await supabase
      .from('task_steps')
      .update({ is_completed: false, completed_at: null })
      .eq('id', stepId);
    if (updateStepErr) return { error: new Error(updateStepErr.message) };

    // 3. Reject any pending completion_approval for this step (so it disappears from Task Summary)
    const { data: pendingRows } = await supabase
      .from('completion_approvals')
      .select('id')
      .eq('entity_type', 'step')
      .eq('task_step_id', stepId)
      .eq('status', 'pending');
    if (pendingRows && pendingRows.length > 0) {
      const updatePayload: Record<string, unknown> = {
        status: 'rejected',
        rejected_at: rejectedAt,
        reject_reason: rejectReason,
        updated_at: rejectedAt,
      };
      if (rejectedByEmployeeId) updatePayload.rejected_by = rejectedByEmployeeId;
      for (const row of pendingRows) {
        const { error: updateApprovalErr } = await supabase
          .from('completion_approvals')
          .update(updatePayload)
          .eq('id', row.id);
        if (updateApprovalErr) return { error: new Error(updateApprovalErr.message) };
      }
    }

    // 4. Update daily_tasks.status from step progress
    const { data: allSteps, error: allStepsErr } = await supabase
      .from('task_steps')
      .select('is_completed')
      .eq('task_id', taskId);
    if (allStepsErr) return { error: new Error(allStepsErr.message) };
    if (allSteps && allSteps.length > 0) {
      const { data: currentTask, error: taskErr } = await supabase
        .from('daily_tasks')
        .select('status')
        .eq('id', taskId)
        .single();
      if (!taskErr && currentTask) {
        const currentStatus = (currentTask as { status?: string })?.status ?? 'pending';
        const progress = calculateProgress(allSteps as { is_completed: boolean }[], currentStatus);
        const finalStatus = determineStatusFromProgress(progress, currentStatus);
        await supabase.from('daily_tasks').update({ status: finalStatus }).eq('id', taskId);
      }
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Revert step completion and pending approval when link is removed. Tries RPC first (works for any
 * user); falls back to client-side revert if RPC is not available (e.g. migration not applied).
 */
export async function revertStepCompletionFromDriveLinkRemovalWithRpc(params: {
  organizationId: string;
  socialMediaPlanId: string;
  rejectedByEmployeeId?: string | null;
}): Promise<{ error: Error | null }> {
  const { organizationId, socialMediaPlanId, rejectedByEmployeeId } = params;
  try {
    const { data, error } = await supabase.rpc('revert_completion_on_drive_link_removal', {
      p_organization_id: organizationId,
      p_social_media_plan_id: socialMediaPlanId,
      p_rejected_by_employee_id: rejectedByEmployeeId ?? null,
    });
    if (!error) {
      const ok = (data as { ok?: boolean })?.ok;
      if (ok === false && (data as { error?: string })?.error) {
        return { error: new Error((data as { error: string }).error) };
      }
      return { error: null };
    }
    // RPC not found (42883) or other DB error: fall back to client-side revert
    if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
      return revertStepCompletionFromDriveLinkRemoval(params);
    }
    return { error: new Error(error.message) };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
