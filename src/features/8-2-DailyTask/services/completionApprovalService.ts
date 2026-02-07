import { supabase } from '@/integrations/supabase/client';

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
  task_steps?: { title: string; social_media_plan_id?: string | null; social_media_plans?: { production_approved: boolean | null } | null } | null;
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
  'id, entity_type, daily_task_id, task_step_id, task_steps_to_steps_id, assignee_employee_id, assigner_employee_id, status, completed_at, reject_reason, daily_tasks(title), task_steps(title, social_media_plan_id, social_media_plans(production_approved)), task_steps_to_steps(title), assignee:employees!assignee_employee_id(id, full_name)';

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
