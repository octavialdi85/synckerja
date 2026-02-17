import React, { useEffect, useState, useMemo } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Label } from '@/features/ui/label';
import { useToast } from '@/features/ui/use-toast';
import { startOfMonth, getDaysInMonth, getDay, format } from 'date-fns';
import { id } from 'date-fns/locale';

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitId?: string | null;
}

export const HabitFormModal = ({ isOpen, onClose, habitId }: HabitFormModalProps) => {
  const { habits, addHabit, updateHabit } = useHabitTracker();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [checklistNames, setChecklistNames] = useState<string[]>([]);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]); // Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
  const [monthlyDates, setMonthlyDates] = useState<number[]>([]); // Array of dates (1-31) for monthly habits
  const [color, setColor] = useState('#3b82f6');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Day names for weekly selection
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  
  // Get current month info for monthly date selection
  const currentDate = new Date();
  const currentMonthStart = startOfMonth(currentDate);
  const daysInCurrentMonth = getDaysInMonth(currentDate);
  const firstDayOfWeek = getDay(currentMonthStart); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentMonthName = format(currentDate, 'MMMM yyyy', { locale: id }); // e.g., "Januari 2026"
  
  // Generate calendar grid for current month
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [firstDayOfWeek, daysInCurrentMonth]);

  const habit = habitId ? habits.find((h) => h.id === habitId) : null;

  // Load habit data when editing
  useEffect(() => {
    let isMounted = true;

    if (!isOpen) {
      // Reset when modal closes
      setIsInitializing(false);
      return () => { isMounted = false; };
    }

    // If editing but habit not found yet, wait for it to load
    if (habitId && !habit) {
      return () => { isMounted = false; };
    }

    setIsInitializing(true);
    
    if (habit && habitId) {
      setName(habit.name);
      setDescription(habit.description || '');
      setFrequency(habit.frequency);
      setTargetCount(habit.target_count);
      
      // Load weekly_days from database (for weekly frequency)
      let loadedWeeklyDays: number[] = [];
      if (habit.frequency === 'weekly' && habit.weekly_days) {
        if (Array.isArray(habit.weekly_days)) {
          loadedWeeklyDays = habit.weekly_days.filter((day: any) => typeof day === 'number' && day >= 0 && day <= 6);
        } else if (typeof habit.weekly_days === 'string') {
          try {
            const parsed = JSON.parse(habit.weekly_days);
            if (Array.isArray(parsed)) {
              loadedWeeklyDays = parsed.filter((day: any) => typeof day === 'number' && day >= 0 && day <= 6);
            }
          } catch {
            // Invalid weekly_days format, use empty
          }
        }
      }
      setWeeklyDays(loadedWeeklyDays);
      
      // Load monthly_dates from database (for monthly frequency)
      let loadedMonthlyDates: number[] = [];
      if (habit.frequency === 'monthly' && habit.monthly_dates) {
        if (Array.isArray(habit.monthly_dates)) {
          loadedMonthlyDates = habit.monthly_dates.filter((date: any) => typeof date === 'number' && date >= 1 && date <= 31);
        } else if (typeof habit.monthly_dates === 'string') {
          try {
            const parsed = JSON.parse(habit.monthly_dates);
            if (Array.isArray(parsed)) {
              loadedMonthlyDates = parsed.filter((date: any) => typeof date === 'number' && date >= 1 && date <= 31);
            }
          } catch {
            // Invalid monthly_dates format, use empty
          }
        }
      }
      setMonthlyDates(loadedMonthlyDates);
      
      // Load checklist_names from database (only for daily frequency)
      let loadedChecklistNames: string[] = [];
      
      if (habit.frequency === 'daily' && habit.checklist_names) {
        if (Array.isArray(habit.checklist_names)) {
          loadedChecklistNames = habit.checklist_names.map(name => 
            name && typeof name === 'string' ? name.trim() : ''
          );
        } else if (typeof habit.checklist_names === 'string') {
          try {
            const parsed = JSON.parse(habit.checklist_names);
            if (Array.isArray(parsed)) {
              loadedChecklistNames = parsed.map(name => 
                name && typeof name === 'string' ? name.trim() : ''
              );
            }
          } catch {
            // Invalid checklist_names format, use empty
          }
        }
      }

      // Ensure array has exactly target_count items (pad with empty strings if needed)
      // Only for daily frequency
      const finalChecklistNames = habit.frequency === 'daily' && habit.target_count > 1
        ? Array.from({ length: habit.target_count }, (_, idx) => {
            return loadedChecklistNames[idx] || '';
          })
        : [];

      // Use requestAnimationFrame to ensure state updates happen in the right order
      requestAnimationFrame(() => {
        if (!isMounted) return;
        setChecklistNames(finalChecklistNames);
        setColor(habit.color || '#3b82f6');
        setIsActive(habit.is_active);
        
        // Small delay to ensure state is set before allowing targetCount changes to affect checklistNames
        setTimeout(() => {
          if (!isMounted) return;
          setIsInitializing(false);
        }, 100);
      });
    } else {
      // Reset form for new habit
      setName('');
      setDescription('');
      setFrequency('daily');
      setTargetCount(1);
      setChecklistNames([]);
      setWeeklyDays([]);
      setMonthlyDates([]);
      setColor('#3b82f6');
      setIsActive(true);
      setIsInitializing(false);
    }

    return () => { isMounted = false; };
  }, [habit, isOpen, habitId]);

  // Update checklist names when target count changes (only when user manually changes it)
  // Only for daily frequency habits
  useEffect(() => {
    // Don't update during initialization or when modal is closed
    if (!isOpen || isInitializing) {
      return;
    }

    // Only update checklist names for daily frequency
    if (frequency !== 'daily') {
      // Clear checklist names if frequency is not daily
      if (checklistNames.length > 0) {
        setChecklistNames([]);
      }
      return;
    }

    // Don't update if we're editing and this is the initial load
    if (habit && targetCount === habit.target_count) {
      return;
    }

    // User has changed targetCount, update checklistNames accordingly
    if (targetCount > 1) {
      const currentLength = checklistNames.length;
      if (currentLength < targetCount) {
        const newNames = [...checklistNames];
        for (let i = currentLength; i < targetCount; i++) {
          newNames.push('');
        }
        setChecklistNames(newNames);
      } else if (currentLength > targetCount) {
        setChecklistNames(checklistNames.slice(0, targetCount));
      }
    } else {
      setChecklistNames([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCount, frequency, isOpen, isInitializing]);

  // Clear checklist names when frequency changes from daily to something else
  useEffect(() => {
    if (!isOpen || isInitializing) return;

    if (frequency !== 'daily' && checklistNames.length > 0) {
      setChecklistNames([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, isOpen, isInitializing]);

  // Trim weekly days if target count is reduced
  useEffect(() => {
    if (!isOpen || isInitializing) return;
    if (frequency !== 'weekly') return;
    
    // If weekly days exceed target count, trim to target count
    if (weeklyDays.length > targetCount) {
      const trimmedDays = weeklyDays.slice(0, targetCount);
      setWeeklyDays(trimmedDays);
      toast({
        title: 'Days Selection Updated',
        description: `Reduced to ${targetCount} day${targetCount > 1 ? 's' : ''} to match target count`,
        variant: 'default',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCount, frequency, isOpen, isInitializing]);

  // Trim monthly dates if target count is reduced
  useEffect(() => {
    if (!isOpen || isInitializing) return;
    if (frequency !== 'monthly') return;
    
    // If monthly dates exceed target count, trim to target count
    if (monthlyDates.length > targetCount) {
      const trimmedDates = monthlyDates.slice(0, targetCount).sort((a, b) => a - b);
      setMonthlyDates(trimmedDates);
      toast({
        title: 'Dates Selection Updated',
        description: `Reduced to ${targetCount} date${targetCount > 1 ? 's' : ''} to match target count`,
        variant: 'default',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCount, frequency, isOpen, isInitializing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a habit name',
        variant: 'destructive',
      });
      return;
    }

    // Validate weekly days if frequency is weekly
    if (frequency === 'weekly') {
      if (weeklyDays.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select at least one day for weekly habit',
          variant: 'destructive',
        });
        return;
      }
      if (weeklyDays.length > targetCount) {
        toast({
          title: 'Error',
          description: `You can only select up to ${targetCount} day${targetCount > 1 ? 's' : ''} for this habit. Please deselect ${weeklyDays.length - targetCount} day${weeklyDays.length - targetCount > 1 ? 's' : ''}`,
          variant: 'destructive',
        });
        return;
      }
      if (targetCount > 1 && weeklyDays.length < targetCount) {
        toast({
          title: 'Error',
          description: `Please select at least ${targetCount} days for this habit`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate monthly dates if frequency is monthly
    if (frequency === 'monthly') {
      if (monthlyDates.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select at least one date for monthly habit',
          variant: 'destructive',
        });
        return;
      }
      if (monthlyDates.length > targetCount) {
        toast({
          title: 'Error',
          description: `You can only select up to ${targetCount} date${targetCount > 1 ? 's' : ''} for this habit. Please deselect ${monthlyDates.length - targetCount} date${monthlyDates.length - targetCount > 1 ? 's' : ''}`,
          variant: 'destructive',
        });
        return;
      }
      if (targetCount > 1 && monthlyDates.length < targetCount) {
        toast({
          title: 'Error',
          description: `Please select at least ${targetCount} dates for this habit`,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (habitId && habit) {
        // Ensure checklist_names array has exactly targetCount items
        const finalChecklistNames = targetCount > 1 && frequency === 'daily'
          ? Array.from({ length: targetCount }, (_, idx) => checklistNames[idx] || '')
          : undefined;
        
        // Ensure weekly_days is set for weekly habits
        const finalWeeklyDays = frequency === 'weekly' && weeklyDays.length > 0
          ? weeklyDays
          : undefined;
        
        // Ensure monthly_dates is set for monthly habits
        const finalMonthlyDates = frequency === 'monthly' && monthlyDates.length > 0
          ? monthlyDates
          : undefined;
        
        await updateHabit(habitId, {
          name,
          description,
          frequency,
          target_count: targetCount,
          checklist_names: finalChecklistNames,
          weekly_days: finalWeeklyDays,
          monthly_dates: finalMonthlyDates,
          color,
          is_active: isActive,
        });
        toast({
          title: 'Success',
          description: 'Habit updated successfully',
        });
      } else {
        // Ensure checklist_names array has exactly targetCount items
        const finalChecklistNames = targetCount > 1 && frequency === 'daily'
          ? Array.from({ length: targetCount }, (_, idx) => checklistNames[idx] || '')
          : undefined;
        
        // Ensure weekly_days is set for weekly habits
        const finalWeeklyDays = frequency === 'weekly' && weeklyDays.length > 0
          ? weeklyDays
          : undefined;
        
        // Ensure monthly_dates is set for monthly habits
        const finalMonthlyDates = frequency === 'monthly' && monthlyDates.length > 0
          ? monthlyDates
          : undefined;
        
        await addHabit({
          name,
          description,
          frequency,
          target_count: targetCount,
          checklist_names: finalChecklistNames,
          weekly_days: finalWeeklyDays,
          monthly_dates: finalMonthlyDates,
          color,
          is_active: isActive,
        });
        toast({
          title: 'Success',
          description: 'Habit created successfully',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save habit',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[600px] h-[600px] max-w-[600px] max-h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle>{habitId ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
          <DialogDescription>
            {habitId ? 'Update your habit details' : 'Track your habits and build better routines'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto seamless-scroll px-6 py-4 space-y-4 min-h-0">
            <div>
              <Label htmlFor="name">Habit Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Exercise, Read, Meditate"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetCount">Target Count</Label>
                <Input
                  id="targetCount"
                  type="number"
                  min="1"
                  value={targetCount}
                  onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            {frequency === 'daily' && targetCount > 1 && (
              <div className="space-y-2">
                <Label>Checklist Names</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Enter names for each checklist item (e.g., Solat Subuh, Solat Zuhur, etc.)
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto seamless-scroll border border-gray-200 rounded-md p-3">
                  {Array.from({ length: targetCount }, (_, index) => {
                    const currentValue = checklistNames[index] || '';
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Label htmlFor={`checklist-${index}`} className="text-sm font-medium min-w-[80px]">
                          Checklist {index + 1}:
                        </Label>
                        <Input
                          id={`checklist-${index}`}
                          value={currentValue}
                          onChange={(e) => {
                            const newNames = [...checklistNames];
                            // Ensure array has correct length
                            while (newNames.length < targetCount) {
                              newNames.push('');
                            }
                            newNames[index] = e.target.value;
                            setChecklistNames(newNames);
                          }}
                          placeholder={`e.g., ${index === 0 ? 'Solat Subuh' : index === 1 ? 'Solat Zuhur' : index === 2 ? 'Solat Ashar' : index === 3 ? 'Solat Maghrib' : 'Solat Isya'}`}
                          className="flex-1"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Pilih Hari</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Pilih hari-hari dalam seminggu untuk habit ini {targetCount > 1 ? `(minimal ${targetCount} hari, maksimal ${targetCount} hari)` : '(minimal 1 hari, maksimal 1 hari)'}
                </p>
                {weeklyDays.length > 0 && (
                  <p className={`text-xs mb-2 ${
                    weeklyDays.length > targetCount ? 'text-red-600 font-semibold' : 'text-gray-600'
                  }`}>
                    Terpilih: {weeklyDays.length} dari {targetCount} hari
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((dayName, index) => {
                    const isSelected = weeklyDays.includes(index);
                    const isMaxReached = !isSelected && weeklyDays.length >= targetCount;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            // Allow deselecting
                            setWeeklyDays(weeklyDays.filter(d => d !== index));
                          } else {
                            // Prevent selecting if already reached target count
                            if (weeklyDays.length >= targetCount) {
                              toast({
                                title: 'Limit Reached',
                                description: `You can only select up to ${targetCount} day${targetCount > 1 ? 's' : ''} for this habit`,
                                variant: 'destructive',
                              });
                              return;
                            }
                            setWeeklyDays([...weeklyDays, index].sort((a, b) => a - b));
                          }
                        }}
                        disabled={isMaxReached}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : isMaxReached
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={isMaxReached ? `Maximum ${targetCount} day${targetCount > 1 ? 's' : ''} allowed` : undefined}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
                {weeklyDays.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Hari yang dipilih: {weeklyDays.map(d => dayNames[d]).join(', ')}
                  </p>
                )}
              </div>
            )}
            {frequency === 'monthly' && (
              <div className="space-y-2">
                <div>
                  <Label>Pilih Tanggal</Label>
                  <p className="text-xs text-gray-500 mb-1">
                    Pilih tanggal-tanggal dalam sebulan untuk habit ini {targetCount > 1 ? `(minimal ${targetCount} tanggal, maksimal ${targetCount} tanggal)` : '(minimal 1 tanggal, maksimal 1 tanggal)'}
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    {currentMonthName}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-md p-3">
                  {/* Day names header */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayNames.map((dayName) => (
                      <div
                        key={dayName}
                        className="text-xs font-semibold text-gray-600 text-center py-1"
                      >
                        {dayName.substring(0, 3)}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-2 max-h-64 overflow-y-auto seamless-scroll">
                    {calendarDays.map((date, index) => {
                      if (date === null) {
                        return (
                          <div
                            key={`empty-${index}`}
                            className="px-3 py-2 rounded-md text-sm"
                          />
                        );
                      }
                      
                      const isSelected = monthlyDates.includes(date);
                      const isMaxReached = !isSelected && monthlyDates.length >= targetCount;
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              // Allow deselecting
                              setMonthlyDates(monthlyDates.filter(d => d !== date));
                            } else {
                              // Prevent selecting if already reached target count
                              if (monthlyDates.length >= targetCount) {
                                toast({
                                  title: 'Limit Reached',
                                  description: `You can only select up to ${targetCount} date${targetCount > 1 ? 's' : ''} for this habit`,
                                  variant: 'destructive',
                                });
                                return;
                              }
                              setMonthlyDates([...monthlyDates, date].sort((a, b) => a - b));
                            }
                          }}
                          disabled={isMaxReached}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : isMaxReached
                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title={isMaxReached ? `Maximum ${targetCount} date${targetCount > 1 ? 's' : ''} allowed` : undefined}
                        >
                          {date}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {monthlyDates.length > 0 && (
                  <p className={`text-xs mb-2 ${
                    monthlyDates.length > targetCount ? 'text-red-600 font-semibold' : 'text-gray-600'
                  }`}>
                    Terpilih: {monthlyDates.length} dari {targetCount} tanggal ({[...monthlyDates].sort((a, b) => a - b).join(', ')})
                  </p>
                )}
              </div>
            )}
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === c ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 mt-auto">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : habitId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
