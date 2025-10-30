import React, { useMemo, useState } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { BlockerDetailsModal } from './BlockerDetailsModal';

export const PerformanceTable = () => {
  const { filtered: rows, loading, getBlockersForStep } = useDailyTaskReport();
  const [openForStep, setOpenForStep] = useState<string | null>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium">Assignments Performance</div>
      <div className="seamless-scroll max-h-[calc(100vh-300px)] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">PIC</th>
              <th className="text-left px-3 py-2">Task</th>
              <th className="text-left px-3 py-2">Step</th>
              <th className="text-left px-3 py-2">Blocker</th>
              <th className="text-left px-3 py-2">Due Date</th>
              <th className="text-left px-3 py-2">Finished</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No data</td></tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2 text-gray-900">{r.employeeName}</td>
                  <td className="px-3 py-2 text-gray-700">{r.taskTitle}</td>
                  <td className="px-3 py-2 text-gray-700">{r.stepTitle}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const items = getBlockersForStep(r.stepId);
                      const count = items.length;
                      return count > 0 ? (
                        <button onClick={() => setOpenForStep(r.stepId)} className="text-xs font-medium text-purple-700 hover:underline">
                          Found {count} Blocker{count > 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2">
                    {r.isOnTime === null ? (
                      <span className="text-xs text-gray-500">N/A</span>
                    ) : r.isOnTime ? (
                      <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">On-Time</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 border border-red-200 rounded px-2 py-0.5">Late {r.lateDays}d</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <BlockerDetailsModal
        open={!!openForStep}
        onOpenChange={(o) => !o && setOpenForStep(null)}
        items={openForStep ? getBlockersForStep(openForStep) : []}
      />
    </div>
  );
};


