import React from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Card, CardContent } from '@/features/ui/card';
import { TrendingUp, Target, Flame, CheckCircle2 } from 'lucide-react';

export const HabitStats = () => {
  const { stats, habits } = useHabitTracker();

  const totalHabits = habits.length;
  const activeHabits = habits.filter((h) => h.is_active).length;
  const totalCompletionRate = stats.length > 0
    ? stats.reduce((sum, s) => sum + s.completion_rate, 0) / stats.length
    : 0;
  const totalStreak = stats.reduce((sum, s) => sum + s.current_streak, 0);

  const statCards = [
    {
      label: 'Total Habits',
      value: totalHabits,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Active Habits',
      value: activeHabits,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Avg Completion',
      value: `${totalCompletionRate.toFixed(0)}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Total Streak',
      value: totalStreak,
      icon: Flame,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
