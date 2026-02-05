import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Checkbox } from '@/features/ui/checkbox';
import { Progress } from '@/features/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/alert-dialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { HabitFormModal } from './HabitFormModal';
import { HabitTargetCountModal } from './HabitTargetCountModal';
import { LoadingDots } from '@/components/LoadingDots';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from 'date-fns';
import { useToast } from '@/features/ui/use-toast';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const HabitSpreadsheetView = () => {
  const { filteredHabits, entries, loading, addEntry, deleteEntry, deleteHabit, updateHabit } = useHabitTracker();
  const { toast } = useToast();
  const { t, dateLocale } = useAppTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [targetCountModal, setTargetCountModal] = useState<{ habitId: string; date: Date } | null>(null);
  const [monthlyHabitConfirmModal, setMonthlyHabitConfirmModal] = useState<{ habitId: string; date: Date; newDate: number; oldDate: number | null } | null>(null);
  const [selectedOldDate, setSelectedOldDate] = useState<number | null>(null);
  
  // Single ref for unified scroll container
  const unifiedScrollRef = useRef<HTMLDivElement>(null);

  // Add CSS for green checkbox when full
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .checkbox-full-green[data-state="checked"] {
        background-color: #16a34a !important;
        border-color: #16a34a !important;
      }
      .checkbox-full-green[data-state="checked"] svg {
        color: white !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get all days of current month
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    return days;
  }, [currentMonth]);

  // Get entries for a specific habit and date
  const getEntryForDate = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.find(
      (e) => e.habit_id === habitId && e.entry_date === dateStr
    );
  };

  // Get all entries count for a specific habit and date (for habits with target_count > 1)
  const getEntriesCountForDate = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.filter(
      (e) => e.habit_id === habitId && e.entry_date === dateStr
    ).length;
  };

  // Calculate goal, actual, and progress for a habit
  const getHabitAnalysis = (habit: any) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const totalDays = monthDays.length;
    
    // Calculate goal based on frequency
    let goal = 0;
    if (habit.frequency === 'daily') {
      // Daily: target_count per day × total days in month
      goal = totalDays * habit.target_count;
    } else if (habit.frequency === 'weekly') {
      // Weekly: calculate number of weeks in the month
      // Count weeks that have at least 1 day in this month
      const firstDay = monthStart.getDay(); // 0 = Sunday, 6 = Saturday
      const daysInFirstWeek = 7 - firstDay;
      const remainingDays = totalDays - daysInFirstWeek;
      const fullWeeks = Math.floor(remainingDays / 7);
      const daysInLastWeek = remainingDays % 7;
      const weeksInMonth = (daysInFirstWeek > 0 ? 1 : 0) + fullWeeks + (daysInLastWeek > 0 ? 1 : 0);
      goal = weeksInMonth * habit.target_count;
    } else if (habit.frequency === 'monthly') {
      // Monthly: just the target_count for the whole month
      goal = habit.target_count;
    }

    // Calculate actual entries for this month
    const monthEntries = entries.filter((e) => {
      if (e.habit_id !== habit.id) return false;
      const entryDate = new Date(e.entry_date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });
    const actual = monthEntries.length;

    // Calculate progress percentage
    const progress = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;

    return { goal, actual, progress };
  };

  // Helper function to check if a habit is active on a specific day
  const isHabitActiveOnDay = React.useCallback((habit: any, day: Date): boolean => {
    // First check if habit is globally active
    if (!habit.is_active) return false;
    
    if (habit.frequency === 'weekly') {
      if (habit.weekly_days && Array.isArray(habit.weekly_days) && habit.weekly_days.length > 0) {
        const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        // Ensure weekly_days contains numbers
        const weeklyDaysNumbers = habit.weekly_days.map((d: any) => Number(d));
        return weeklyDaysNumbers.includes(dayOfWeek);
      }
      return true; // If no weekly_days specified, assume active all days
    }
    
    if (habit.frequency === 'monthly') {
      // For monthly habits, only active on dates specified in monthly_dates
      if (habit.monthly_dates && Array.isArray(habit.monthly_dates) && habit.monthly_dates.length > 0) {
        const dayOfMonth = parseInt(format(day, 'd'));
        // Ensure monthly_dates contains numbers and check if dayOfMonth is included
        const monthlyDatesNumbers = habit.monthly_dates.map((d: any) => Number(d));
        const isIncluded = monthlyDatesNumbers.includes(dayOfMonth);
        return isIncluded;
      }
      // If no monthly_dates specified, assume not active (monthly habits need specific dates)
      return false;
    }
    
    // Daily habits are active every day
    return true;
  }, []);

  // Helper function to check if a habit is completed on a specific day
  const isHabitCompletedOnDay = React.useCallback((habit: any, day: Date, entriesList: any[]): boolean => {
    // If habit is not active, it cannot be completed
    if (!habit.is_active) return false;
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEntries = entriesList.filter((e) => e.habit_id === habit.id && e.entry_date === dateStr);
    
    // For monthly habits: target_count is for the whole month, not per day
    // If there's at least one entry on this date, the habit is completed for this day
    if (habit.frequency === 'monthly') {
      return dayEntries.length > 0;
    }
    
    // For weekly habits: target_count is for the whole week, not per day
    // If there's at least one entry on this date, the habit is completed for this day
    if (habit.frequency === 'weekly') {
      return dayEntries.length > 0;
    }
    
    // For daily habits with target_count > 1: 
    // Must reach target_count entries on this specific day
    if (habit.target_count > 1) {
      return dayEntries.length >= habit.target_count;
    }
    
    // For daily habits with target_count = 1, check if there's at least one entry
    return dayEntries.length > 0;
  }, []);

  // Calculate daily progress for a specific date
  const getDailyProgress = (date: Date) => {
    // Count only habits that are active on this day (exclude inactive habits)
    const activeHabits = filteredHabits.filter(habit => {
      // First check if habit is active
      if (!habit.is_active) return false;
      
      // Then check if habit is active on this specific day
      return isHabitActiveOnDay(habit, date);
    });
    
    const totalHabits = activeHabits.length;
    
    if (totalHabits === 0) return 0;
    
    // Count habits that are completed (not entries)
    // For habits with target_count > 1, only count as completed if entries count >= target_count
    const completedHabits = activeHabits.filter(habit => isHabitCompletedOnDay(habit, date, entries));
    const done = completedHabits.length;
    
    return (done / totalHabits) * 100;
  };

  // Calculate total monthly goal for Daily Stats (sum of all habits' monthly goals)
  const getTotalMonthlyGoal = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const totalDays = monthDays.length;
    
    let totalGoal = 0;
    filteredHabits.forEach((habit) => {
      if (habit.frequency === 'daily') {
        // Daily: target_count per day × total days in month
        totalGoal += totalDays * habit.target_count;
      } else if (habit.frequency === 'weekly') {
        // Weekly: calculate number of weeks in the month
        const firstDay = monthStart.getDay(); // 0 = Sunday, 6 = Saturday
        const daysInFirstWeek = 7 - firstDay;
        const remainingDays = totalDays - daysInFirstWeek;
        const fullWeeks = Math.floor(remainingDays / 7);
        const daysInLastWeek = remainingDays % 7;
        const weeksInMonth = (daysInFirstWeek > 0 ? 1 : 0) + fullWeeks + (daysInLastWeek > 0 ? 1 : 0);
        totalGoal += weeksInMonth * habit.target_count;
      } else if (habit.frequency === 'monthly') {
        // Monthly: just the target_count for the whole month
        totalGoal += habit.target_count;
      }
    });
    
    return totalGoal;
  };

  // Calculate daily goal, actual, and progress for Daily Stats
  const getDailyStatsAnalysis = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEntries = entries.filter((e) => e.entry_date === dateStr);
    
    // Calculate goal for this day based on all habits
    let goal = 0;
    filteredHabits.forEach((habit) => {
      if (habit.frequency === 'daily') {
        goal += habit.target_count;
      } else if (habit.frequency === 'weekly') {
        // Weekly: target_count per week, so divide by 7 days
        goal += habit.target_count / 7;
      } else if (habit.frequency === 'monthly') {
        // Monthly: target_count per month, so divide by days in month
        goal += habit.target_count / monthDays.length;
      }
    });
    
    // Actual is the number of entries for this day
    const actual = dayEntries.length;
    
    // Calculate progress percentage
    const progress = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;
    
    return { goal: Math.round(goal), actual, progress };
  };

  // Prepare chart data for done only
  const chartData = useMemo(() => {
    return monthDays.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Count only habits that are active on this day (exclude inactive habits)
      const activeHabits = filteredHabits.filter(habit => {
        // First check if habit is active
        if (!habit.is_active) return false;
        
        // Then check if habit is active on this specific day
        const isActiveOnThisDay = isHabitActiveOnDay(habit, day);
        return isActiveOnThisDay;
      });
      
      const totalHabits = activeHabits.length;
      
      // Count habits that are completed (not entries) - pass entries directly to ensure latest data
      // For habits with target_count > 1, only count as completed if entries count >= target_count
      const completedHabits = activeHabits.filter(habit => {
        const isCompleted = isHabitCompletedOnDay(habit, day, entries);
        return isCompleted;
      });
      
      const done = completedHabits.length;
      const left = Math.max(0, totalHabits - done);

      return {
        date: format(day, 'd'),
        dayName: format(day, 'EEE'),
        done: Math.round(done), // Round to integer
        left: Math.round(left), // Round to integer
        total: totalHabits,
      };
    });
  }, [monthDays, entries, filteredHabits, isHabitActiveOnDay, isHabitCompletedOnDay]);


  // Handle click on monthly habit checkbox that is not in monthly_dates
  const handleMonthlyHabitDateChange = (habitId: string, date: Date) => {
    const habit = filteredHabits.find((h) => h.id === habitId);
    if (!habit || habit.frequency !== 'monthly') return;

    const dayOfMonth = parseInt(format(date, 'd'));
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Count existing entries in this month
    const monthEntries = entries.filter((e) => {
      if (e.habit_id !== habit.id) return false;
      const entryDate = new Date(e.entry_date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });
    
    const currentEntriesCount = monthEntries.length;
    
    // If already reached target_count, cannot change
    if (currentEntriesCount >= habit.target_count) {
      toast({
        title: t('habitTracker.monthlyHabit.limitReached', 'Limit Tercapai'),
        description: t('habitTracker.monthlyHabit.limitReachedDescription', 'Anda sudah menyelesaikan {count} entry bulan ini. Silakan hapus entry yang ada terlebih dahulu.', {
          count: habit.target_count.toString()
        }),
        variant: 'destructive',
      });
      return;
    }
    
    // Determine default old date to replace
    // Only select from dates that are not checked (no entry exists) and not the newDate
    let defaultOldDate: number | null = null;
    
    if (habit.monthly_dates && habit.monthly_dates.length > 0) {
      // Get dates that are already checked (have entries)
      const checkedDates = monthEntries.map(e => {
        const entryDate = new Date(e.entry_date);
        return parseInt(format(entryDate, 'd'));
      });
      
      // Find first date from monthly_dates that:
      // 1. Is not the newDate
      // 2. Is not already checked (no entry exists)
      const availableOldDate = habit.monthly_dates.find((date: number) => {
        const dateNum = Number(date);
        return dateNum !== dayOfMonth && !checkedDates.includes(dateNum);
      });
      
      if (availableOldDate) {
        defaultOldDate = Number(availableOldDate);
      }
    }
    
    // Set default selected old date
    setSelectedOldDate(defaultOldDate);
    
    // Show confirmation modal
    setMonthlyHabitConfirmModal({
      habitId,
      date,
      newDate: dayOfMonth,
      oldDate: defaultOldDate,
    });
  };

  // Handle checkbox toggle
  const handleCheckboxToggle = async (habitId: string, date: Date, checked: boolean) => {
    const habit = filteredHabits.find((h) => h.id === habitId);
    
    // If frequency is daily and target_count > 1, show modal instead
    if (habit && habit.frequency === 'daily' && habit.target_count > 1) {
      setTargetCountModal({ habitId, date });
      return;
    }

    // Otherwise, use the original behavior
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingEntry = getEntryForDate(habitId, date);

    try {
      if (checked && !existingEntry) {
        // Add entry
        await addEntry(habitId, dateStr, 1);
        toast({
          title: 'Entry logged',
          description: `Habit logged for ${format(date, 'MMM d')}`,
        });
      } else if (!checked && existingEntry) {
        // Delete entry
        await deleteEntry(existingEntry.id);
        toast({
          title: 'Entry removed',
          description: `Entry removed for ${format(date, 'MMM d')}`,
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update entry',
        variant: 'destructive',
      });
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingDots size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-300 bg-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Habit Tracker</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={goToPreviousMonth}
                className="h-7 w-7 p-0 hover:bg-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[140px] text-center text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={goToNextMonth}
                className="h-7 w-7 p-0 hover:bg-gray-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Habit
          </Button>
        </div>
      </div>

      {/* Unified Scroll Container - Table, Daily Stats, and Chart */}
      <div ref={unifiedScrollRef} className="flex-1 overflow-x-auto overflow-y-auto seamless-scroll relative flex flex-col">
        <div className="flex-1 flex flex-col min-h-0" style={{ minWidth: `calc(250px + ${monthDays.length * 45}px + 280px)` }}>
          {/* Habit Table */}
          <div className="flex-shrink-0">
            <table className="border-collapse bg-white" style={{ width: '100%', minWidth: `calc(250px + ${monthDays.length * 45}px + 280px)` }}>
            {/* Header Row - Dates */}
            <thead className="bg-gray-50 sticky top-0 z-20 border-b border-gray-300" style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
              <tr style={{ height: '45px' }}>
                {/* Habit Name Column - Sticky */}
                <th
                  className="sticky left-0 z-30 bg-gray-50 border-r border-gray-300 px-4 text-left font-semibold text-sm text-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                  style={{ width: '250px', minWidth: '250px', height: '45px', verticalAlign: 'middle', paddingTop: '8px', paddingBottom: '8px' }}
                >
                  Habit Name
                </th>
                {/* Date Columns */}
                {monthDays.map((day, index) => {
                  const isCurrentDay = isToday(day);
                  return (
                    <th
                      key={day.toISOString()}
                      className={`border-r border-gray-300 px-1 text-center text-xs font-medium text-gray-700 bg-gray-50 ${
                        isCurrentDay ? 'bg-blue-100' : ''
                      }`}
                      style={{ width: '45px', minWidth: '45px', height: '45px', verticalAlign: 'middle', paddingTop: '8px', paddingBottom: '8px' }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-gray-500 uppercase">
                          {format(day, 'EEE')}
                        </span>
                        <span className={`text-sm font-semibold ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                    </th>
                  );
                })}
                {/* Analysis Columns */}
                <th className="border-r border-gray-300 px-3 text-center text-xs font-semibold text-gray-700 bg-gray-100" style={{ width: '80px', minWidth: '80px', height: '45px', verticalAlign: 'middle', paddingTop: '8px', paddingBottom: '8px' }}>
                  Goal
                </th>
                <th className="border-r border-gray-300 px-3 text-center text-xs font-semibold text-gray-700 bg-gray-100" style={{ width: '80px', minWidth: '80px', height: '45px', verticalAlign: 'middle', paddingTop: '8px', paddingBottom: '8px' }}>
                  Actual
                </th>
                <th className="border-r-0 px-3 text-center text-xs font-semibold text-gray-700 bg-gray-100" style={{ width: '120px', minWidth: '120px', height: '45px', verticalAlign: 'middle', paddingTop: '8px', paddingBottom: '8px' }}>
                  Progress
                </th>
              </tr>
              
              {/* Daily Stats Row - Right below date headers */}
              <tr className="bg-gray-50 border-t border-b border-gray-300" style={{ height: '45px' }}>
                {/* Spacer for Habit Name column (250px) - Sticky */}
                <td className="sticky left-0 z-10 px-4 border-r border-gray-300 bg-gray-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ width: '250px', minWidth: '250px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                  <span className="text-xs font-semibold text-gray-700">Daily Stats</span>
                </td>
                
                {/* Stats aligned with date columns */}
                {chartData.map((dayData, index) => {
                  const day = monthDays[index];
                  const isCurrentDay = isToday(day);
                  const { goal, actual, progress } = getDailyStatsAnalysis(day);
                  
                  // Calculate percentage: (done / total) * 100
                  const percentage = dayData.total > 0 ? Math.round((dayData.done / dayData.total) * 100) : 0;
                  
                  const isComplete = percentage === 100;
                  
                  return (
                    <td
                      key={`stats-${day.toISOString()}`}
                      className={`border-r border-gray-300 px-1 text-center ${
                        isCurrentDay ? 'bg-blue-100' : ''
                      }`}
                      style={{ width: '45px', minWidth: '45px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div 
                          className={`text-[10px] font-bold ${
                            isComplete 
                              ? 'bg-green-600 text-white px-1.5 py-0.5 rounded' 
                              : 'text-gray-700'
                          }`}
                        >
                          {percentage}%
                        </div>
                      </div>
                    </td>
                  );
                })}
                
                {/* Goal Column for Daily Stats */}
                <td className="border-r border-gray-300 px-2 text-center bg-gray-50" style={{ width: '80px', minWidth: '80px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                  <div className="flex items-center justify-center gap-1">
                    <Target className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-900">
                      {getTotalMonthlyGoal()}
                    </span>
                  </div>
                </td>
                
                {/* Actual Column for Daily Stats */}
                <td className="border-r border-gray-300 px-2 text-center bg-gray-50" style={{ width: '80px', minWidth: '80px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                  {(() => {
                    const totalGoal = getTotalMonthlyGoal();
                    const totalActual = chartData.reduce((sum, dayData, index) => sum + getDailyStatsAnalysis(monthDays[index]).actual, 0);
                    return (
                      <span className={`text-xs font-semibold ${
                        totalActual >= totalGoal 
                          ? 'text-green-600' 
                          : totalActual >= totalGoal * 0.5
                            ? 'text-blue-600' 
                            : 'text-gray-900'
                      }`}>
                        {totalActual}
                      </span>
                    );
                  })()}
                </td>
                
                {/* Progress Column for Daily Stats */}
                <td className="border-r-0 px-2 bg-gray-50" style={{ width: '120px', minWidth: '120px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                  {(() => {
                    const totalGoal = getTotalMonthlyGoal();
                    const totalActual = chartData.reduce((sum, dayData, index) => sum + getDailyStatsAnalysis(monthDays[index]).actual, 0);
                    const totalProgress = totalGoal > 0 ? Math.min((totalActual / totalGoal) * 100, 100) : 0;
                    const progressColor = totalProgress >= 100 ? 'bg-green-500' : totalProgress >= 50 ? 'bg-blue-500' : 'bg-yellow-500';
                    
                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`${progressColor} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(totalProgress, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-gray-700 min-w-[30px] text-right">
                          {Math.round(totalProgress)}%
                        </span>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            </thead>

            {/* Body - Habits Rows */}
            <tbody className="bg-white">
              {filteredHabits.length === 0 ? (
                <tr>
                  <td
                    colSpan={monthDays.length + 4}
                    className="px-4 py-12 text-center text-gray-500 border-b border-gray-200"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p>No habits found</p>
                      <Button onClick={() => setShowAddModal(true)} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Habit
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHabits.map((habit, habitIndex) => {
                  const isSelected = selectedHabit === habit.id;
                  const isLastRow = habitIndex === filteredHabits.length - 1;
                  return (
                    <tr
                      key={habit.id}
                      className={`group transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedHabit(habit.id)}
                      style={{ height: '45px' }}
                    >
                      {/* Habit Name Cell - Sticky */}
                      <td
                        className={`sticky left-0 z-10 border-r border-gray-300 border-b border-gray-300 px-4 shadow-[2px_0_4px_rgba(0,0,0,0.1)] transition-colors ${
                          isSelected ? 'bg-blue-50' : 'bg-white'
                        } group-hover:bg-gray-50`}
                        style={{ width: '250px', minWidth: '250px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                            style={{ backgroundColor: habit.color || '#3b82f6' }}
                          />
                          <span className="font-medium text-sm text-gray-900 flex-1 truncate">
                            {habit.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-gray-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingHabit(habit.id);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHabitToDelete({ id: habit.id, name: habit.name });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </td>

                      {/* Checkbox Cells */}
                      {monthDays.map((day, dayIndex) => {
                        const entry = getEntryForDate(habit.id, day);
                        const entriesCount = getEntriesCountForDate(habit.id, day);
                        const isCurrentDay = isToday(day);
                        const isMultiEntry = habit.frequency === 'daily' && habit.target_count > 1;
                        const isWeeklyHabit = habit.frequency === 'weekly';
                        const isMonthlyHabit = habit.frequency === 'monthly';
                        const isFull = entriesCount === habit.target_count;
                        const isPartial = entriesCount > 0 && entriesCount < habit.target_count;
                        const isEmpty = entriesCount === 0;
                        
                        // Check if day is allowed for weekly habits
                        let isDayAllowed = true;
                        if (isWeeklyHabit && habit.weekly_days && habit.weekly_days.length > 0) {
                          // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
                          const dayOfWeek = day.getDay();
                          isDayAllowed = habit.weekly_days.includes(dayOfWeek);
                        }
                        
                        // Check if date is allowed for monthly habits
                        if (isMonthlyHabit && habit.monthly_dates && habit.monthly_dates.length > 0) {
                          // Get day of month (1-31)
                          const dayOfMonth = parseInt(format(day, 'd'));
                          isDayAllowed = habit.monthly_dates.includes(dayOfMonth);
                        }
                        
                        // Determine checkbox state
                        // For multi-entry habits: indeterminate if partial, checked if full, unchecked if empty
                        // For regular habits: checked if has entries, unchecked if empty
                        let checkboxState: boolean | "indeterminate";
                        if (isMultiEntry) {
                          if (isPartial) {
                            checkboxState = "indeterminate";
                          } else if (isFull) {
                            checkboxState = true;
                          } else {
                            checkboxState = false;
                          }
                        } else {
                          checkboxState = entriesCount > 0;
                        }

                        return (
                          <td
                            key={`${habit.id}-${day.toISOString()}`}
                            className={`border-r border-gray-300 border-b border-gray-300 px-1 text-center transition-colors ${
                              isDayAllowed 
                                ? 'cursor-pointer hover:bg-gray-100' 
                                : isMonthlyHabit 
                                  ? 'cursor-pointer opacity-50 hover:opacity-70' 
                                  : 'cursor-not-allowed opacity-50'
                            } ${
                              isCurrentDay ? 'bg-blue-50' : 'bg-white'
                            } ${
                              isSelected && isDayAllowed ? 'group-hover:bg-blue-100' : ''
                            }`}
                            style={{ width: '45px', minWidth: '45px', height: '45px', maxHeight: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px', overflow: 'hidden', lineHeight: '1' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // For monthly habits with disabled dates, show confirmation modal
                              if (!isDayAllowed && isMonthlyHabit) {
                                handleMonthlyHabitDateChange(habit.id, day);
                                return;
                              }
                              if (!isDayAllowed) return; // Don't allow clicking if day is not allowed
                              // For partial state, clicking should still open modal
                              handleCheckboxToggle(habit.id, day, !isFull);
                            }}
                            title={
                              !isDayAllowed 
                                ? isWeeklyHabit 
                                  ? 'Hari ini tidak dipilih untuk habit ini'
                                  : isMonthlyHabit
                                  ? 'Klik untuk mengubah tanggal habit ini'
                                  : 'Hari ini tidak dipilih untuk habit ini'
                                : isMultiEntry && entriesCount > 0 
                                  ? `${entriesCount}/${habit.target_count} completed` 
                                  : undefined
                            }
                          >
                            <div className="flex flex-col items-center justify-center" style={{ height: '33px', maxHeight: '33px', overflow: 'hidden' }}>
                              {isMultiEntry ? (
                                <>
                                  {/* Spacer di atas untuk checkbox dengan counter agar sejajar dengan yang tanpa counter */}
                                  <div style={{ height: '8px', flexShrink: 0, minHeight: '8px', maxHeight: '8px' }}></div>
                                  <div className="flex items-center justify-center flex-shrink-0" style={{ height: '16px', minHeight: '16px', maxHeight: '16px' }}>
                                    <Checkbox
                                      checked={checkboxState}
                                      onCheckedChange={(checked) => {
                                        if (!isDayAllowed && isMonthlyHabit) {
                                          handleMonthlyHabitDateChange(habit.id, day);
                                          return;
                                        }
                                        if (!isDayAllowed) return;
                                        handleCheckboxToggle(habit.id, day, !!checked);
                                      }}
                                      disabled={!isDayAllowed && !isMonthlyHabit}
                                      className={`h-4 w-4 ${
                                        isDayAllowed || (isMonthlyHabit && !isDayAllowed)
                                          ? 'cursor-pointer' 
                                          : 'cursor-not-allowed opacity-50'
                                      } ${
                                        checkboxState === true ? 'checkbox-full-green' : ''
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isDayAllowed && isMonthlyHabit) {
                                          handleMonthlyHabitDateChange(habit.id, day);
                                          return;
                                        }
                                        if (!isDayAllowed) e.preventDefault();
                                      }}
                                    />
                                  </div>
                                  {entriesCount > 0 ? (
                                    <div className="flex items-center justify-center flex-shrink-0" style={{ height: '9px', minHeight: '9px', maxHeight: '9px', marginTop: '0px' }}>
                                      <span className={`text-[8px] font-semibold leading-none ${
                                        isFull ? 'text-green-600' : 'text-orange-600'
                                      }`}>
                                        {entriesCount}/{habit.target_count}
                                      </span>
                                    </div>
                                  ) : (
                                    <div style={{ height: '9px', flexShrink: 0, minHeight: '9px', maxHeight: '9px' }}></div>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center justify-center" style={{ height: '100%' }}>
                                  <Checkbox
                                    checked={checkboxState}
                                    onCheckedChange={(checked) => {
                                      if (!isDayAllowed && isMonthlyHabit) {
                                        handleMonthlyHabitDateChange(habit.id, day);
                                        return;
                                      }
                                      if (!isDayAllowed) return;
                                      handleCheckboxToggle(habit.id, day, !!checked);
                                    }}
                                    disabled={!isDayAllowed && !isMonthlyHabit}
                                    className={`h-4 w-4 ${
                                      isDayAllowed || (isMonthlyHabit && !isDayAllowed)
                                        ? 'cursor-pointer' 
                                        : 'cursor-not-allowed opacity-50'
                                    } ${
                                      checkboxState === true ? 'checkbox-full-green' : ''
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDayAllowed && isMonthlyHabit) {
                                        handleMonthlyHabitDateChange(habit.id, day);
                                        return;
                                      }
                                      if (!isDayAllowed) e.preventDefault();
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      
                      {/* Analysis Cells */}
                      {(() => {
                        const { goal, actual, progress } = getHabitAnalysis(habit);
                        const progressColor = progress >= 100 ? 'bg-green-600' : progress >= 50 ? 'bg-blue-600' : 'bg-yellow-500';
                        
                        return (
                          <>
                            {/* Goal Cell */}
                            <td
                              className={`border-r border-gray-300 border-b border-gray-300 px-2 text-center bg-white ${
                                isSelected ? 'bg-blue-50' : ''
                              } group-hover:bg-gray-50`}
                              style={{ width: '80px', minWidth: '80px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <Target className="h-3 w-3 text-gray-500" />
                                <span className="text-sm font-semibold text-gray-900">{goal}</span>
                              </div>
                            </td>
                            
                            {/* Actual Cell */}
                            <td
                              className={`border-r border-gray-300 border-b border-gray-300 px-2 text-center bg-white ${
                                isSelected ? 'bg-blue-50' : ''
                              } group-hover:bg-gray-50`}
                              style={{ width: '80px', minWidth: '80px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}
                            >
                              <span className={`text-sm font-semibold ${
                                actual >= goal ? 'text-green-600' : actual >= goal * 0.5 ? 'text-blue-600' : 'text-gray-900'
                              }`}>
                                {actual}
                              </span>
                            </td>
                            
                            {/* Progress Bar Cell */}
                            <td
                              className={`border-r-0 border-b border-gray-300 px-2 bg-white ${
                                isSelected ? 'bg-blue-50' : ''
                              } group-hover:bg-gray-50`}
                              style={{ width: '120px', minWidth: '120px', height: '45px', verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`${progressColor} h-2 rounded-full transition-all duration-300`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 min-w-[35px] text-right">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

          {/* Spacing between table and daily stats */}
          <div className="flex-1"></div>

          {/* Daily Progress Chart Section - Sticky at bottom */}
          <div className="sticky bottom-0 z-20 flex-shrink-0 border-t border-gray-300 bg-gray-50">
            <div className="flex flex-col" style={{ minWidth: `calc(250px + ${monthDays.length * 45}px + 280px)` }}>
              {/* Chart Row */}
              <div className="flex border-t border-gray-300 py-4">
                {/* Spacer for Habit Name column (250px) - Sticky */}
                <div className="sticky left-0 z-10 flex-shrink-0 px-4 border-r border-gray-300 bg-gray-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ width: '250px', minWidth: '250px' }}>
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-700">Daily Progress Chart</span>
                  </div>
                </div>
                
                {/* Chart aligned with date columns */}
                <div className="flex-1 flex-shrink-0" style={{ width: `${monthDays.length * 45}px`, minWidth: `${monthDays.length * 45}px` }}>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart 
                  data={chartData} 
                  margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                  barCategoryGap={0}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tickMargin={8}
                    type="category"
                    scale="point"
                    padding={{ left: 0, right: 0 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                    width={40}
                    domain={[0, 'dataMax']}
                    allowDecimals={false}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [Math.round(value), 'Done']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="done" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Spacer for analysis columns (280px) */}
              <div className="flex-shrink-0 border-l border-gray-300 bg-gray-50" style={{ width: '280px', minWidth: '280px' }}></div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <HabitFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editingHabit && (
        <HabitFormModal
          isOpen={!!editingHabit}
          onClose={() => setEditingHabit(null)}
          habitId={editingHabit}
        />
      )}
      {targetCountModal && (
        <HabitTargetCountModal
          isOpen={!!targetCountModal}
          onClose={() => setTargetCountModal(null)}
          habitId={targetCountModal.habitId}
          date={targetCountModal.date}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!habitToDelete} onOpenChange={(open) => !open && setHabitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Habit
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Are you sure you want to delete this habit?
                </div>
                {habitToDelete && (
                  <div className="font-semibold text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                    "{habitToDelete.name}"
                  </div>
                )}
                <div className="text-red-600 font-medium text-sm">
                  This action cannot be undone. This will permanently delete the habit and all its associated entries.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (habitToDelete) {
                  try {
                    await deleteHabit(habitToDelete.id);
                    setHabitToDelete(null);
                    toast({
                      title: 'Habit deleted',
                      description: `"${habitToDelete.name}" has been deleted successfully`,
                    });
                  } catch {
                    toast({
                      title: 'Error',
                      description: 'Failed to delete habit',
                      variant: 'destructive',
                    });
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Habit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Monthly Habit Date Change Confirmation Dialog */}
      <AlertDialog open={!!monthlyHabitConfirmModal} onOpenChange={(open) => {
        if (!open) {
          setMonthlyHabitConfirmModal(null);
          setSelectedOldDate(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              {t('habitTracker.monthlyHabit.changeDateTitle', 'Ubah Tanggal Habit Bulanan')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {monthlyHabitConfirmModal && (() => {
                  const habit = filteredHabits.find((h) => h.id === monthlyHabitConfirmModal.habitId);
                  const availableDates = habit?.monthly_dates || [];
                  
                  // Get entries for this month to check which dates are already checked
                  const monthStart = startOfMonth(currentMonth);
                  const monthEnd = endOfMonth(currentMonth);
                  const monthEntries = entries.filter((e) => {
                    if (!habit || e.habit_id !== habit.id) return false;
                    const entryDate = new Date(e.entry_date);
                    return entryDate >= monthStart && entryDate <= monthEnd;
                  });
                  
                  // Get dates that are already checked (have entries)
                  const checkedDates = monthEntries.map(e => {
                    const entryDate = new Date(e.entry_date);
                    return parseInt(format(entryDate, 'd'));
                  });
                  
                  // Filter: only show dates that are:
                  // 1. Not the newDate
                  // 2. Not already checked (no entry exists for that date)
                  const selectableDates = availableDates.filter((date: number) => {
                    const dateNum = Number(date);
                    return dateNum !== monthlyHabitConfirmModal.newDate && !checkedDates.includes(dateNum);
                  });
                  
                  // Format date for display
                  const formatDateForDisplay = (dayOfMonth: number) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayOfMonth);
                    return format(date, 'd MMMM yyyy', { locale: dateLocale });
                  };
                  
                  return (
                    <>
                      <div className="text-sm text-gray-600">
                        {t('habitTracker.monthlyHabit.changeDateQuestion', 'Apakah Anda ingin mengubah tanggal habit bulanan ini ke tanggal {date}?', {
                          date: formatDateForDisplay(monthlyHabitConfirmModal.newDate)
                        })}
                      </div>
                      {habit && (
                        <div className="font-semibold text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                          "{habit.name}"
                        </div>
                      )}
                      {selectableDates.length > 0 ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {t('habitTracker.monthlyHabit.selectOldDate', 'Pilih tanggal yang akan diganti:')}
                          </label>
                          <Select
                            value={selectedOldDate?.toString() || ''}
                            onValueChange={(value) => {
                              setSelectedOldDate(parseInt(value));
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('habitTracker.monthlyHabit.selectOldDatePlaceholder', 'Pilih tanggal')} />
                            </SelectTrigger>
                            <SelectContent>
                              {selectableDates.map((date: number) => {
                                const dateNum = Number(date);
                                return (
                                  <SelectItem key={date} value={date.toString()}>
                                    {formatDateForDisplay(dateNum)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          {t('habitTracker.monthlyHabit.noDateToReplace', 'Tidak ada tanggal yang bisa diganti')}
                        </div>
                      )}
                      {selectedOldDate && (
                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
                          {t('habitTracker.monthlyHabit.dateChangeInfo', 'Tanggal {oldDate} akan dinonaktifkan dan diganti dengan tanggal {newDate}', {
                            oldDate: formatDateForDisplay(selectedOldDate),
                            newDate: formatDateForDisplay(monthlyHabitConfirmModal.newDate)
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setMonthlyHabitConfirmModal(null);
              setSelectedOldDate(null);
            }}>
              {t('common.cancel', 'Batal')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedOldDate}
              onClick={async () => {
                if (!monthlyHabitConfirmModal) return;
                
                // Validate that old date is selected
                if (!selectedOldDate) {
                  toast({
                    title: t('common.error', 'Error'),
                    description: t('habitTracker.monthlyHabit.selectOldDateRequired', 'Silakan pilih tanggal yang akan diganti'),
                    variant: 'destructive',
                  });
                  return;
                }
                
                try {
                  const habit = filteredHabits.find((h) => h.id === monthlyHabitConfirmModal.habitId);
                  if (!habit) return;

                  const monthStart = startOfMonth(currentMonth);
                  const monthEnd = endOfMonth(currentMonth);
                  
                  // Get existing entries in this month
                  const monthEntries = entries.filter((e) => {
                    if (e.habit_id !== habit.id) return false;
                    const entryDate = new Date(e.entry_date);
                    return entryDate >= monthStart && entryDate <= monthEnd;
                  });
                  
                  // Get current monthly_dates
                  const currentMonthlyDates = habit.monthly_dates || [];
                  
                  // Calculate new monthly_dates
                  // Remove selectedOldDate and add newDate
                  const newMonthlyDates = currentMonthlyDates
                    .filter((d: number) => Number(d) !== selectedOldDate)
                    .concat([monthlyHabitConfirmModal.newDate])
                    .sort((a, b) => a - b);
                  
                  // Update habit with new monthly_dates
                  await updateHabit(habit.id, {
                    monthly_dates: newMonthlyDates,
                  });
                  
                  // Move entries from old date to new date
                  const newDateStr = format(monthlyHabitConfirmModal.date, 'yyyy-MM-dd');
                  
                  // Find entries on the old date
                  const oldDateEntries = monthEntries.filter(e => {
                    const entryDate = new Date(e.entry_date);
                    const entryDayOfMonth = parseInt(format(entryDate, 'd'));
                    return entryDayOfMonth === selectedOldDate;
                  });
                  
                  // Delete old entries
                  for (const entry of oldDateEntries) {
                    await deleteEntry(entry.id);
                  }
                  
                  // Create new entry on the new date if there was an entry on old date
                  if (oldDateEntries.length > 0) {
                    await addEntry(habit.id, newDateStr, 1);
                  }
                  
                  // Format dates for toast message
                  const formatDateForToast = (dayOfMonth: number) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayOfMonth);
                    return format(date, 'd MMMM yyyy', { locale: dateLocale });
                  };
                  
                  setMonthlyHabitConfirmModal(null);
                  setSelectedOldDate(null);
                  toast({
                    title: t('habitTracker.monthlyHabit.dateChanged', 'Tanggal diubah'),
                    description: t('habitTracker.monthlyHabit.dateChangedDescriptionWithOld', 'Tanggal habit bulanan telah diubah dari tanggal {oldDate} ke tanggal {newDate}', {
                      oldDate: formatDateForToast(selectedOldDate),
                      newDate: formatDateForToast(monthlyHabitConfirmModal.newDate)
                    }),
                  });
                } catch {
                  toast({
                    title: t('common.error', 'Error'),
                    description: t('habitTracker.monthlyHabit.changeDateError', 'Gagal mengubah tanggal habit'),
                    variant: 'destructive',
                  });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('habitTracker.monthlyHabit.changeDateButton', 'Ubah Tanggal')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
