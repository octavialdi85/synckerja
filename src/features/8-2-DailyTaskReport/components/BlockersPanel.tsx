import React, { useMemo } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';

export const BlockersPanel = () => {
  const { filteredBlockers: blockers, loading } = useDailyTaskReport() as any;

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
                          <div className="text-xs text-red-600 mt-1">{new Date(b.created_at).toLocaleString()}</div>
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
    </div>
  );
};


