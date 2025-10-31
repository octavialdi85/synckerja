import React, { useMemo, useState } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { BlockerDetailsModal } from './BlockerDetailsModal';
import { BlockerResolutionModal } from './BlockerResolutionModal';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';

export const BlockersAndUpdatesPanel = () => {
  const { filteredBlockers: blockers, filteredRecentUpdates: recentUpdates, loading } = useDailyTaskReport() as any;
  const [activeTab, setActiveTab] = useState<'blockers' | 'updates'>('blockers');
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'list' | 'resolved'>('list');
  const [resolutionFor, setResolutionFor] = useState<any | null>(null);
  const [locResolved, setLocResolved] = useState<Record<string, boolean>>({});

  const handleResolve = async (blocker: any) => {
    await supabase.from('task_step_history').update({ is_resolved: true } as any).eq('id', blocker.id);
    setLocResolved(prev => ({ ...prev, [blocker.id]: true }));
    setResolutionFor(blocker);
  };

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    (blockers || []).forEach((b: any) => {
      const task = b.taskTitle || '-';
      const step = b.stepTitle || '-';
      map[task] = map[task] || {};
      map[task][step] = map[task][step] || [];
      map[task][step].push(b);
    });
    return map;
  }, [blockers]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-60px)]">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'blockers' | 'updates')} className="flex flex-col flex-shrink-0">
        <div className="border-b bg-gray-50">
          <TabsList className="w-full h-auto bg-transparent p-0 rounded-none border-none">
            <TabsTrigger 
              value="blockers" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-3 py-2 text-sm font-medium"
            >
              Blockers
              {blockers && blockers.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-semibold">
                  {blockers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="updates" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-3 py-2 text-sm font-medium"
            >
              Recent Updates
              {recentUpdates && recentUpdates.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                  {recentUpdates.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Shared Content Area - displays blockers or updates based on activeTab */}
      <div className="flex-1 overflow-hidden flex flex-col m-0 min-h-0">
        <div className="p-3 space-y-2 seamless-scroll flex-1 overflow-auto max-h-[calc(100vh-160px)]">
          {activeTab === 'blockers' ? (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="text-sm text-gray-500">Loading...</div>
                  </div>
                </div>
              ) : (blockers || []).length === 0 ? (
                <div className="text-sm text-gray-500">No blockers reported.</div>
              ) : (
                Object.entries(grouped).map(([taskTitle, steps]) => (
                  <div key={taskTitle} className="border border-gray-200 rounded-md bg-gray-50 p-2 mb-2">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Task: {taskTitle}</div>
                    <div className="space-y-2">
                      {Object.entries(steps).map(([stepTitle, items]) => (
                        <div key={taskTitle + stepTitle} className="border border-gray-200 rounded-md bg-white p-2 ml-1">
                          <div className="text-sm font-medium text-gray-800 mb-1">Step: {stepTitle}</div>
                          <div className="space-y-1 ml-1">
                            {(items as any[]).map((b: any) => (
                              <div key={b.id} className="p-2 border border-red-200 bg-red-50 rounded text-sm">
                                {b.subStepTitle && (
                                  <div className="text-red-700 font-semibold mb-0.5">Sub-step: {b.subStepTitle}</div>
                                )}
                                <div className="text-red-700 font-medium">{b.blocker_type || 'Blocker'}</div>
                                {b.description && <div className="text-red-800">{b.description}</div>}
                                <div className="flex items-center justify-between mt-1">
                                  <div className="text-xs text-red-600">{new Date(b.created_at).toLocaleString()}</div>
                                  <div className="flex items-center gap-2">
                                    {(b.is_resolved || locResolved[b.id]) && (
                                      <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">Resolved</span>
                                    )}
                                    <button
                                      className={`text-xs rounded px-2 py-1 border ${(b.is_resolved || locResolved[b.id]) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-green-600 text-white border-green-700 hover:bg-green-700'}`}
                                      disabled={!!(b.is_resolved || locResolved[b.id])}
                                      onClick={() => handleResolve(b)}
                                    >
                                      Resolve
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="text-sm text-gray-500">Loading...</div>
                  </div>
                </div>
              ) : (recentUpdates || []).length === 0 ? (
                <div className="text-sm text-gray-500">No updates.</div>
              ) : (
                (recentUpdates || []).map((u: any) => {
                  // Only show green for status_change with completed, all others are gray
                  const isCompleted = u.action_type === 'status_change' && 
                    (u.new_value === 'completed' || u.new_value === 'COMPLETED' || 
                     u.description?.toLowerCase().includes('completed'));
                  const cardCls = isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50';
                  const titleCls = isCompleted ? 'text-green-700 font-medium' : 'text-gray-900 font-medium';
                  const actionType = u.action_type?.replace(/_/g, ' ') || '';
                  
                  return (
                    <div key={u.id} className={`p-2 border rounded text-sm ${cardCls}`}>
                      <div className={titleCls}>{actionType}</div>
                      <div className="text-gray-700">
                        {u.description || ''}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <div>Task: <span className="font-medium text-gray-800">{u.taskTitle || '-'}</span></div>
                        <div>Step: <span className="font-medium text-gray-800">{u.stepTitle || '-'}</span></div>
                        {u.subStepTitle && (
                          <div>Sub-step: <span className="font-medium text-gray-800">{u.subStepTitle}</span></div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(u.created_at).toLocaleString()}</div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <BlockerDetailsModal open={open} onOpenChange={setOpen} items={blockers || []} initialTab={initialTab} />
      <BlockerResolutionModal
        open={!!resolutionFor}
        onOpenChange={(o) => !o && setResolutionFor(null)}
        blocker={resolutionFor ? {
          id: resolutionFor.id,
          blocker_type: resolutionFor.blocker_type,
          description: resolutionFor.description,
          created_at: resolutionFor.created_at,
          taskTitle: resolutionFor.taskTitle,
          stepTitle: resolutionFor.stepTitle,
          subStepTitle: resolutionFor.subStepTitle,
        } : null}
      />
    </div>
  );
};
