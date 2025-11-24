import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Checkbox } from '@/features/ui/checkbox';
import { Badge } from '@/features/ui/badge';
import { Input } from '@/features/ui/input';
import { Plus, Edit, Trash2, History, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useToast } from '@/features/1-login/hooks/use-toast';
import { StepHistoryModal } from './StepHistoryModal';
import { AssignSubStepDialog } from './AssignSubStepDialog';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';

interface SubStep {
  id: string;
  parent_step_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  assigned_to?: string | null;
  assigned_employee?: {
    id: string;
    full_name: string;
    email?: string;
  } | null;
}

interface ParentPlanInfo {
  id: string;
  google_drive_link?: string | null;
  production_status?: string | null;
  production_approved?: boolean | null;
  is_concept_step?: boolean; // true for Concept step, false for Content step
}

interface ModalViewSubStepsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentStepId: string;
  parentStepTitle: string;
  onParentCompletionChange?: (completed: boolean) => void;
  taskCreatedBy?: string; // Task creator user ID for permission check
}

export const ModalViewSubSteps = ({ open, onOpenChange, parentStepId, parentStepTitle, onParentCompletionChange, taskCreatedBy }: ModalViewSubStepsProps) => {
  const [loading, setLoading] = useState(false);
  const [subSteps, setSubSteps] = useState<SubStep[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState('');
  const [showHistoryForSubStep, setShowHistoryForSubStep] = useState<string | null>(null);
  const [historyCounts, setHistoryCounts] = useState<Record<string, number>>({});
  const [assignDialogSubStep, setAssignDialogSubStep] = useState<SubStep | null>(null);
  const { organizationId } = useCurrentOrg();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployee();
  const [parentPlan, setParentPlan] = useState<ParentPlanInfo | null>(null);

  // Check if current user is the creator of the task
  const isTaskCreator = taskCreatedBy === user?.id;

  const fetchSubSteps = async () => {
    console.log('🔍 Fetching sub-steps:', { organizationId, parentStepId });
    
    if (!organizationId || !parentStepId) {
      console.warn('⚠️ Missing organizationId or parentStepId');
      return;
    }
    
    try {
      setLoading(true);
      
      // First attempt: with organization_id filter
      let { data, error } = await supabase
        .from('task_steps_to_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('parent_step_id', parentStepId)
        .order('order', { ascending: true })
        .order('created_at', { ascending: true });
      
      console.log('📊 Sub-steps query result (with org filter):', { data, error, count: data?.length });
      
      // If no data found with organization_id, try without it (fallback)
      if (!error && (!data || data.length === 0)) {
        console.log('🔄 No data with org filter, trying without org filter...');
        const fallbackResult = await supabase
          .from('task_steps_to_steps')
          .select('*')
          .eq('parent_step_id', parentStepId)
          .order('order', { ascending: true })
          .order('created_at', { ascending: true });
        
        console.log('📊 Sub-steps fallback query result:', { 
          data: fallbackResult.data, 
          error: fallbackResult.error, 
          count: fallbackResult.data?.length 
        });
        
        if (!fallbackResult.error && fallbackResult.data) {
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
      }
      
      if (error) {
        console.error('❌ Error fetching sub-steps:', error);
        throw error;
      }
      
      // Fetch assignments for these sub-steps
      const subStepIds = (data || []).map((d: any) => d.id);
      let subStepsWithAssignment = (data || []) as SubStep[];
      
      if (subStepIds.length > 0) {
        const { data: assignments, error: assignError } = await supabase
          .from('task_steps_to_steps_assigned')
          .select(`
            id,
            task_steps_to_steps_id,
            employee_id,
            employee:employees!employee_id(id, full_name, email)
          `)
          .in('task_steps_to_steps_id', subStepIds)
          .order('assigned_at', { ascending: false });
        
        if (!assignError && assignments) {
          // Group assignments by task_steps_to_steps_id (keep only latest)
          const assignmentMap: Record<string, any> = {};
          assignments.forEach((a: any) => {
            if (!assignmentMap[a.task_steps_to_steps_id]) {
              assignmentMap[a.task_steps_to_steps_id] = a;
            }
          });
          
          // Merge assignment data with sub-steps
          subStepsWithAssignment = (data || []).map((s: any) => ({
            ...s,
            assigned_to: assignmentMap[s.id]?.employee_id || null,
            assigned_employee: assignmentMap[s.id]?.employee || null
          }));
        }
      }
      
      setSubSteps(subStepsWithAssignment);
      console.log('✅ Sub-steps set to state:', subStepsWithAssignment.length || 0, 'items');
      
      await syncParentCompletion(subStepsWithAssignment);

      // Fetch history counts for these sub-steps (with graceful degradation)
      const ids = (data || []).map((d: any) => d.id);
      if (ids.length > 0) {
        // OPTIMIZATION: Make this non-blocking with timeout protection
        // This is a non-critical UI enhancement that can fail gracefully
        Promise.race([
          supabase
            .from('task_step_history')
            .select('task_steps_to_steps_id')
            .in('task_steps_to_steps_id', ids),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('History count timeout')), 3000)
          )
        ])
        .then((result: any) => {
          if (result?.data && !result?.error) {
            const tally: Record<string, number> = {};
            (result.data || []).forEach((row: any) => {
              const key = row.task_steps_to_steps_id;
              tally[key] = (tally[key] || 0) + 1;
            });
            setHistoryCounts(tally);
          }
        })
        .catch((err) => {
          console.warn('History count fetch failed (non-critical):', err);
          setHistoryCounts({}); // Show sub-steps without counts - graceful degradation
        });
      } else {
        setHistoryCounts({});
      }
    } catch (err) {
      console.error('Error loading sub-steps:', err);
      toast({ title: 'Error', description: 'Failed to load steps', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const syncParentCompletion = async (steps?: SubStep[]) => {
    try {
      const list = steps ?? subSteps;
      const hasAny = (list?.length || 0) > 0;
      const allCompleted = hasAny && list!.every(s => s.is_completed);
      const payload: any = { is_completed: allCompleted };
      if (allCompleted) {
        payload.updated_at = new Date().toISOString();
      }
      await supabase
        .from('task_steps')
        .update(payload)
        .eq('id', parentStepId);
      onParentCompletionChange?.(allCompleted);
    } catch (err) {
      // ignore
    }
  };

  const toggleCompleted = async (id: string, current: boolean) => {
    try {
      const willBeCompleted = !current;
      
      // Check if this is the last sub-step being completed
      // Find the last sub-step by order
      const sortedSubSteps = [...subSteps].sort((a, b) => b.order - a.order);
      const lastSubStep = sortedSubSteps[0];
      const isLastSubStep = lastSubStep?.id === id;
      
      // Check if parent step is Content step using is_concept_step column
      const isContentStep = parentPlan?.is_concept_step === false;
      
      // For Content step, check if completing the last sub-step requires Google Drive link or production approval
      if (
        willBeCompleted &&
        isLastSubStep &&
        isContentStep &&
        parentPlan?.id
      ) {
        const hasGoogleDriveLink = parentPlan.google_drive_link && parentPlan.google_drive_link.trim() !== '';
        const isProductionApproved = parentPlan.production_approved === true;
        
        // Block if: google_drive_link IS NULL AND production_approved = false
        if (!hasGoogleDriveLink && !isProductionApproved) {
          toast({
            title: 'Completion locked',
            description: 'Content step requires either a Google Drive link or production approval. Please add the Google Drive link or approve production in the Social Media Plan first.',
            variant: 'destructive'
          });
          return;
        }
      }
      
      // Original logic: Check if finishing all sub-steps (for non-Content steps or non-last sub-steps)
      const isFinishingAllSubSteps =
        willBeCompleted &&
        subSteps.length > 0 &&
        subSteps.every(s => (s.id === id ? true : s.is_completed));

      // Only apply Google Drive link check for non-Content steps or when not the last sub-step
      if (
        isFinishingAllSubSteps &&
        !isContentStep &&
        parentPlan?.id &&
        (!parentPlan.google_drive_link || parentPlan.google_drive_link.trim() === '')
      ) {
        toast({
          title: 'Lengkapi Google Drive Link',
          description: 'Isi Google Drive link pada halaman Social Media sebelum menuntaskan semua sub-step.',
          variant: 'destructive'
        });
        return; // Prevent completion if Google Drive link is missing
      }

      const { error } = await supabase
        .from('task_steps_to_steps')
        .update({ is_completed: !current })
        .eq('id', id)
        .eq('parent_step_id', parentStepId)
        .eq('organization_id', organizationId);
      if (error) throw error;
      const nowIso = new Date().toISOString();
      const updated = subSteps.map(s => (
        s.id === id
          ? { ...s, is_completed: !current, updated_at: !current ? nowIso : s.updated_at }
          : s
      ));
      setSubSteps(updated);
      await syncParentCompletion(updated);

      // insert recent update history for sub-step
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any)
          .from('task_step_history')
          .insert({
            task_step_id: parentStepId,
            task_steps_to_steps_id: id,
            action_type: 'status_change',
            old_value: current ? 'completed' : 'pending',
            new_value: !current ? 'completed' : 'pending',
            description: !current ? 'Sub-step completed' : 'Sub-step reopened',
            created_by: user?.id || null,
          });
      } catch (_) {}
    } catch (err) {
      console.error('Error toggling sub-step:', err);
      toast({ title: 'Error', description: 'Failed to update step', variant: 'destructive' });
    }
  };

  const addSubStep = async () => {
    if (!newTitle.trim() || !organizationId) return;
    try {
      setAdding(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id || null;
      const { data, error } = await supabase
        .from('task_steps_to_steps')
        .insert([
          {
            parent_step_id: parentStepId,
            title: newTitle.trim(),
            organization_id: organizationId,
            created_by: userId,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setSubSteps(prev => [...prev, data as SubStep]);
      setHistoryCounts(prev => ({ ...prev, [(data as any).id]: 0 }));
      setNewTitle('');
      await syncParentCompletion([...(subSteps || []), { ...(data as SubStep), is_completed: false }]);
    } catch (err) {
      console.error('Error adding sub-step:', err);
      toast({ title: 'Error', description: 'Failed to add step', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

	const startEdit = (id: string, title: string) => {
		setEditingId(id);
		setEditTitle(title);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditTitle('');
	};

	const saveEdit = async () => {
		if (!editingId || !organizationId) return;
		const trimmed = editTitle.trim();
		if (!trimmed) return;
		try {
			const { error } = await supabase
				.from('task_steps_to_steps')
				.update({ title: trimmed })
				.eq('id', editingId)
				.eq('parent_step_id', parentStepId)
				.eq('organization_id', organizationId);
			if (error) throw error;
			setSubSteps(prev => prev.map(s => (s.id === editingId ? { ...s, title: trimmed } : s)));
			setEditingId(null);
			setEditTitle('');
		} catch (err) {
			console.error('Error updating sub-step:', err);
			toast({ title: 'Error', description: 'Failed to update step', variant: 'destructive' });
		}
	};

	const deleteSubStep = async (id: string) => {
		if (!organizationId) return;
		if (!window.confirm('Are you sure you want to delete this step?')) return;
		try {
			const { error } = await supabase
				.from('task_steps_to_steps')
				.delete()
				.eq('id', id)
				.eq('parent_step_id', parentStepId)
				.eq('organization_id', organizationId);
			if (error) throw error;
      const filtered = subSteps.filter(s => s.id !== id);
      setSubSteps(filtered);
      await syncParentCompletion(filtered);
			if (editingId === id) cancelEdit();
		} catch (err) {
			console.error('Error deleting sub-step:', err);
			toast({ title: 'Error', description: 'Failed to delete step', variant: 'destructive' });
		}
	};

  const handleAssignSubStep = async (subStepId: string, employeeId: string | null, dueDateIso?: string | null) => {
    try {
      console.log('🎯 Assigning sub-step:', { subStepId, employeeId, dueDateIso });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (employeeId) {
        // Validate due_date is provided (required)
        if (!dueDateIso) {
          toast({
            title: 'Error',
            description: 'Due date is required when assigning sub-step',
            variant: 'destructive'
          });
          return;
        }

        // Delete existing assignments
        await supabase
          .from('task_steps_to_steps_assigned')
          .delete()
          .eq('task_steps_to_steps_id', subStepId);

        // Create new assignment
        const { data: inserted, error } = await supabase
          .from('task_steps_to_steps_assigned')
          .insert({
            organization_id: organizationId,
            task_steps_to_steps_id: subStepId,
            employee_id: employeeId,
            assigned_by: currentEmployee?.id || null,
            assigned_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;

        // Save due_date to task_steps_assigned_duedate
        const { error: dueDateError } = await supabase
          .from('task_steps_assigned_duedate')
          .insert({
            organization_id: organizationId,
            task_steps_to_steps_assigned_id: inserted.id,
            due_date: dueDateIso,
          });

        if (dueDateError) {
          console.error('❌ Error saving sub-step due_date:', dueDateError);
          toast({
            title: 'Warning',
            description: 'Sub-step assigned but due date not saved',
            variant: 'destructive'
          });
        } else {
          console.log('✅ Sub-step due_date saved successfully');
        }

        console.log('✅ Sub-step assigned successfully');
      } else {
        // Unassign
        const { error } = await supabase
          .from('task_steps_to_steps_assigned')
          .delete()
          .eq('task_steps_to_steps_id', subStepId);

        if (error) throw error;
        console.log('✅ Sub-step unassigned successfully');
      }

      toast({
        title: 'Success',
        description: employeeId ? 'Sub-step assigned successfully' : 'Sub-step unassigned successfully'
      });

      // Refresh sub-steps to get updated assignment
      await fetchSubSteps();
      setAssignDialogSubStep(null);
    } catch (error) {
      console.error('Error assigning sub-step:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign sub-step',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (!open || !parentStepId) {
      return;
    }

    const fetchParentPlan = async () => {
      try {
        const { data: stepPlan } = await supabase
          .from('task_steps')
          .select('social_media_plan_id, is_concept_step')
          .eq('id', parentStepId)
          .maybeSingle();

        if (!stepPlan?.social_media_plan_id) {
          setParentPlan(null);
          return;
        }

        const { data: planData } = await supabase
          .from('social_media_plans')
          .select('google_drive_link, production_status, production_approved')
          .eq('id', stepPlan.social_media_plan_id)
          .maybeSingle();

        // Store parent step's is_concept_step for Content step check
        const parentIsConceptStep = stepPlan.is_concept_step === true;

        setParentPlan({
          id: stepPlan.social_media_plan_id,
          google_drive_link: planData?.google_drive_link ?? null,
          production_status: planData?.production_status ?? null,
          production_approved: planData?.production_approved ?? null,
          is_concept_step: parentIsConceptStep
        });
      } catch (error) {
        console.error('Error fetching parent plan info:', error);
        setParentPlan(null);
      }
    };

    fetchParentPlan();
  }, [open, parentStepId]);

  useEffect(() => {
    if (open) fetchSubSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parentStepId, organizationId]);

  // Filter visible sub-steps based on assignment or creation
  const visibleSubSteps = subSteps.filter(s => s.assigned_to === currentEmployee?.id || s.created_by === user?.id || isTaskCreator);
  const completedCount = visibleSubSteps.filter(s => s.is_completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[620px] max-w-[90vw] max-h-[90vh] h-[600px] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 hover:bg-blue-100/80 flex-shrink-0"
              aria-label="Close"
            >
              <ArrowLeft className="w-5 h-5 text-blue-600" />
            </Button>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2 truncate">
                Steps
                <Badge variant="secondary">{completedCount}/{visibleSubSteps.length}</Badge>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1 truncate">
                {parentStepTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
          style={{
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          {/* Inline Add Form */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a new step..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addSubStep();
              }}
              className="flex-1"
              disabled={adding}
            />
            <Button onClick={addSubStep} disabled={!newTitle.trim() || adding} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

		  <div className="flex-1 min-h-0 seamless-scroll overflow-auto">
		  {loading ? (
					<div className="text-sm text-gray-500">Loading...</div>
				) : visibleSubSteps.length === 0 ? (
					<div className="text-sm text-gray-500 italic">No steps yet</div>
				) : (
					<ul className="space-y-2">
						{visibleSubSteps.map((s) => (
                <li key={s.id} className="flex items-center gap-2 p-2 bg-white rounded-md border border-gray-200 hover:bg-gray-50">
								{/* Fixed: Removed button wrapper to prevent button nesting - Checkbox is already a button */}
								<Checkbox 
									checked={s.is_completed} 
									onCheckedChange={() => toggleCompleted(s.id, s.is_completed)}
									className="text-gray-400 hover:text-gray-600"
								/>
                  {editingId === s.id ? (
									<div className="flex items-center gap-2 flex-1">
										<Input
											value={editTitle}
											onChange={(e) => setEditTitle(e.target.value)}
											className="flex-1 h-8 text-sm"
											autoFocus
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													saveEdit();
												} else if (e.key === 'Escape') {
													cancelEdit();
												}
											}}
										/>
										<Button variant="ghost" size="sm" onClick={saveEdit} className="h-8 px-2 text-green-600 hover:text-green-700">Save</Button>
										<Button variant="ghost" size="sm" onClick={cancelEdit} className="h-8 px-2 text-gray-500 hover:text-gray-700">Cancel</Button>
									</div>
								) : (
									<>
                      <div className="flex-1">
                        <span className={`text-sm ${s.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>{s.title}</span>
                        {s.is_completed && s.updated_at && (
                          <div className="text-[10px] text-gray-400 mt-0.5">Completed: {new Date(s.updated_at).toLocaleString()}</div>
                        )}
                      </div>
										<div className="flex items-center gap-1">
                      {/* Assign - Locked for non-task-creators */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => isTaskCreator && setAssignDialogSubStep(s)}
                        disabled={!isTaskCreator}
                        className={`h-6 w-6 p-0 relative ${
                          isTaskCreator
                            ? `hover:text-gray-600 ${s.assigned_to ? 'text-green-500' : 'text-gray-400'}`
                            : 'opacity-40 cursor-not-allowed text-gray-400'
                        }`}
                        title={
                          isTaskCreator
                            ? (s.assigned_to ? `Assigned to ${s.assigned_employee?.full_name || 'Unknown'}` : 'Assign sub-step')
                            : '🔒 Only task creator can assign sub-steps'
                        }
                      >
                        <Users className="w-3 h-3" />
                        {s.assigned_to && (
                          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            1
                          </div>
                        )}
                      </Button>
                      {/* History */}
                      <Button variant="ghost" size="sm" onClick={() => setShowHistoryForSubStep(s.id)} className="h-6 w-6 p-0 text-gray-400 hover:text-purple-600 relative" title="History & Blockers">
                        <History className="w-3 h-3" />
                        {historyCounts[s.id] ? (
                          <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {historyCounts[s.id]}
                          </div>
                        ) : null}
                      </Button>
                      {/* Edit - Locked for assigned users */}
											<Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => isTaskCreator && startEdit(s.id, s.title)}
                        disabled={!isTaskCreator}
                        className={`h-6 w-6 p-0 ${
                          isTaskCreator 
                            ? 'text-gray-400 hover:text-gray-600 cursor-pointer' 
                            : 'text-gray-300 opacity-40 cursor-not-allowed'
                        }`}
                        title={isTaskCreator ? 'Edit sub-step' : '🔒 Only task creator can edit sub-steps'}
                      >
												<Edit className="w-3 h-3" />
											</Button>
                      {/* Delete - Locked for assigned users */}
											<Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => isTaskCreator && deleteSubStep(s.id)}
                        disabled={!isTaskCreator}
                        className={`h-6 w-6 p-0 ${
                          isTaskCreator 
                            ? 'text-gray-400 hover:text-red-600 cursor-pointer' 
                            : 'text-gray-300 opacity-40 cursor-not-allowed'
                        }`}
                        title={isTaskCreator ? 'Delete sub-step' : '🔒 Only task creator can delete sub-steps'}
                      >
												<Trash2 className="w-3 h-3" />
											</Button>
										</div>
									</>
								)}
							</li>
						))}
						</ul>
				)}
				</div>
        </div>

        <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-muted/30 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full md:w-auto">
            Close
          </Button>
        </div>
        {showHistoryForSubStep && (
          <StepHistoryModal
            isOpen={!!showHistoryForSubStep}
            onClose={() => setShowHistoryForSubStep(null)}
            taskStepId={parentStepId}
            stepTitle={parentStepTitle}
            currentStatus={'pending'}
            currentPriority={'medium'}
            subStepId={showHistoryForSubStep}
            onHistoryUpdate={async () => {
              // refresh count for this sub-step only
              try {
                const { count } = await supabase
                  .from('task_step_history')
                  .select('id', { count: 'exact', head: true })
                  .eq('task_steps_to_steps_id', showHistoryForSubStep);
                setHistoryCounts(prev => ({ ...prev, [showHistoryForSubStep]: count || 0 }));
              } catch (_) {}
            }}
          />
        )}

        {/* Assign Sub-Step Dialog */}
        {assignDialogSubStep && (
          <AssignSubStepDialog
            subStep={{
              id: assignDialogSubStep.id,
              title: assignDialogSubStep.title,
              parent_step_id: parentStepId, // NEW: pass parent step ID
              assigned_to: assignDialogSubStep.assigned_to,
              assigned_employee: assignDialogSubStep.assigned_employee
            }}
            onAssign={async (employeeId: string, dueDateIso: string) => {
              await handleAssignSubStep(assignDialogSubStep.id, employeeId, dueDateIso);
            }}
            onUnassign={async () => {
              await handleAssignSubStep(assignDialogSubStep.id, null);
            }}
            onClose={() => setAssignDialogSubStep(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};


