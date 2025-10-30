import React, { useMemo, useState } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { BlockerDetailsModal } from './BlockerDetailsModal';
import { BlockerResolutionModal } from './BlockerResolutionModal';
import { supabase } from '@/integrations/supabase/client';

export const BlockersPanel = () => {
  const { filteredBlockers: blockers, loading } = useDailyTaskReport() as any;
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium">Blockers</div>
      <div className="p-3 space-y-2 seamless-scroll max-h-[calc(100vh-300px)] overflow-auto">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
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
      </div>
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


