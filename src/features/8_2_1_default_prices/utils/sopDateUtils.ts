import type { SopScheduleType } from '../types';

/**
 * Returns true if date is Saturday (6) or Sunday (0).
 */
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Next working day (Mon–Fri) on or after the given date.
 */
function nextWorkingDay(d: Date): Date {
  const out = new Date(d);
  while (isWeekend(out)) {
    out.setDate(out.getDate() + 1);
  }
  return out;
}

/**
 * Add n working days after startDate (startDate is day 0; result is n working days later).
 */
function addWorkingDaysAfter(startDate: Date, n: number): Date {
  if (n <= 0) return new Date(startDate);
  let d = new Date(startDate);
  for (let i = 0; i < n; i++) {
    d.setDate(d.getDate() + 1);
    d = nextWorkingDay(d);
  }
  return d;
}

/**
 * Compute step due date from Hari H and template step schedule.
 * - days_before_h: Hari H minus schedule_value calendar days.
 * - hari_h: Hari H.
 * - working_days_after_h: schedule_value working days after the first working day on or after Hari H.
 */
export function computeStepDueDate(
  hariHDate: Date,
  scheduleType: SopScheduleType,
  scheduleValue: number | null
): string {
  const h = new Date(hariHDate);
  h.setHours(0, 0, 0, 0);

  switch (scheduleType) {
    case 'days_before_h': {
      const v = scheduleValue ?? 0;
      const d = new Date(h);
      d.setDate(d.getDate() - v);
      return d.toISOString().split('T')[0];
    }
    case 'hari_h':
      return h.toISOString().split('T')[0];
    case 'working_days_after_h': {
      const v = scheduleValue ?? 0;
      const firstWorking = nextWorkingDay(h);
      const due = addWorkingDaysAfter(firstWorking, v);
      return due.toISOString().split('T')[0];
    }
    default:
      return h.toISOString().split('T')[0];
  }
}
