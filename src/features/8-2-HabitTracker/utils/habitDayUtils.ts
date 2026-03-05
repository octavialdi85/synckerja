/**
 * Shared helpers for habit "active on day" and "completed on day".
 * Used by both desktop (HabitSpreadsheetView) and mobile (HabitGridMobile, ConsistencyRateCard)
 * so daily percentage and consistency rate match: only habits that are active on that day
 * (checkbox enabled) count; disabled checkboxes = not due that day = excluded from denominator.
 */
import { format } from 'date-fns';

export type HabitForDay = {
  id: string;
  is_active?: boolean;
  frequency: string;
  weekly_days?: number[] | unknown;
  monthly_dates?: number[] | unknown;
  target_count?: number;
};

export type HabitEntryForDay = {
  habit_id: string;
  entry_date: string;
};

/**
 * Apakah habit "aktif" pada hari tersebut (checkbox enabled).
 * Habit yang tidak aktif pada hari itu (weekly_days / monthly_dates) tidak masuk hitungan daily %.
 */
export function isHabitActiveOnDay(habit: HabitForDay, day: Date): boolean {
  if (!habit.is_active) return false;

  if (habit.frequency === 'weekly') {
    if (habit.weekly_days && Array.isArray(habit.weekly_days) && habit.weekly_days.length > 0) {
      const dayOfWeek = day.getDay();
      const weeklyDaysNumbers = habit.weekly_days.map((d: unknown) => Number(d));
      return weeklyDaysNumbers.includes(dayOfWeek);
    }
    return true;
  }

  if (habit.frequency === 'monthly') {
    if (habit.monthly_dates && Array.isArray(habit.monthly_dates) && habit.monthly_dates.length > 0) {
      const dayOfMonth = parseInt(format(day, 'd'), 10);
      const monthlyDatesNumbers = habit.monthly_dates.map((d: unknown) => Number(d));
      return monthlyDatesNumbers.includes(dayOfMonth);
    }
    return false;
  }

  return true;
}

/**
 * Apakah habit sudah "completed" pada hari tersebut (berdasarkan entries).
 * Untuk weekly/monthly: cukup 1 entry di tanggal itu. Untuk daily target_count > 1: harus >= target_count.
 */
export function isHabitCompletedOnDay(
  habit: HabitForDay,
  day: Date,
  entriesList: HabitEntryForDay[]
): boolean {
  if (!habit.is_active) return false;

  const dateStr = format(day, 'yyyy-MM-dd');
  const dayEntries = entriesList.filter(
    (e) => e.habit_id === habit.id && e.entry_date === dateStr
  );

  if (habit.frequency === 'monthly') return dayEntries.length > 0;
  if (habit.frequency === 'weekly') return dayEntries.length > 0;
  if (habit.target_count && habit.target_count > 1) {
    return dayEntries.length >= habit.target_count;
  }
  return dayEntries.length > 0;
}
