import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/features/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/features/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/mobile/components/ui/dialog';
import { useDailyTask } from '@/features/8-2-DailyTask/DailyTaskContext';
import { useActiveEmployeeIds } from '@/features/8-2-DailyTask/hooks/useActiveEmployeeIds';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { CustomDatePicker } from '@/mobile/components/CustomDatePicker';
import { MonthPicker } from '@/features/share/calendar';
import { format, startOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { TaskFilters } from '@/features/8-2-DailyTask/hooks/useTaskFilters';

export function MobileTaskFilterDrawerContent() {
  const { t } = useAppTranslation();
  const { filters, setFilters, tasks } = useDailyTask();
  const { isOwner } = useCentralizedUserData();
  const activeEmployeeIds = useActiveEmployeeIds();

  // Clear PIC if selected employee is no longer active (e.g. resigned)
  useEffect(() => {
    if (filters.pic && activeEmployeeIds.size > 0 && !activeEmployeeIds.has(filters.pic)) {
      setFilters(prev => ({ ...prev, pic: '', picLevel: undefined }));
    }
  }, [filters.pic, activeEmployeeIds, setFilters]);

  // Same as desktop TaskFilters: unique employees from task steps for PIC filter; exclude resigned/inactive
  const availableEmployees = useMemo(() => {
    const employeeMap = new Map<string, { id: string; full_name: string }>();
    tasks.forEach(task => {
      task.steps?.forEach(step => {
        if (step.assigned_employee?.id && activeEmployeeIds.has(step.assigned_employee.id)) {
          employeeMap.set(step.assigned_employee.id, {
            id: step.assigned_employee.id,
            full_name: step.assigned_employee.full_name || 'Unknown',
          });
        }
      });
    });
    return Array.from(employeeMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [tasks, activeEmployeeIds]);
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const getMergedDatePlanValue = () => {
    if (filters.dateRange) return filters.dateRange;
    if (filters.planDateRange) return filters.planDateRange;
    return 'all';
  };

  const getDateRangeDisplayText = () => {
    if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
      const start = new Date(filters.customStartDate);
      const end = new Date(filters.customEndDate);
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
    }
    if (filters.dateRange) {
      const labels: Record<string, string> = {
        today: t('dailyTask.filters.today', 'Today'),
        yesterday: t('dailyTask.filters.yesterday', 'Yesterday'),
        this_week: t('dailyTask.filters.thisWeek', 'This Week'),
        this_month: t('dailyTask.filters.thisMonthPlan', 'This Month'),
        last_month: t('dailyTask.filters.lastMonthPlan', 'Last Month'),
      };
      return labels[filters.dateRange] || t('dailyTask.filters.customRange', 'Custom Range');
    }
    return t('dailyTask.filters.allDatesAndPlans', 'All Dates');
  };

  const getPlanDateRangeDisplayText = () => {
    if (filters.planDateRange === 'custom_month_plan' && filters.customPlanMonth) {
      const month = new Date(filters.customPlanMonth);
      return format(month, 'MMMM yyyy', { locale: idLocale });
    }
    if (filters.planDateRange) {
      const labels: Record<string, string> = {
        this_month_plan: t('dailyTask.filters.thisMonthPlan', 'This Month Plan'),
        next_month_plan: t('dailyTask.filters.nextMonthPlan', 'Next Month Plan'),
        last_month_plan: t('dailyTask.filters.lastMonthPlan', 'Last Month Plan'),
        custom_month_plan: t('dailyTask.filters.customMonth', 'Custom Month'),
      };
      return labels[filters.planDateRange] || t('dailyTask.filters.allDatesAndPlans', 'All Plans');
    }
    return t('dailyTask.filters.allDatesAndPlans', 'All Plans');
  };

  const getMergedDatePlanDisplayText = () => {
    if (filters.dateRange) return getDateRangeDisplayText();
    if (filters.planDateRange) return getPlanDateRangeDisplayText();
    return t('dailyTask.filters.allDatesAndPlans', 'All Dates & Plans');
  };

  const handleMergedDatePlanChange = (value: string) => {
    if (value === 'all') {
      setFilters(prev => ({
        ...prev,
        dateRange: undefined,
        customStartDate: undefined,
        customEndDate: undefined,
        planDateRange: undefined,
        customPlanMonth: undefined,
      }));
      return;
    }
    const dateOptions = ['today', 'yesterday', 'this_week', 'custom'];
    const planOptions = ['this_month_plan', 'next_month_plan', 'last_month_plan', 'custom_month_plan'];
    if (dateOptions.includes(value)) {
      if (value === 'custom') {
        setFilters(prev => ({
          ...prev,
          dateRange: 'custom',
          planDateRange: undefined,
          customPlanMonth: undefined,
        }));
        setIsCustomDatePickerOpen(true);
      } else {
        setFilters(prev => ({
          ...prev,
          dateRange: value as TaskFilters['dateRange'],
          customStartDate: undefined,
          customEndDate: undefined,
          planDateRange: undefined,
          customPlanMonth: undefined,
        }));
      }
      return;
    }
    if (planOptions.includes(value)) {
      if (value === 'custom_month_plan') {
        setFilters(prev => ({
          ...prev,
          planDateRange: 'custom_month_plan',
          dateRange: undefined,
          customStartDate: undefined,
          customEndDate: undefined,
        }));
        setIsMonthPickerOpen(true);
      } else {
        setFilters(prev => ({
          ...prev,
          planDateRange: value as TaskFilters['planDateRange'],
          customPlanMonth: undefined,
          dateRange: undefined,
          customStartDate: undefined,
          customEndDate: undefined,
        }));
      }
    }
  };

  const handleCustomDateRangeSelect = (startDate: Date, endDate: Date) => {
    setFilters(prev => ({
      ...prev,
      dateRange: 'custom',
      customStartDate: format(startDate, 'yyyy-MM-dd'),
      customEndDate: format(endDate, 'yyyy-MM-dd'),
    }));
    setIsCustomDatePickerOpen(false);
  };

  const handleCustomPlanMonthSelect = (date: Date) => {
    const monthStart = startOfMonth(date);
    setFilters(prev => ({
      ...prev,
      planDateRange: 'custom_month_plan',
      customPlanMonth: format(monthStart, 'yyyy-MM-dd'),
    }));
    setIsMonthPickerOpen(false);
  };

  // Match desktop TaskFilters: All tasks / My Task / PIC (employee) selection
  const handleTaskViewChange = (value: string) => {
    if (value === 'my_task') {
      setFilters(prev => ({ ...prev, myTask: 'my_task', pic: '', picLevel: undefined }));
    } else if (value === 'all_pic') {
      setFilters(prev => ({ ...prev, myTask: 'all', pic: '', picLevel: undefined }));
    } else {
      setFilters(prev => ({
        ...prev,
        myTask: 'all',
        pic: value,
        picLevel: prev.picLevel || 'task',
      }));
    }
  };

  const getCurrentTaskViewValue = () => {
    if (filters.myTask === 'my_task') return 'my_task';
    if (filters.pic && activeEmployeeIds.has(filters.pic)) return filters.pic;
    return 'all_pic';
  };

  const getTaskViewDisplayText = () => {
    if (filters.myTask === 'my_task') return t('dailyTask.filters.myTask', 'My Task');
    if (filters.pic && activeEmployeeIds.has(filters.pic)) {
      const selectedEmployee = availableEmployees.find(emp => emp.id === filters.pic);
      return selectedEmployee ? selectedEmployee.full_name : t('dailyTask.filters.allTasks', 'All tasks');
    }
    return t('dailyTask.filters.allTasks', 'All tasks');
  };

  const handlePicLevelChange = (value: string) => {
    setFilters(prev => ({ ...prev, picLevel: value as 'task' | 'step' | 'sub_step' | 'all' }));
  };

  return (
    <>
      <div className="grid gap-1.5 px-4 pb-4 text-left">
        <label className="text-sm font-medium text-foreground">
          {t('dailyTask.filters.searchPlaceholder', 'Search tasks and steps...')}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('dailyTask.filters.searchPlaceholder', 'Search tasks and steps...')}
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="grid gap-1.5 px-4 pb-4 text-left">
        <label className="text-sm font-medium text-foreground">
          {t('dailyTask.filters.allTasks', 'All tasks')}
        </label>
        <Select value={getCurrentTaskViewValue()} onValueChange={handleTaskViewChange}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder={t('dailyTask.filters.allTasks', 'All tasks')}>
              {getTaskViewDisplayText()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_pic">{t('dailyTask.filters.allTasks', 'All tasks')}</SelectItem>
            <SelectItem value="my_task">{t('dailyTask.filters.myTask', 'My Task')}</SelectItem>
            {isOwner &&
              availableEmployees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {filters.pic && (
        <div className="grid gap-1.5 px-4 pb-4 text-left">
          <label className="text-sm font-medium text-foreground">
            {t('dailyTask.filters.picLevel', 'Level')}
          </label>
          <Select value={filters.picLevel || 'task'} onValueChange={handlePicLevelChange}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder={t('dailyTask.filters.picLevel', 'Level')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task">{t('dailyTask.filters.levelTask', 'Task')}</SelectItem>
              <SelectItem value="step">{t('dailyTask.filters.levelStep', 'Step')}</SelectItem>
              <SelectItem value="sub_step">{t('dailyTask.filters.levelSubStep', 'Sub Step')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-1.5 px-4 pb-4 text-left">
        <label className="text-sm font-medium text-foreground">
          {t('dailyTask.filters.allStatus', 'All Status')}
        </label>
        <Select
          value={filters.status || 'all'}
          onValueChange={v => setFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder={t('dailyTask.filters.allStatus', 'All Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('dailyTask.filters.allStatus', 'All Status')}</SelectItem>
            <SelectItem value="pending">{t('dailyTask.summary.pending', 'Pending')}</SelectItem>
            <SelectItem value="in_progress">{t('dailyTask.summary.inProgress', 'In Progress')}</SelectItem>
            <SelectItem value="completed">{t('dailyTask.summary.completed', 'Completed')}</SelectItem>
            <SelectItem value="cancelled">{t('dailyTask.filters.statusCancelled', 'Cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5 px-4 pb-4 text-left">
        <label className="text-sm font-medium text-foreground">
          {t('dailyTask.filters.allDatesAndPlans', 'All Dates & Plans')}
        </label>
        <Select value={getMergedDatePlanValue()} onValueChange={handleMergedDatePlanChange}>
          <SelectTrigger className="h-10">
            <SelectValue className="truncate">
              {getMergedDatePlanDisplayText()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('dailyTask.filters.allDatesAndPlans', 'All Dates & Plans')}</SelectItem>
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">Due date</SelectLabel>
              <SelectItem value="today">{t('dailyTask.filters.today', 'Today')}</SelectItem>
              <SelectItem value="yesterday">{t('dailyTask.filters.yesterday', 'Yesterday')}</SelectItem>
              <SelectItem value="this_week">{t('dailyTask.filters.thisWeek', 'This Week')}</SelectItem>
              <SelectItem value="custom">{t('dailyTask.filters.customRange', 'Custom Range')}</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">Plan</SelectLabel>
              <SelectItem value="this_month_plan">{t('dailyTask.filters.thisMonthPlan', 'This Month Plan')}</SelectItem>
              <SelectItem value="next_month_plan">{t('dailyTask.filters.nextMonthPlan', 'Next Month Plan')}</SelectItem>
              <SelectItem value="last_month_plan">{t('dailyTask.filters.lastMonthPlan', 'Last Month Plan')}</SelectItem>
              <SelectItem value="custom_month_plan">{t('dailyTask.filters.customMonth', 'Custom Month')}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <CustomDatePicker
        isOpen={isCustomDatePickerOpen}
        onClose={() => setIsCustomDatePickerOpen(false)}
        onDateRangeSelect={handleCustomDateRangeSelect}
        initialStartDate={filters.customStartDate ? new Date(filters.customStartDate) : undefined}
        initialEndDate={filters.customEndDate ? new Date(filters.customEndDate) : undefined}
      />

      <Dialog open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
        <DialogContent className="max-w-[min(90vw,400px)]">
          <DialogHeader>
            <DialogTitle>{t('dailyTask.filters.customMonth', 'Custom Month')}</DialogTitle>
          </DialogHeader>
          <div className="p-2">
            <MonthPicker
              selected={filters.customPlanMonth ? new Date(filters.customPlanMonth) : undefined}
              onSelect={handleCustomPlanMonthSelect}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
