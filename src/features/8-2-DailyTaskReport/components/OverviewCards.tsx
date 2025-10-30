import React from 'react';
import { useDailyTaskReport } from '../context/ReportContext';

export const OverviewCards = () => {
  const { filtered } = useDailyTaskReport();
  const total = filtered.length;
  const completed = filtered.filter(p => p.isCompleted).length;
  const withDue = filtered.filter(p => p.dueDate).length;
  const ontime = filtered.filter(p => p.isOnTime === true).length;
  const late = filtered.filter(p => p.isOnTime === false).length;

  const Card = ({ title, value, color, icon }: { title: string; value: number; color: string; icon?: React.ReactNode }) => (
    <div className={`bg-white border rounded-lg p-3 w-full ${color}`.trim()}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {icon}
      </div>
      <div className="space-y-0.5">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{title}</div>
      </div>
    </div>
  );

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
      <Card title="Total Assignments" value={total} color="border-gray-200" />
      <Card title="Completed" value={completed} color="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50" />
      <Card title="On Time" value={ontime} color="border-green-100 bg-gradient-to-br from-green-50 to-emerald-50" />
      <Card title="Late" value={late} color="border-red-100 bg-gradient-to-br from-red-50 to-orange-50" />
    </div>
  );
};


