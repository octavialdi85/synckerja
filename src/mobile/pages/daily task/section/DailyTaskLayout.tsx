import React, { useState, useRef, useEffect } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { SidebarTrigger } from '@/mobile/components/ui/sidebar';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/mobile/components/ui/drawer';
import { Button } from '@/features/ui/button';
import { useDailyTask } from '@/features/8-2-DailyTask/DailyTaskContext';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useToast } from '@/features/ui/use-toast';
import { TaskList } from './TaskList';
import { DailyTaskPageSkeleton } from '../DailyTaskPageSkeleton';
import { MobileTaskFilterDrawerContent } from './MobileTaskFilterDrawer';
import { hasActiveFilters } from './filterUtils';

export function DailyTaskLayout() {
  const { t } = useAppTranslation();
  const { toast } = useToast();
  const { filters, resetFilters, refetchTasks, isLoading } = useDailyTask();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeFilters = hasActiveFilters(filters);
  const listScrollRef = useRef<HTMLDivElement>(null);

  // Scroll list to top when date/plan filter changes so the updated list is visible
  useEffect(() => {
    if (listScrollRef.current) {
      listScrollRef.current.scrollTop = 0;
    }
  }, [
    filters.dateRange,
    filters.planDateRange,
    filters.customPlanMonth,
    filters.customStartDate,
    filters.customEndDate,
  ]);

  const handleRefresh = async () => {
    resetFilters();
    try {
      await refetchTasks();
    } catch {
      toast({
        title: t('dailyTask.filters.refresh', 'Refresh'),
        description: 'Failed to refresh tasks',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {t('dailyTask.page.title', 'Daily Task')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('dailyTask.page.subtitle', 'Manage your daily tasks here')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeFilters && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleRefresh}
              title={t('dailyTask.filters.refreshShowAll', 'Refresh to show all tasks')}
              aria-label={t('dailyTask.filters.refresh', 'Refresh')}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 relative"
                aria-label={t('dailyTask.filters.filter', 'Filter')}
              >
                <Filter className="h-4 w-4" />
                {activeFilters && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85dvh] flex flex-col">
              <DrawerHeader className="text-left pb-2 safe-area-top">
                <DrawerTitle>{t('dailyTask.filters.filter', 'Filter')}</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 px-0">
                <MobileTaskFilterDrawerContent
                onAfterCustomMonthSelect={() => setDrawerOpen(false)}
                onAfterCustomDateRangeSelect={() => setDrawerOpen(false)}
                onAfterDueDatePresetSelect={() => setDrawerOpen(false)}
              />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div
          ref={listScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col"
        >
          <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-daily-task">
            {isLoading ? <DailyTaskPageSkeleton /> : <TaskList />}
          </div>
        </div>
      </div>
    </>
  );
}
