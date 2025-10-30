import React from 'react';
import { useDailyTaskReport } from '../context/ReportContext';

export const RecentUpdates = () => {
  const { filteredRecentUpdates: recentUpdates, loading } = useDailyTaskReport() as any;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium">Recent Updates</div>
      <div className="p-3 space-y-2 seamless-scroll max-h-[calc(100vh-300px)] overflow-auto">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : recentUpdates.length === 0 ? (
          <div className="text-sm text-gray-500">No updates.</div>
        ) : (
          recentUpdates.map((u: any) => {
            const isCompleted = u.action_type === 'status_change' && (u.new_value === 'completed' || u.new_value === 'COMPLETED');
            const cardCls = isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50';
            const titleCls = isCompleted ? 'text-green-700' : 'text-gray-900';
            return (
            <div key={u.id} className={`p-2 border rounded text-sm ${cardCls}`}>
              <div className={`${titleCls} font-medium`}>{u.action_type?.replace('_',' ')}</div>
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
          )})
        )}
      </div>
    </div>
  );
};


