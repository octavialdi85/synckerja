import { ComputedPerformanceRow } from '../context/ReportContext';

interface FilterConfig {
  search?: string;
  status?: 'all' | 'ontime' | 'late';
  timePeriod?: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';
  customStart?: string | null;
  customEnd?: string | null;
  pic?: string;
  task?: string;
  step?: string;
  subStep?: string;
}

/**
 * Calculate date range from filter config
 */
export function getDateRangeFromFilter(filters: FilterConfig): { start: Date | null; end: Date | null } {
  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  if (filters.timePeriod === 'all') {
    return { start: null, end: null };
  }

  switch (filters.timePeriod) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'yesterday':
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      break;
    case 'this_week':
      const day = now.getDay();
      const daysToMonday = day === 0 ? 6 : day - 1;
      start = new Date(now);
      start.setDate(now.getDate() - daysToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (filters.customStart && filters.customEnd) {
        start = new Date(filters.customStart);
        end = new Date(filters.customEnd);
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { start, end };
}

/**
 * Filter performance rows by date range
 */
function filterByDateRange(
  data: ComputedPerformanceRow[],
  start: Date | null,
  end: Date | null
): ComputedPerformanceRow[] {
  if (!start) return data;

  return data.filter(d => {
    if (!d.dueDate) return false;
    
    try {
      const dueDate = new Date(d.dueDate);
      if (isNaN(dueDate.getTime())) return false;
      
      const ts = dueDate.getTime();
      const afterStart = ts >= start.getTime();
      const beforeEnd = end ? ts <= end.getTime() : true;
      return afterStart && beforeEnd;
    } catch {
      return false;
    }
  });
}

/**
 * Apply all filters to performance data
 */
export function filterPerformanceData(
  data: ComputedPerformanceRow[],
  filters: FilterConfig
): ComputedPerformanceRow[] {
  let filtered = [...data];

  // Date range filter
  if (filters.timePeriod !== 'all') {
    const { start, end } = getDateRangeFromFilter(filters);
    filtered = filterByDateRange(filtered, start, end);
  }

  // Status filter
  if (filters.status !== 'all') {
    filtered = filtered.filter(d => 
      filters.status === 'ontime' ? d.isOnTime === true : d.isOnTime === false
    );
  }

  // PIC filter
  if (filters.pic && filters.pic !== 'all') {
    const q = filters.pic.toLowerCase();
    filtered = filtered.filter(d => d.employeeName.toLowerCase().includes(q));
  }

  // Task filter
  if (filters.task && filters.task !== 'all') {
    const q = filters.task.toLowerCase();
    filtered = filtered.filter(d => d.taskTitle.toLowerCase().includes(q));
  }

  // Step filter
  if (filters.step && filters.step !== 'all') {
    const q = filters.step.toLowerCase();
    filtered = filtered.filter(d => d.stepTitle.toLowerCase().includes(q));
  }

  // Sub-step filter
  if (filters.subStep && filters.subStep !== 'all') {
    const q = filters.subStep.toLowerCase();
    filtered = filtered.filter(d => (d.subStepTitle || '').toLowerCase().includes(q));
  }

  // Search filter
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(d => 
      d.employeeName.toLowerCase().includes(q) || 
      d.taskTitle.toLowerCase().includes(q) || 
      d.stepTitle.toLowerCase().includes(q) ||
      (d.subStepTitle || '').toLowerCase().includes(q)
    );
  }

  return filtered;
}

/**
 * Generic filter function for blockers and updates
 */
export function filterBySearchAndFilters<T extends { 
  taskTitle?: string; 
  stepTitle?: string; 
  subStepTitle?: string; 
  description?: string;
  created_at?: string;
  created_by_employee?: { full_name?: string };
}>(
  data: T[],
  filters: FilterConfig
): T[] {
  let filtered = [...data];

  // Search filter
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(item => (
      (item.taskTitle || '').toLowerCase().includes(q) ||
      (item.stepTitle || '').toLowerCase().includes(q) ||
      (item.subStepTitle || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    ));
  }

  // PIC filter
  if (filters.pic && filters.pic !== 'all') {
    const q = filters.pic.toLowerCase();
    filtered = filtered.filter(item => 
      (item.created_by_employee?.full_name || '').toLowerCase().includes(q)
    );
  }

  // Task filter
  if (filters.task && filters.task !== 'all') {
    const q = filters.task.toLowerCase();
    filtered = filtered.filter(item => (item.taskTitle || '').toLowerCase().includes(q));
  }

  // Step filter
  if (filters.step && filters.step !== 'all') {
    const q = filters.step.toLowerCase();
    filtered = filtered.filter(item => (item.stepTitle || '').toLowerCase().includes(q));
  }

  // Sub-step filter
  if (filters.subStep && filters.subStep !== 'all') {
    const q = filters.subStep.toLowerCase();
    filtered = filtered.filter(item => (item.subStepTitle || '').toLowerCase().includes(q));
  }

  // Date range filter
  if (filters.timePeriod !== 'all') {
    const { start, end } = getDateRangeFromFilter(filters);
    if (start) {
      filtered = filtered.filter(item => {
        if (!item.created_at) return false;
        const ts = new Date(item.created_at).getTime();
        const afterStart = ts >= start.getTime();
        const beforeEnd = end ? ts <= end.getTime() : true;
        return afterStart && beforeEnd;
      });
    }
  }

  return filtered;
}

