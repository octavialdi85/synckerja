import React from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

export const OverviewCards = () => {
  const { t } = useAppTranslation();
  const { filtered } = useDailyTaskReport();
  const total = filtered.length;
  const completed = filtered.filter(p => p.isCompleted).length;
  const withDue = filtered.filter(p => p.dueDate).length;
  const ontime = filtered.filter(p => p.isOnTime === true).length;
  const late = filtered.filter(p => p.isOnTime === false).length;
  const pending = total - completed;

  // Calculate Efficiency Rate: (On Time / Completed) × 100%
  const efficiencyRate = completed > 0 ? Math.round((ontime / completed) * 100 * 10) / 10 : 0;

  // Calculate Productivity Score with Due Date Awareness
  // Only count tasks that are:
  // 1. Completed (on-time or late) - ALWAYS counted, even if premature
  // 2. Overdue (pending but past due date) - counted as 0
  // Pending tasks that haven't reached due date are NOT counted (fair assessment)
  const now = new Date();
  const eligibleTasks = filtered.filter(p => {
    // Completed tasks are always eligible (even if premature completion)
    if (p.isCompleted) return true;
    
    // Pending tasks: only eligible if past due date (overdue)
    if (!p.isCompleted && p.dueDate) {
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(23, 59, 59, 999);
      return now.getTime() > dueDate.getTime(); // Already overdue
    }
    
    // Pending tasks without due date are not eligible
    return false;
  });

  const eligibleTotal = eligibleTasks.length;
  const eligibleOnTime = eligibleTasks.filter(p => p.isOnTime === true).length;
  const eligibleLate = eligibleTasks.filter(p => p.isOnTime === false).length;
  const eligibleOverdue = eligibleTasks.filter(p => {
    if (p.isCompleted) return false; // Only count pending overdue
    if (!p.dueDate) return false;
    const dueDate = new Date(p.dueDate);
    dueDate.setHours(23, 59, 59, 999);
    return now.getTime() > dueDate.getTime();
  }).length;

  // Productivity Score: (On Time × 1.0 + Late × 0.5 + Overdue × 0) ÷ Eligible Total × 100%
  const weightedScore = eligibleTotal > 0
    ? Math.round(((eligibleOnTime * 1.0) + (eligibleLate * 0.5) + (eligibleOverdue * 0)) / eligibleTotal * 100 * 10) / 10
    : 0;

  // Get color gradient based on percentage value
  const getColorForPercentage = (value: number) => {
    if (value >= 80) {
      return 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50';
    } else if (value >= 60) {
      return 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50';
    } else if (value >= 40) {
      return 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50';
    } else {
      return 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50';
    }
  };

  const Card = ({ 
    title, 
    value, 
    color, 
    icon, 
    description,
    formula,
    trend 
  }: { 
    title: string; 
    value: number | string; 
    color: string; 
    icon?: React.ReactNode;
    description?: string;
    formula?: string;
    trend?: { value: number; label: string }; // Future: untuk trend comparison
  }) => {
    const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null;
    const trendColor = trend ? (trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : 'text-gray-400') : '';
    
    return (
      <div className={`bg-white border rounded-lg p-3 w-full ${color}`.trim()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          {icon}
        </div>
        <div className="space-y-0.5">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {trend && TrendIcon && (
              <div className={`flex items-center gap-0.5 text-xs ${trendColor}`} title={trend.label}>
                <TrendIcon className="w-3 h-3" />
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {description && (
            <div className="text-xs text-gray-500">{description}</div>
          )}
          {formula && (
            <div className="text-[10px] text-gray-500 mt-1 font-mono leading-tight" title={formula}>
              {formula}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mb-2">
      <p className="text-[10px] text-gray-500 mb-1.5" title={t('dailyTaskReport.overview.dataDisclaimer', 'Completion and blocker data may be temporarily limited.')}>
        {t('dailyTaskReport.overview.dataDisclaimer', 'Completion and blocker data may be temporarily limited.')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
      <Card 
        title={t('dailyTaskReport.overview.totalAssignments', 'Total Assignments')} 
        value={total} 
        color="border-gray-200" 
      />
      <Card 
        title={t('dailyTaskReport.overview.completed', 'Completed')} 
        value={completed} 
        color="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50" 
      />
      <Card 
        title={t('dailyTaskReport.overview.onTime', 'On Time')} 
        value={ontime} 
        color="border-green-100 bg-gradient-to-br from-green-50 to-emerald-50" 
      />
      <Card 
        title={t('dailyTaskReport.overview.late', 'Late')} 
        value={late} 
        color="border-red-100 bg-gradient-to-br from-red-50 to-orange-50" 
      />
      <Card 
        title={t('dailyTaskReport.overview.efficiencyRate', 'Efficiency Rate')} 
        value={`${efficiencyRate}%`}
        color={getColorForPercentage(efficiencyRate)}
        description={applyVariables(t('dailyTaskReport.overview.efficiencyRate.description', '{{ontime}}/{{completed}} on time'), { ontime: String(ontime), completed: String(completed) })}
        formula={t('dailyTaskReport.overview.efficiencyRate.formula', 'On Time ÷ Completed')}
      />
      <Card 
        title={t('dailyTaskReport.overview.productivityScore', 'Productivity Score')} 
        value={`${weightedScore}%`}
        color={getColorForPercentage(weightedScore)}
        description={applyVariables(t('dailyTaskReport.overview.productivityScore.description', 'Only count: Completed + Overdue ({{count}} tasks)'), { count: String(eligibleTotal) })}
        formula={applyVariables(t('dailyTaskReport.overview.productivityScore.formula', '(On Time × 1.0 + Late × 0.5) ÷ {{count}}'), { count: String(eligibleTotal) })}
      />
      </div>
    </div>
  );
};


