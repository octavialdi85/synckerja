import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Checkbox } from '@/features/ui/checkbox';
import { Badge } from '@/features/ui/badge';
import { Input } from '@/features/ui/input';
import { Plus, Edit, Trash2, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useToast } from '@/features/1-login/hooks/use-toast';
import { StepHistoryModal } from './StepHistoryModal';

interface SubStep {
  id: string;
  parent_step_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
  updated_at?: string;
}

interface ModalViewSubStepsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentStepId: string;
  parentStepTitle: string;
  onParentCompletionChange?: (completed: boolean) => void;
}

export const ModalViewSubSteps = ({ open, onOpenChange, parentStepId, parentStepTitle, onParentCompletionChange }: ModalViewSubStepsProps) => {
  const [loading, setLoading] = useState(false);
  const [subSteps, setSubSteps] = useState<SubStep[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState('');
  const [showHistoryForSubStep, setShowHistoryForSubStep] = useState<string | null>(null);
  const [historyCounts, setHistoryCounts] = useState<Record<string, number>>({});
  const { organizationId } = useCurrentOrg();
  const { toast } = useToast();

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
      
      setSubSteps((data || []) as SubStep[]);
      console.log('✅ Sub-steps set to state:', data?.length || 0, 'items');
      
      await syncParentCompletion((data || []) as SubStep[]);

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

  useEffect(() => {
    if (open) fetchSubSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parentStepId, organizationId]);

  const completedCount = subSteps.filter(s => s.is_completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[520px] rounded-none sm:rounded-none flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>Steps</span>
              <Badge variant="secondary">{completedCount}/{subSteps.length}</Badge>
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[60%]" title={parentStepTitle}>{parentStepTitle}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage sub-steps for {parentStepTitle}. Add, edit, complete, or delete individual steps.
          </DialogDescription>
        </DialogHeader>

		<div className="flex flex-col gap-3 flex-1 min-h-0">
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
				) : subSteps.length === 0 ? (
					<div className="text-sm text-gray-500 italic">No steps yet</div>
				) : (
					<ul className="space-y-2">
						{subSteps.map((s) => (
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
                      <Button variant="ghost" size="sm" onClick={() => setShowHistoryForSubStep(s.id)} className="h-6 w-6 p-0 text-gray-400 hover:text-purple-600 relative" title="History & Blockers">
                        <History className="w-3 h-3" />
                        {historyCounts[s.id] ? (
                          <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {historyCounts[s.id]}
                          </div>
                        ) : null}
                      </Button>
											<Button variant="ghost" size="sm" onClick={() => startEdit(s.id, s.title)} className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600" title="Edit">
												<Edit className="w-3 h-3" />
											</Button>
											<Button variant="ghost" size="sm" onClick={() => deleteSubStep(s.id)} className="h-6 w-6 p-0 text-gray-400 hover:text-red-600" title="Delete">
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

        <div className="flex justify-end pt-2 mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
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
      </DialogContent>
    </Dialog>
  );
};


