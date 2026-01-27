/**
 * Types for Habit Tracker Feature
 */

export interface Habit {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_count: number; // Target per frequency period
  checklist_names?: string[]; // Array of names for each checklist (e.g., ["Solat Subuh", "Solat Zuhur", ...])
  weekly_days?: number[]; // Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday) for weekly habits
  monthly_dates?: number[]; // Array of dates (1-31) for monthly habits
  created_at: string;
  updated_at: string;
  is_active: boolean;
  organization_id: string;
  employee_id: string;
  created_by?: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  entry_date: string;
  count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  employee_id: string;
  created_by?: string;
}

export interface HabitStats {
  habit_id: string;
  habit_name: string;
  total_entries: number;
  completion_rate: number;
  current_streak: number;
  longest_streak: number;
  last_entry_date: string | null;
}

export interface HabitFilter {
  search: string;
  frequency: 'all' | 'daily' | 'weekly' | 'monthly';
  status: 'all' | 'active' | 'inactive';
  dateRange: {
    start: string | null;
    end: string | null;
  };
}
