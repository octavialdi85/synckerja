import { useState, useEffect, useCallback } from 'react';
import { TaskFilters } from './useTaskFilters';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';

const FILTER_STORAGE_KEY = 'daily-task-filters-v1';

const defaultFilters: TaskFilters = {
  search: '',
  status: '',
  priority: '',
  dateFilter: '',
  dateRange: undefined,
  customStartDate: undefined,
  customEndDate: undefined,
  planDateRange: undefined,
  customPlanMonth: undefined,
  pic: '',
  myTask: 'my_task', // Default to "My Task"
  department: undefined, // Will be set from current employee
};

/**
 * Custom hook untuk mengelola filter state dengan localStorage persistence
 * Menyimpan preferensi filter user antar session
 */
export const useTaskFilterState = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  
  const [filters, setFiltersState] = useState<TaskFilters>(() => {
    // Load from localStorage on initial mount
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate and merge with defaults to handle schema changes
        return {
          ...defaultFilters,
          ...parsed,
          // Ensure myTask has valid value
          myTask: parsed.myTask === 'all' || parsed.myTask === 'my_task' 
            ? parsed.myTask 
            : defaultFilters.myTask,
          // Convert 'all' to 'task' for picLevel (backward compatibility)
          picLevel: parsed.picLevel === 'all' ? 'task' : (parsed.picLevel || undefined),
        };
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
    return defaultFilters;
  });

  // Set default department from current employee if not set and no saved value
  useEffect(() => {
    if (currentEmployee?.department_id) {
      setFiltersState(prev => {
        // Only set default if department is not already set
        if (!prev.department) {
          return {
            ...prev,
            department: currentEmployee.department_id
          };
        }
        return prev;
      });
    }
  }, [currentEmployee?.department_id]);

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch (error: any) {
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting to clear old filters');
        try {
          // Try to clear old versions and retry
          const oldKeys = ['daily-task-filters-v0', 'daily-task-filters'];
          oldKeys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              // Ignore errors when removing old keys
            }
          });
          // Retry saving
          localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
        } catch (retryError) {
          console.warn('Failed to save filters after retry:', retryError);
          // Silently fail - filters will still work in memory, just won't persist
        }
      } else {
        console.warn('Failed to save filters to localStorage:', error);
      }
    }
  }, [filters]);

  /**
   * Update filters with type safety
   */
  const setFilters = useCallback(
    (
      newFilters: TaskFilters | ((prev: TaskFilters) => TaskFilters)
    ) => {
      setFiltersState((prev) => {
        const updated =
          typeof newFilters === 'function' ? newFilters(prev) : newFilters;
        return updated;
      });
    },
    []
  );

  /**
   * Reset filters to default
   */
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear filters from localStorage:', error);
    }
  }, []);

  /**
   * Update single filter field
   */
  const updateFilter = useCallback(
    <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setFilters]
  );

  /**
   * Clear all filters except myTask (preserve user preference)
   */
  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...defaultFilters,
      myTask: prev.myTask, // Preserve myTask preference
    }));
  }, [setFilters]);

  return {
    filters,
    setFilters,
    resetFilters,
    updateFilter,
    clearFilters,
  };
};

