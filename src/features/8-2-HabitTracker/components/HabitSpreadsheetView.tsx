import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Checkbox } from '@/features/ui/checkbox';
import { Progress } from '@/features/ui/progress';
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
import { LoadingDots } from '@/components/LoadingDots';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from 'date-fns';
import { useToast } from '@/features/ui/use-toast';

export const HabitSpreadsheetView = () => {
  const { filteredHabits, entries, loading, addEntry, deleteEntry, deleteHabit } = useHabitTracker();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Single ref for unified scroll container
  const unifiedScrollRef = useRef<HTMLDivElement>(null);

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

  // Calculate daily progress for a specific date
  const getDailyProgress = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEntries = entries.filter((e) => e.entry_date === dateStr);
    const totalHabits = filteredHabits.length;
    const completedHabits = dayEntries.length;
    
    if (totalHabits === 0) return 0;
    return (completedHabits / totalHabits) * 100;
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
      const dayEntries = entries.filter((e) => e.entry_date === dateStr);
      const totalHabits = filteredHabits.length;
      const done = dayEntries.length;
      const left = Math.max(0, totalHabits - done);
      
      return {
        date: format(day, 'd'),
        dayName: format(day, 'EEE'),
        done: Math.round(done), // Round to integer
        left: Math.round(left), // Round to integer
        total: totalHabits,
      };
    });
  }, [monthDays, entries, filteredHabits]);


  // Handle checkbox toggle
  const handleCheckboxToggle = async (habitId: string, date: Date, checked: boolean) => {
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
    } catch (error) {
      console.error('Error toggling entry:', error);
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
              <tr>
                {/* Habit Name Column - Sticky */}
                <th
                  className="sticky left-0 z-30 bg-gray-50 border-r border-gray-300 px-4 py-2 text-left font-semibold text-sm text-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                  style={{ width: '250px', minWidth: '250px' }}
                >
                  Habit Name
                </th>
                {/* Date Columns */}
                {monthDays.map((day, index) => {
                  const isCurrentDay = isToday(day);
                  return (
                    <th
                      key={day.toISOString()}
                      className={`border-r border-gray-300 px-1 py-2 text-center text-xs font-medium text-gray-700 bg-gray-50 ${
                        isCurrentDay ? 'bg-blue-100' : ''
                      }`}
                      style={{ width: '45px', minWidth: '45px' }}
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
                <th className="border-r border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-100" style={{ width: '80px', minWidth: '80px' }}>
                  Goal
                </th>
                <th className="border-r border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-100" style={{ width: '80px', minWidth: '80px' }}>
                  Actual
                </th>
                <th className="border-r-0 px-3 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-100" style={{ width: '120px', minWidth: '120px' }}>
                  Progress
                </th>
              </tr>
              
              {/* Daily Stats Row - Right below date headers */}
              <tr className="bg-gray-50 border-t border-b border-gray-300">
                {/* Spacer for Habit Name column (250px) - Sticky */}
                <td className="sticky left-0 z-10 px-4 py-3 border-r border-gray-300 bg-gray-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ width: '250px', minWidth: '250px' }}>
                  <span className="text-xs font-semibold text-gray-700">Daily Stats</span>
                </td>
                
                {/* Stats aligned with date columns */}
                {chartData.map((dayData, index) => {
                  const day = monthDays[index];
                  const isCurrentDay = isToday(day);
                  const { goal, actual, progress } = getDailyStatsAnalysis(day);
                  
                  // Calculate percentage: (done / total) * 100
                  const percentage = dayData.total > 0 ? Math.round((dayData.done / dayData.total) * 100) : 0;
                  
                  return (
                    <td
                      key={`stats-${day.toISOString()}`}
                      className={`border-r border-gray-300 px-1 py-3 text-center ${
                        isCurrentDay ? 'bg-blue-100' : ''
                      }`}
                      style={{ width: '45px', minWidth: '45px' }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="text-[10px] font-bold text-gray-700">
                          {percentage}%
                        </div>
                      </div>
                    </td>
                  );
                })}
                
                {/* Goal Column for Daily Stats */}
                <td className="border-r border-gray-300 px-2 py-3 text-center bg-gray-50" style={{ width: '80px', minWidth: '80px' }}>
                  <div className="flex items-center justify-center gap-1">
                    <Target className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-900">
                      {getTotalMonthlyGoal()}
                    </span>
                  </div>
                </td>
                
                {/* Actual Column for Daily Stats */}
                <td className="border-r border-gray-300 px-2 py-3 text-center bg-gray-50" style={{ width: '80px', minWidth: '80px' }}>
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
                <td className="border-r-0 px-2 py-3 bg-gray-50" style={{ width: '120px', minWidth: '120px' }}>
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
                    >
                      {/* Habit Name Cell - Sticky */}
                      <td
                        className={`sticky left-0 z-10 border-r border-gray-300 border-b border-gray-300 px-4 py-3 shadow-[2px_0_4px_rgba(0,0,0,0.1)] transition-colors ${
                          isSelected ? 'bg-blue-50' : 'bg-white'
                        } group-hover:bg-gray-50`}
                        style={{ width: '250px', minWidth: '250px' }}
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
                        const isChecked = !!entry;
                        const isCurrentDay = isToday(day);

                        return (
                          <td
                            key={`${habit.id}-${day.toISOString()}`}
                            className={`border-r border-gray-300 border-b border-gray-300 px-1 py-2 text-center transition-colors cursor-pointer ${
                              isCurrentDay ? 'bg-blue-50' : 'bg-white'
                            } hover:bg-gray-100 ${
                              isSelected ? 'group-hover:bg-blue-100' : ''
                            }`}
                            style={{ width: '45px', minWidth: '45px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckboxToggle(habit.id, day, !isChecked);
                            }}
                          >
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  handleCheckboxToggle(habit.id, day, !!checked);
                                }}
                                className="h-4 w-4 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
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
                              className={`border-r border-gray-300 border-b border-gray-300 px-2 py-3 text-center bg-white ${
                                isSelected ? 'bg-blue-50' : ''
                              } group-hover:bg-gray-50`}
                              style={{ width: '80px', minWidth: '80px' }}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <Target className="h-3 w-3 text-gray-500" />
                                <span className="text-sm font-semibold text-gray-900">{goal}</span>
                              </div>
                            </td>
                            
                            {/* Actual Cell */}
                            <td
                              className={`border-r border-gray-300 border-b border-gray-300 px-2 py-3 text-center bg-white ${
                                isSelected ? 'bg-blue-50' : ''
                              } group-hover:bg-gray-50`}
                              style={{ width: '80px', minWidth: '80px' }}
                            >
                              <span className={`text-sm font-semibold ${
                                actual >= goal ? 'text-green-600' : actual >= goal * 0.5 ? 'text-blue-600' : 'text-gray-900'
                              }`}>
                                {actual}
                              </span>
                            </td>
                            
                            {/* Progress Bar Cell */}
                            <td
                              className={`border-r-0 border-b border-gray-300 px-2 py-3 bg-white ${
                                isSelected ? 'bg-blue-50' : ''
                              } group-hover:bg-gray-50`}
                              style={{ width: '120px', minWidth: '120px' }}
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
                  } catch (error) {
                    console.error('Error deleting habit:', error);
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
    </div>
  );
};
