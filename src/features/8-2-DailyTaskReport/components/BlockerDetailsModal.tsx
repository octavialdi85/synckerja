import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { BlockerResolutionModal } from './BlockerResolutionModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { useToast } from '@/features/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<{ id: string; blocker_type?: string; description?: string; created_at: string; subStepTitle?: string | null; is_resolved?: boolean }>
  initialTab?: 'list' | 'resolved';
}

export const BlockerDetailsModal: React.FC<Props> = ({ open, onOpenChange, items, initialTab = 'list' }) => {
  const [localItems, setLocalItems] = useState<Props['items']>(items || []);
  const [resolutionFor, setResolutionFor] = useState<Props['items'][number] | null>(null);
  const [resolvedRows, setResolvedRows] = useState<Array<{ id: string; task_step_history_id: string; description: string; created_at: string; blocker_description?: string; taskTitle?: string; stepTitle?: string; subStepTitle?: string | null }>>([]);
  const [tab, setTab] = useState<'list' | 'resolved'>(initialTab);
  const [isLoadingResolved, setIsLoadingResolved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLocalItems(items || []);
      setTab(initialTab);
    }
  }, [open, items, initialTab]);

  const markResolved = async (id: string) => {
    // Open resolution modal to get resolution details
    // Modal will handle inserting to task_step_history_blocker_resolved
    const found = localItems.find(it => it.id === id) || null;
    setResolutionFor(found || null);
  };

  const handleResolutionComplete = async () => {
    if (!resolutionFor) return;
    
    try {
      // Update is_resolved flag in task_step_history
      // NOTE: This is called AFTER resolution details are inserted to task_step_history_blocker_resolved
      const { error } = await supabase
        .from('task_step_history')
        .update({ is_resolved: true } as any)
        .eq('id', resolutionFor.id);
      
      if (error) {
        console.error('Error updating blocker resolution status:', error);
        toast({
          title: 'Error',
          description: `Failed to mark blocker as resolved: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }
      
      // Verify that resolution was actually saved to task_step_history_blocker_resolved
      const { data: resolutionCheck, error: checkError } = await (supabase as any)
        .rpc('get_blocker_resolutions', {
          p_task_step_history_ids: [resolutionFor.id]
        });
      
      if (checkError) {
        console.error('Error verifying blocker resolution:', checkError);
      } else if (!resolutionCheck || resolutionCheck.length === 0) {
        console.warn('⚠️ Blocker marked as resolved but no resolution entry found in task_step_history_blocker_resolved');
        toast({
          title: 'Warning',
          description: 'Blocker marked as resolved but resolution details may not have been saved',
          variant: 'destructive',
        });
      } else {
        console.log('✅ Resolution verified:', resolutionCheck[0]);
      }
      
      // Update local state to remove from active blockers list
      setLocalItems(prev => prev.filter(it => it.id !== resolutionFor.id));
      
      // Close modal
      setResolutionFor(null);
      
      // Switch to resolved tab to show the newly resolved blocker
      setTab('resolved');
      
      toast({
        title: 'Success',
        description: 'Blocker marked as resolved',
      });
    } catch (error: any) {
      console.error('Unexpected error in handleResolutionComplete:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while updating blocker status',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadResolved = async () => {
      const ids = (localItems || []).map(b => b.id).filter(Boolean);
      if (!open || ids.length === 0) {
        setResolvedRows([]);
        setIsLoadingResolved(false);
        return;
      }
      
      setIsLoadingResolved(true);
      try {
        // Use RPC function to fetch resolved blockers (bypasses RLS overhead)
        const { data, error } = await (supabase as any).rpc('get_blocker_resolutions', {
          p_task_step_history_ids: ids
        });
        
        if (error) {
          console.error('Error loading resolved blockers:', error);
          setResolvedRows([]);
          return;
        }
        
        const mapped = (data || []).map((row: any) => {
          const source = (localItems || []).find(b => b.id === row.task_step_history_id) as any;
          return {
            id: row.id,
            task_step_history_id: row.task_step_history_id,
            description: row.description,
            created_at: row.created_at,
            blocker_description: source?.description || null,
            taskTitle: source?.taskTitle || '-',
            stepTitle: source?.stepTitle || '-',
            subStepTitle: source?.subStepTitle || null,
          };
        });
        setResolvedRows(mapped);
        console.log('✅ Loaded resolved blockers in details modal:', mapped.length);
      } catch (error) {
        console.error('Error in loadResolved:', error);
        setResolvedRows([]);
      } finally {
        setIsLoadingResolved(false);
      }
    };
    loadResolved();
  }, [open, localItems]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[520px] rounded-none sm:rounded-none flex flex-col">
        <DialogHeader>
          <DialogTitle>Blockers</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="mb-2">
            <TabsTrigger value="list">Blockers</TabsTrigger>
            <TabsTrigger value="resolved">Blocker Resolved</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="flex-1 min-h-0">
            <div className="flex-1 min-h-0 seamless-scroll overflow-auto space-y-2">
              {localItems.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              ) : localItems.filter(b => !b.is_resolved).length === 0 ? (
                <div className="text-sm text-gray-500">No unresolved blockers.</div>
              ) : (
                localItems.filter(b => !b.is_resolved).map((b) => (
                  <div key={b.id} className="p-2 border border-red-200 bg-red-50 rounded">
                    <div className="text-xs text-gray-700">Task: <span className="font-medium">{(b as any).taskTitle || '-'}</span></div>
                    <div className="text-xs text-gray-700">Step: <span className="font-medium">{(b as any).stepTitle || '-'}</span></div>
                    {b.subStepTitle && (
                      <div className="text-xs text-gray-700">Sub-step: <span className="font-medium">{b.subStepTitle}</span></div>
                    )}
                    <div className="text-sm text-red-800 font-medium mt-1">{b.blocker_type || 'Blocker'}</div>
                    {b.description && (
                      <div className="text-sm text-red-900">{b.description}</div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-red-600">{new Date(b.created_at).toLocaleString()}</div>
                      <div className="flex items-center gap-2">
                        {b.is_resolved && (
                          <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">Resolved</span>
                        )}
                        <button
                          className={`text-xs rounded px-2 py-1 border ${b.is_resolved ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-green-600 text-white border-green-700 hover:bg-green-700'}`}
                          disabled={!!b.is_resolved}
                          onClick={() => markResolved(b.id)}
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="resolved" className="flex-1 min-h-0">
            <div className="flex-1 min-h-0 seamless-scroll overflow-auto overflow-x-auto">
              {isLoadingResolved ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              ) : (
                <table className="text-sm min-w-max">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2 whitespace-nowrap">Task</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">Step</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">Sub-step</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">Resolved At</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">Blocker</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">Resolution Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedRows.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500 whitespace-nowrap">No resolved records</td></tr>
                    ) : (
                      resolvedRows.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.taskTitle || '-'}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.stepTitle || '-'}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.subStepTitle || '-'}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.blocker_description || '-'}</td>
                          <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{row.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    <BlockerResolutionModal
      open={!!resolutionFor}
      onOpenChange={(o) => {
        if (!o) {
          setResolutionFor(null);
        }
      }}
      blocker={resolutionFor ? {
        id: resolutionFor.id,
        blocker_type: resolutionFor.blocker_type,
        description: resolutionFor.description,
        created_at: resolutionFor.created_at as any,
        taskTitle: (resolutionFor as any).taskTitle,
        stepTitle: (resolutionFor as any).stepTitle,
        subStepTitle: resolutionFor.subStepTitle as any,
      } : null}
      onResolutionComplete={handleResolutionComplete}
    />
    </>
  );
};


