import { CheckSquare, Clock, AlertTriangle, Calendar, TrendingUp, Percent } from 'lucide-react';
import { useDailyTask } from '../DailyTaskContext';
import RecentUpdateSteps from './RecentUpdateSteps';
import { PendingApprovalSection } from './PendingApprovalSection';

interface SummaryData {
  label: string;
  count: number;
  color: string;
  icon: any;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const TaskSummaryCards = () => {
  const { summaryData, isLoading } = useDailyTask();

  const summaryCards: SummaryData[] = [
    { 
      label: 'Pending', 
      count: summaryData.pending, 
      color: 'gray', 
      icon: Clock, 
      bgColor: 'bg-gray-50', 
      textColor: 'text-gray-600', 
      borderColor: 'border-gray-200' 
    },
    { 
      label: 'In Progress', 
      count: summaryData.inProgress, 
      color: 'blue', 
      icon: CheckSquare, 
      bgColor: 'bg-blue-50', 
      textColor: 'text-blue-600', 
      borderColor: 'border-blue-200' 
    },
    { 
      label: 'Completed', 
      count: summaryData.completed, 
      color: 'green', 
      icon: CheckSquare, 
      bgColor: 'bg-green-50', 
      textColor: 'text-green-600', 
      borderColor: 'border-green-200' 
    },
    { 
      label: 'Overdue', 
      count: summaryData.overdue, 
      color: 'red', 
      icon: AlertTriangle, 
      bgColor: 'bg-red-50', 
      textColor: 'text-red-600', 
      borderColor: 'border-red-200' 
    },
    { 
      label: 'Total Steps', 
      count: summaryData.totalSteps, 
      color: 'purple', 
      icon: TrendingUp, 
      bgColor: 'bg-purple-50', 
      textColor: 'text-purple-600', 
      borderColor: 'border-purple-200' 
    },
    { 
      label: 'Completed Steps', 
      count: summaryData.completedSteps, 
      color: 'emerald', 
      icon: CheckSquare, 
      bgColor: 'bg-emerald-50', 
      textColor: 'text-emerald-600', 
      borderColor: 'border-emerald-200' 
    },
    { 
      label: 'Planned This Month', 
      count: summaryData.tasksPlannedThisMonth, 
      color: 'indigo', 
      icon: Calendar, 
      bgColor: 'bg-indigo-50', 
      textColor: 'text-indigo-600', 
      borderColor: 'border-indigo-200' 
    },
    { 
      label: 'Completion Rate', 
      count: summaryData.totalSteps > 0 
        ? Math.round((summaryData.completedSteps / summaryData.totalSteps) * 100) 
        : 0, 
      color: 'teal', 
      icon: Percent, 
      bgColor: 'bg-teal-50', 
      textColor: 'text-teal-600', 
      borderColor: 'border-teal-200' 
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-center text-gray-500">Loading summary...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div
              key={index}
              className={`${item.bgColor} ${item.borderColor} border rounded-lg p-3 flex items-center justify-between min-h-[60px]`}
            >
              <div className="flex items-center gap-2">
                <IconComponent className={`w-4 h-4 ${item.textColor}`} />
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <span className={`text-xl font-bold ${item.textColor}`}>
                {item.label === 'Completion Rate' ? `${item.count}%` : item.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pending your approval (assigner) + Rejected (assignee) */}
      <PendingApprovalSection />

      {/* Recent Step Updates */}
      <div className="mt-4">
        <RecentUpdateSteps />
      </div>
    </div>
  );
};

export default TaskSummaryCards;

