import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Separator } from '@/features/ui/separator';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { LoadingDots } from '@/components/LoadingDots';
import { useEmployeeAssignments } from './hooks/useEmployeeAssignments';
import { JobDescTimeframe, DateRangeValue, JobDescAssignment } from '@/features/8-2-DailyTask/section/JobDescTracker/types';
import { useDailyTaskOptional } from '@/features/8-2-DailyTask/DailyTaskContext';
import { differenceInCalendarDays, startOfDay, format, formatDistanceToNowStrict } from 'date-fns';
import { ModalViewSubSteps } from '@/features/8-2-DailyTask/section/ModalViewSubSteps';
import { supabase } from '@/integrations/supabase/client';
import { id as indonesianLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { logger } from '@/config/logger';

const timeframeOptions: { value: JobDescTimeframe; translationKey: string }[] = [
  { value: "daily", translationKey: "dailyTask.jobDesc.filters.daily" },
  { value: "weekly", translationKey: "dailyTask.jobDesc.filters.weekly" },
  { value: "monthly", translationKey: "dailyTask.jobDesc.filters.monthly" },
  { value: "custom", translationKey: "dailyTask.jobDesc.filters.custom" },
];

const assignmentTypeKey: Record<JobDescAssignment["type"], string> = {
  task: "dailyTask.jobDesc.assignment.type.task",
  step: "dailyTask.jobDesc.assignment.type.step",
  subStep: "dailyTask.jobDesc.assignment.type.subStep",
};

const formatDate = (value: string | null, fallback: string) => {
  if (!value) return fallback;
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch (_error) {
    return fallback;
  }
};

interface SectionActivityNotifikasiProps {
  /** When true, used on Home without DailyTaskProvider; only navigates to /tools/daily-task with params. */
  standalone?: boolean;
}

export const SectionActivityNotifikasi = ({ standalone }: SectionActivityNotifikasiProps = {}) => {
  const { t, language } = useAppTranslation();
  const locale = language === "id" ? indonesianLocale : undefined;
  const navigate = useNavigate();
  const dailyTask = useDailyTaskOptional();
  const [activeTab, setActiveTab] = useState<'activities' | 'notifications'>('activities');
  const [timeframe, setTimeframe] = useState<JobDescTimeframe>("weekly");
  const [customRange, setCustomRange] = useState<DateRangeValue>({
    start: null,
    end: null,
  });
  const [selectedType, setSelectedType] = useState<'all' | 'task' | 'step' | 'subStep'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  
  const { data: summary, isLoading, error, range } = useEmployeeAssignments({
    timeframe,
    customRange,
    includeOverdue: true,
  });
    
  const useNavigateOnly = standalone || !dailyTask;

  // State untuk modal sub-step
  const [subStepModal, setSubStepModal] = useState<{
    open: boolean;
    parentStepId: string;
    parentStepTitle: string;
  }>({
    open: false,
    parentStepId: '',
    parentStepTitle: '',
  });

  // Cache untuk performance optimization
  const [stepIdCache, setStepIdCache] = useState<Map<string, string>>(new Map());
  const [parentStepIdCache, setParentStepIdCache] = useState<Map<string, string>>(new Map());

  // Helper function untuk mendapatkan stepId dari assignmentId (dengan cache)
  const getStepId = useCallback(async (assignmentId: string): Promise<string | null> => {
    if (stepIdCache.has(assignmentId)) {
      return stepIdCache.get(assignmentId) || null;
    }

    try {
      const { data, error } = await supabase
        .from('task_steps_assigned')
        .select('task_step_id')
        .eq('id', assignmentId)
        .single();

      if (error || !data) return null;

      const stepId = data.task_step_id;
      setStepIdCache(prev => new Map(prev).set(assignmentId, stepId));
      return stepId;
    } catch (error) {
      logger.error('Error fetching stepId:', error);
      return null;
    }
  }, [stepIdCache]);

  // Helper function untuk mendapatkan parentStepId dari assignmentId (dengan cache)
  const getParentStepId = useCallback(async (assignmentId: string): Promise<string | null> => {
    if (parentStepIdCache.has(assignmentId)) {
      return parentStepIdCache.get(assignmentId) || null;
    }

    try {
      const { data, error } = await supabase
        .from('task_steps_to_steps_assigned')
        .select(`
          task_steps_to_steps_id,
          task_steps_to_steps!inner(parent_step_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (error || !data) return null;

      const parentStepId = (data as any).task_steps_to_steps?.parent_step_id;
      if (parentStepId) {
        setParentStepIdCache(prev => new Map(prev).set(assignmentId, parentStepId));
        return parentStepId;
      }
      return null;
    } catch (error) {
      logger.error('Error fetching parentStepId:', error);
      return null;
    }
  }, [parentStepIdCache]);

  // Handle click pada task title - sama persis dengan JobDescEmployeeCard
  const handleTaskTitleClick = useCallback(async (assignment: JobDescAssignment) => {
    const params = new URLSearchParams();
    params.set('taskId', assignment.taskId);

    if (assignment.type === 'task') {
      const searchTitle = assignment.title || assignment.taskTitle;
      if (searchTitle) params.set('search', searchTitle);
      params.set('action', 'navigate');
      if (!useNavigateOnly && dailyTask) {
        dailyTask.setFilters(prev => ({ ...prev, search: searchTitle }));
      }
      navigate(`/tools/daily-task?${params.toString()}`);
      return;
    }

    if (assignment.type === 'step') {
      if (assignment.stepTitle) params.set('search', assignment.stepTitle);
      const stepId = await getStepId(assignment.assignmentId);
      if (stepId) {
        params.set('stepId', stepId);
        params.set('action', 'scroll');
      } else {
        params.set('action', 'navigate');
      }
      if (!useNavigateOnly && dailyTask) {
        dailyTask.setFilters(prev => ({ ...prev, search: assignment.stepTitle }));
        dailyTask.setExpandedTasks(prev => new Set([...prev, assignment.taskId]));
      }
      navigate(`/tools/daily-task?${params.toString()}`);
      return;
    }

    if (assignment.type === 'subStep') {
      if (assignment.stepTitle) params.set('search', assignment.stepTitle);
      const parentStepId = await getParentStepId(assignment.assignmentId);
      if (parentStepId) {
        params.set('stepId', parentStepId);
        params.set('action', 'scroll');
        params.set('subStep', 'true');
      } else {
        params.set('action', 'navigate');
      }
      if (!useNavigateOnly && dailyTask) {
        dailyTask.setFilters(prev => ({ ...prev, search: assignment.stepTitle }));
        dailyTask.setExpandedTasks(prev => new Set([...prev, assignment.taskId]));
      }
      navigate(`/tools/daily-task?${params.toString()}`);
    }
  }, [navigate, useNavigateOnly, dailyTask, getStepId, getParentStepId]);

  // Filter completed assignments (same logic as JobDescEmployeeCard)
  const completedAssignments = useMemo(
    () => summary.assignments.filter(assignment => assignment.completedInRange),
    [summary.assignments],
  );

  // Filter by type
  const filteredActiveAssignments = useMemo(() => {
    if (!summary.activeAssignments) return [];
    if (selectedType === 'all') return summary.activeAssignments;
    return summary.activeAssignments.filter(assignment => assignment.type === selectedType);
  }, [summary.activeAssignments, selectedType]);

  const filteredCompletedAssignments = useMemo(() => {
    if (selectedType === 'all') return completedAssignments;
    return completedAssignments.filter(assignment => assignment.type === selectedType);
  }, [completedAssignments, selectedType]);

  // Same logic as JobDescEmployeeCard
  const assignmentsToShow = filteredActiveAssignments.length
    ? filteredActiveAssignments
    : summary.assignments.slice(0, 3);

  const dueStatusMeta = useMemo(
    () => ({
      overdue: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.overdue", "Terlambat"),
        className: "bg-red-100 text-red-700 border-red-200",
      },
      dueSoon: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.dueSoon", "Jelang jatuh tempo"),
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
      onTrack: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.onTrack", "On track"),
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      noDue: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.noDue", "Tanpa due date"),
        className: "bg-gray-100 text-gray-600 border-gray-200",
      },
    }),
    [t],
  );

  const typeFilters = [
    { id: 'all', label: t('activity.filter.all', 'All'), count: filteredActiveAssignments.length + filteredCompletedAssignments.length },
    { id: 'task', label: t('dailyTask.jobDesc.assignment.type.task', 'Task'), count: filteredActiveAssignments.filter(t => t.type === 'task').length + filteredCompletedAssignments.filter(t => t.type === 'task').length },
    { id: 'step', label: t('dailyTask.jobDesc.assignment.type.step', 'Step'), count: filteredActiveAssignments.filter(t => t.type === 'step').length + filteredCompletedAssignments.filter(t => t.type === 'step').length },
    { id: 'subStep', label: t('dailyTask.jobDesc.assignment.type.subStep', 'Sub-step'), count: filteredActiveAssignments.filter(t => t.type === 'subStep').length + filteredCompletedAssignments.filter(t => t.type === 'subStep').length },
  ];

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'activities'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {t('activity.tab.activities', 'Activities')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'notifications'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {t('activity.tab.notifications', 'Notifications')}
        </button>
        </div>
        
      <CardHeader className="pb-2 flex-shrink-0">
        {/* Timeframe Filter - Only show for Activities tab */}
        {activeTab === 'activities' && (
          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">
                {t("dailyTask.jobDesc.filters.timeframe", "Timeframe")}
              </p>
              <div className="flex flex-wrap gap-2">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTimeframe(option.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-colors",
                      timeframe === option.value
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                    )}
                  >
                    {t(option.translationKey, option.value)}
                  </button>
            ))}
          </div>
        </div>

            {timeframe === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <Label className="text-[11px] text-gray-500">
                    {t("dailyTask.jobDesc.filters.customStart", "Start date")}
                  </Label>
                  <Input
                    type="date"
                    value={customRange.start ? customRange.start.toISOString().slice(0, 10) : ""}
                    onChange={(event) =>
                      setCustomRange({
                        ...customRange,
                        start: event.target.value ? new Date(event.target.value) : null,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col">
                  <Label className="text-[11px] text-gray-500">
                    {t("dailyTask.jobDesc.filters.customEnd", "End date")}
                  </Label>
                  <Input
                    type="date"
                    value={customRange.end ? customRange.end.toISOString().slice(0, 10) : ""}
                    onChange={(event) =>
                      setCustomRange({
                        ...customRange,
                        end: event.target.value ? new Date(event.target.value) : null,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain px-4">
          {activeTab === 'activities' ? (
            <>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
                  <LoadingDots />
            </div>
              ) : error ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-sm text-red-500 leading-relaxed">
                    {t('activity.error', 'Error loading activities')}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  {/* Active Assignments */}
                  {assignmentsToShow.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      {t("dailyTask.jobDesc.emptyState", "Belum ada tugas aktif pada rentang waktu ini")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {assignmentsToShow.map((assignment) => {
                        const typeLabel = t(
                          assignmentTypeKey[assignment.type],
                          assignment.type,
                        );
                        const pendingLabel = assignment.assignedAt
                          ? formatDistanceToNowStrict(new Date(assignment.assignedAt), {
                              locale,
                            })
                          : t("dailyTask.jobDesc.assignment.pendingUnknown", "Tidak diketahui");
                        const taskTitle =
                          assignment.type === "task" ? assignment.title : assignment.taskTitle;
                        const extraLabel =
                          assignment.type === "task"
                            ? assignment.priority ?? ""
                            : assignment.type === "step"
                              ? assignment.stepTitle
                              : assignment.subStepTitle;

                        const statusLabel =
                          assignment.type === "task"
                            ? (assignment.status ?? "").toLowerCase()
                            : assignment.type === "step"
                              ? assignment.isCompleted
                                ? "completed"
                                : "pending"
                              : assignment.isCompleted
                                ? "completed"
                                : "pending";

                        const statusColor =
                          statusLabel === "completed"
                            ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                            : "text-amber-600 bg-amber-50 border-amber-100";

                        return (
                          <div
                            key={`${assignment.assignmentId}-${assignment.type}`}
                            className="border border-gray-100 rounded-md p-2 text-xs cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleTaskTitleClick(assignment)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900 line-clamp-1">
                                  {taskTitle}
                                </p>
                                {extraLabel && (
                                  <p className="text-[11px] text-gray-500 line-clamp-1">
                                    {extraLabel}
                                  </p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                  {assignment.dueDate && (
                                    <span>
                                      {t("dailyTask.jobDesc.assignment.due", "Due {{date}}", {
                                        date: formatDate(assignment.dueDate, "-"),
                                      })}
                                    </span>
                                  )}
                                  <span>
                                    {t("dailyTask.jobDesc.assignment.pendingFor", "Pending {{duration}}", {
                                      duration: pendingLabel,
                                    })}
                                  </span>
                                </div>
                              </div>
                              <Badge className={cn("text-[10px]", statusColor)}>
                                {statusLabel === "completed"
                                  ? t("dailyTask.jobDesc.assignment.completed", "Selesai")
                                  : t("dailyTask.jobDesc.assignment.pending", "Aktif")}
                          </Badge>
                        </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px]">
                                {typeLabel}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full border text-[10px]",
                                  dueStatusMeta[assignment.dueStatus].className,
                                )}
                              >
                                {dueStatusMeta[assignment.dueStatus].label}
                              </span>
                              {assignment.dueStatus === "overdue" && assignment.dueDate && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[10px] text-red-700">
                                  {t("dailyTask.jobDesc.assignment.completedLateDetail", "Terlambat {{days}} hari", {
                                    days: Math.max(
                                      differenceInCalendarDays(
                                        startOfDay(new Date()),
                                        startOfDay(new Date(assignment.dueDate)),
                                      ),
                                      1,
                                    ),
                                  })}
                                </span>
                              )}
                      </div>
                      </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Completed Assignments with Toggle */}
                  {filteredCompletedAssignments.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowCompleted((prev) => !prev)}
                        className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                      >
                        {showCompleted
                          ? t("dailyTask.jobDesc.completed.hide", "Sembunyikan tugas selesai")
                          : t("dailyTask.jobDesc.completed.showAll", "Lihat {{count}} tugas selesai", {
                              count: filteredCompletedAssignments.length,
                            })}
                      </button>
                      {showCompleted && (
                        <div className="mt-2 space-y-2">
                          {filteredCompletedAssignments.map((assignment) => {
                            const typeLabel = t(assignmentTypeKey[assignment.type], assignment.type);
                            const completedTitle =
                              assignment.type === "task"
                                ? assignment.title
                                : assignment.type === "step"
                                  ? assignment.stepTitle
                                  : assignment.subStepTitle;
                            const completedDate = assignment.completedAt
                              ? startOfDay(new Date(assignment.completedAt))
                              : null;
                            const dueDateObj = assignment.dueDate
                              ? startOfDay(new Date(assignment.dueDate))
                              : null;
                            const lateDays =
                              completedDate && dueDateObj
                                ? differenceInCalendarDays(completedDate, dueDateObj)
                                : 0;
                            const isLateCompletion = Boolean(lateDays && lateDays > 0);
                            return (
                              <div
                                key={`${assignment.assignmentId}-${assignment.type}-completed`}
                                className="border border-green-100 bg-green-50 rounded-md p-2 text-xs cursor-pointer hover:bg-green-100 transition-colors"
                                onClick={() => handleTaskTitleClick(assignment)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-gray-900 line-clamp-1">
                                      {completedTitle || assignment.taskTitle}
                                    </p>
                                    {assignment.type === "subStep" && assignment.stepTitle && (
                                      <p className="text-[11px] text-gray-500">
                                        {t("dailyTask.jobDesc.assignment.parentStep", "Step: {{title}}", {
                                          title: assignment.stepTitle,
                                        })}
                                      </p>
                                    )}
                                    {assignment.type !== "task" && assignment.taskTitle && (
                                      <p className="text-[11px] text-gray-500">
                                        {t("dailyTask.jobDesc.assignment.parentTask", "Task: {{title}}", {
                                          title: assignment.taskTitle,
                                        })}
                                      </p>
                                    )}
                                    {assignment.dueDate && (
                                      <p className="text-[11px] text-gray-500">
                                        {t("dailyTask.jobDesc.assignment.due", "Due {{date}}", {
                                          date: formatDate(assignment.dueDate, "-"),
                                        })}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-gray-500">
                                      {assignment.completedAt
                                        ? t("dailyTask.jobDesc.assignment.completedOn", "Selesai {{date}}", {
                                            date: formatDate(assignment.completedAt, "-"),
                                          })
                                        : t("dailyTask.jobDesc.assignment.completed", "Selesai")}
                                    </p>
                                  </div>
                                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                                    {t("dailyTask.jobDesc.assignment.completed", "Selesai")}
                                  </Badge>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px]">
                                    {typeLabel}
                                  </span>
                                  {isLateCompletion && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[10px] text-red-700">
                                      {t(
                                        "dailyTask.jobDesc.assignment.completedLateDetail",
                                        "Terlambat {{days}} hari",
                                        { days: lateDays },
                                      )}
                                    </span>
                                  )}
                  </div>
                </div>
              );
            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-gray-500 leading-relaxed">{t('activity.noNotifications', 'No notifications')}</div>
              </div>
          </div>
          )}
        </div>
        
        {/* Type Filter Footer */}
        {activeTab === 'activities' && (
          <div className="px-4 py-2 border-t flex-shrink-0">
            <div className="overflow-x-auto seamless-scroll horizontal-scroll">
              <div className="flex gap-1 min-w-max py-1">
                {typeFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedType(filter.id as any)}
                    className={cn(
                      "text-xs font-medium h-6 px-2 whitespace-nowrap flex-shrink-0 leading-tight transition-colors",
                      selectedType === filter.id 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 font-semibold' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    {filter.label}
                    {filter.count > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "ml-1 h-3 px-1 text-xs font-medium leading-tight",
                          selectedType === filter.id 
                            ? 'bg-blue-500 text-white border-blue-400' 
                            : ''
                        )}
                      >
                        {filter.count}
                      </Badge>
                    )}
          </Button>
                ))}
              </div>
            </div>
        </div>
        )}
      </CardContent>

      {/* Sub-step Modal */}
      <ModalViewSubSteps
        open={subStepModal.open}
        onOpenChange={(open) => setSubStepModal(prev => ({ ...prev, open }))}
        parentStepId={subStepModal.parentStepId}
        parentStepTitle={subStepModal.parentStepTitle}
      />
    </Card>
  );
};
