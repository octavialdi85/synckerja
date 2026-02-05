import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCurrentUser } from '@/features/2-1-employees/hooks/useCurrentUser';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { Habit, HabitEntry, HabitStats, HabitFilter } from '../types';

interface HabitTrackerContextType {
  habits: Habit[];
  entries: HabitEntry[];
  stats: HabitStats[];
  loading: boolean;
  filters: HabitFilter;
  updateFilter: (key: keyof HabitFilter, value: any) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'employee_id' | 'created_by'>) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  addEntry: (habitId: string, date: string, count: number, notes?: string) => Promise<void>;
  updateEntry: (id: string, updates: Partial<HabitEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  filteredHabits: Habit[];
}

const HabitTrackerContext = createContext<HabitTrackerContextType | undefined>(undefined);

export const useHabitTracker = () => {
  const ctx = useContext(HabitTrackerContext);
  if (!ctx) throw new Error('useHabitTracker must be used within HabitTrackerProvider');
  return ctx;
};

export const HabitTrackerProvider = ({ children }: { children: React.ReactNode }) => {
  const { organizationId } = useCurrentOrg();
  const { user } = useCurrentUser();
  const { data: employee } = useCurrentEmployee();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [stats, setStats] = useState<HabitStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<HabitFilter>({
    search: '',
    frequency: 'all',
    status: 'all',
    dateRange: {
      start: null,
      end: null,
    },
  });

  const fetchHabits = useCallback(async () => {
    if (!organizationId || !employee?.id) return;

    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Supabase JSONB is automatically parsed as array/object, but ensure it's an array
      const parsedHabits = (data || []).map(habit => {
        let checklistNames = undefined;
        if (habit.checklist_names) {
          if (Array.isArray(habit.checklist_names)) {
            checklistNames = habit.checklist_names;
          } else if (typeof habit.checklist_names === 'string') {
            try {
              const parsed = JSON.parse(habit.checklist_names);
              checklistNames = Array.isArray(parsed) ? parsed : undefined;
            } catch (e) {
              console.error('Error parsing checklist_names:', e);
              checklistNames = undefined;
            }
          }
        }
        
        let weeklyDays = undefined;
        if (habit.weekly_days) {
          if (Array.isArray(habit.weekly_days)) {
            weeklyDays = habit.weekly_days.filter((day: any) => typeof day === 'number' && day >= 0 && day <= 6);
          } else if (typeof habit.weekly_days === 'string') {
            try {
              const parsed = JSON.parse(habit.weekly_days);
              if (Array.isArray(parsed)) {
                weeklyDays = parsed.filter((day: any) => typeof day === 'number' && day >= 0 && day <= 6);
              }
            } catch (e) {
              console.error('Error parsing weekly_days:', e);
              weeklyDays = undefined;
            }
          }
        }
        
        let monthlyDates = undefined;
        if (habit.monthly_dates) {
          if (Array.isArray(habit.monthly_dates)) {
            monthlyDates = habit.monthly_dates.filter((date: any) => typeof date === 'number' && date >= 1 && date <= 31);
          } else if (typeof habit.monthly_dates === 'string') {
            try {
              const parsed = JSON.parse(habit.monthly_dates);
              if (Array.isArray(parsed)) {
                monthlyDates = parsed.filter((date: any) => typeof date === 'number' && date >= 1 && date <= 31);
              }
            } catch (e) {
              console.error('Error parsing monthly_dates:', e);
              monthlyDates = undefined;
            }
          }
        }

        return {
          ...habit,
          checklist_names: checklistNames,
          weekly_days: weeklyDays,
          monthly_dates: monthlyDates,
        };
      });
      setHabits(parsedHabits);
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  }, [organizationId, employee?.id]);

  const fetchEntries = useCallback(async () => {
    if (!organizationId || !employee?.id) return;

    try {
      const { data, error } = await supabase
        .from('habit_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employee.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  }, [organizationId, employee?.id]);

  const calculateStats = useCallback(() => {
    const habitStats: HabitStats[] = habits.map((habit) => {
      const habitEntries = entries.filter((e) => e.habit_id === habit.id);
      const totalEntries = habitEntries.length;
      
      // Calculate completion rate
      const targetDays = habit.frequency === 'daily' ? 30 : habit.frequency === 'weekly' ? 4 : 1;
      const expectedEntries = targetDays * habit.target_count;
      const completion_rate = expectedEntries > 0 ? (totalEntries / expectedEntries) * 100 : 0;

      // Calculate streaks
      const sortedEntries = habitEntries.sort((a, b) => 
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      sortedEntries.forEach((entry) => {
        const entryDate = new Date(entry.entry_date);
        entryDate.setHours(0, 0, 0, 0);

        if (!lastDate) {
          currentStreak = 1;
          tempStreak = 1;
        } else {
          const daysDiff = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            tempStreak++;
            if (currentStreak === 0) currentStreak = tempStreak;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
            if (daysDiff > 1) currentStreak = 0;
          }
        }

        lastDate = entryDate;
        longestStreak = Math.max(longestStreak, tempStreak);
      });

      return {
        habit_id: habit.id,
        habit_name: habit.name,
        total_entries: totalEntries,
        completion_rate: Math.min(completion_rate, 100),
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_entry_date: sortedEntries[0]?.entry_date || null,
      };
    });

    setStats(habitStats);
  }, [habits, entries]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchHabits(), fetchEntries()]);
    } finally {
      setLoading(false);
    }
  }, [fetchHabits, fetchEntries]);

  useEffect(() => {
    if (organizationId && employee?.id) {
      refreshData();
    }
  }, [organizationId, employee?.id, refreshData]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const updateFilter = useCallback((key: keyof HabitFilter, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const addHabit = useCallback(async (habitData: Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'employee_id' | 'created_by'>) => {
    if (!organizationId || !employee?.id || !user?.id) return;

    try {
      // Get profile id from user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('habits')
        .insert({
          ...habitData,
          checklist_names: habitData.checklist_names && habitData.checklist_names.length > 0 ? habitData.checklist_names : null,
          weekly_days: habitData.weekly_days && habitData.weekly_days.length > 0 ? habitData.weekly_days : null,
          monthly_dates: habitData.monthly_dates && habitData.monthly_dates.length > 0 ? habitData.monthly_dates : null,
          organization_id: organizationId,
          employee_id: employee.id,
          created_by: profile?.id || null, // profiles.id, not user.id
        })
        .select()
        .single();

      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error adding habit:', error);
      throw error;
    }
  }, [organizationId, employee?.id, user?.id, refreshData]);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      // Supabase JSONB accepts arrays directly
      if (updates.checklist_names !== undefined) {
        updateData.checklist_names = updates.checklist_names && updates.checklist_names.length > 0 ? updates.checklist_names : null;
      }
      
      if (updates.weekly_days !== undefined) {
        updateData.weekly_days = updates.weekly_days && updates.weekly_days.length > 0 ? updates.weekly_days : null;
      }
      
      if (updates.monthly_dates !== undefined) {
        updateData.monthly_dates = updates.monthly_dates && updates.monthly_dates.length > 0 ? updates.monthly_dates : null;
      }
      
      const { error } = await supabase
        .from('habits')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating habit:', error);
      throw error;
    }
  }, [refreshData]);

  const deleteHabit = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw error;
    }
  }, [refreshData]);

  const addEntry = useCallback(async (habitId: string, date: string, count: number, notes?: string) => {
    if (!organizationId || !employee?.id || !user?.id) return;

    try {
      // Get profile id from user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: newEntry, error } = await supabase
        .from('habit_entries')
        .insert({
          habit_id: habitId,
          entry_date: date,
          count,
          notes,
          organization_id: organizationId,
          employee_id: employee.id,
          created_by: profile?.id || null, // profiles.id, not user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Optimistic update: add entry to state without full refresh
      if (newEntry) {
        setEntries((prev) => [...prev, newEntry]);
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error;
    }
  }, [organizationId, employee?.id, user?.id]);

  const updateEntry = useCallback(async (id: string, updates: Partial<HabitEntry>) => {
    try {
      const { error } = await supabase
        .from('habit_entries')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  }, [refreshData]);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('habit_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Optimistic update: remove entry from state without full refresh
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }, []);

  const filteredHabits = React.useMemo(() => {
    return habits.filter((habit) => {
      if (filters.search && !habit.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.frequency !== 'all' && habit.frequency !== filters.frequency) {
        return false;
      }
      if (filters.status !== 'all') {
        if (filters.status === 'active' && !habit.is_active) return false;
        if (filters.status === 'inactive' && habit.is_active) return false;
      }
      return true;
    });
  }, [habits, filters]);

  return (
    <HabitTrackerContext.Provider
      value={{
        habits,
        entries,
        stats,
        loading,
        filters,
        updateFilter,
        addHabit,
        updateHabit,
        deleteHabit,
        addEntry,
        updateEntry,
        deleteEntry,
        refreshData,
        filteredHabits,
      }}
    >
      {children}
    </HabitTrackerContext.Provider>
  );
};
