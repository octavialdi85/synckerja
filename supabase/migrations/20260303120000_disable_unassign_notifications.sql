-- Nonaktifkan notifikasi unassign (Step/Sub-step unassigned).
-- Hanya assignee yang dapat notifikasi (Step assigned); orang yang di-unassign tidak dapat notif sama sekali.
DROP TRIGGER IF EXISTS after_task_steps_assigned_delete_notify ON public.task_steps_assigned;
DROP TRIGGER IF EXISTS after_task_steps_to_steps_assigned_delete_notify ON public.task_steps_to_steps_assigned;
