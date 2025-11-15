import React from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const OverviewCards = () => {
  const { filtered } = useDailyTaskReport();
  const total = filtered.length;
  const completed = filtered.filter(p => p.isCompleted).length;
  const withDue = filtered.filter(p => p.dueDate).length;
  const ontime = filtered.filter(p => p.isOnTime === true).length;
  const late = filtered.filter(p => p.isOnTime === false).length;
  const pending = total - completed;

  // Calculate Efficiency Rate: (On Time / Completed) × 100%
  const efficiencyRate = completed > 0 ? Math.round((ontime / completed) * 100 * 10) / 10 : 0;

  // Calculate Weighted Productivity Score: ((On Time × 1.0) + (Late × 0.5) + (Pending × 0)) / Total × 100%
  const weightedScore = total > 0 
    ? Math.round(((ontime * 1.0) + (late * 0.5) + (pending * 0)) / total * 100 * 10) / 10 
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
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 mb-2">
      <Card 
        title="Total Assignments" 
        value={total} 
        color="border-gray-200" 
      />
      <Card 
        title="Completed" 
        value={completed} 
        color="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50" 
      />
      <Card 
        title="On Time" 
        value={ontime} 
        color="border-green-100 bg-gradient-to-br from-green-50 to-emerald-50" 
      />
      <Card 
        title="Late" 
        value={late} 
        color="border-red-100 bg-gradient-to-br from-red-50 to-orange-50" 
      />
      <Card 
        title="Efficiency Rate" 
        value={`${efficiencyRate}%`}
        color={getColorForPercentage(efficiencyRate)}
        description={`${ontime}/${completed} on time`}
        formula="On Time ÷ Completed"
      />
      <Card 
        title="Productivity Score" 
        value={`${weightedScore}%`}
        color={getColorForPercentage(weightedScore)}
        description={`Weighted: On Time 100%, Late 50%`}
        formula="(On Time + Late×0.5) ÷ Total"
      />
    </div>
  );
};


