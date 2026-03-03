import React, { useMemo, useState } from 'react';
import { Bell, Eye, Loader2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/features/ui/sheet';
import { Button } from '@/features/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useReviewCommentNotifications, type ReviewCommentNotificationRow } from '@/features/6-1-dashboard/hook/useReviewCommentNotifications';
import { usePlanStatusChangeNotifications, type PlanStatusChangeNotificationRow } from '@/features/6-1-dashboard/hook/usePlanStatusChangeNotifications';
import { useCompletionApprovals } from '@/features/8-2-DailyTask/hooks/useCompletionApprovals';
import { useDailyTaskNotifications, type DailyTaskNotificationRow } from '@/features/8-2-DailyTask/hooks/useDailyTaskNotifications';
import type { CompletionApprovalRow } from '@/features/8-2-DailyTask/services/completionApprovalService';
import { usePublicReviewToken } from '@/features/6-1-dashboard/hook/usePublicReviewToken';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useNotificationBadgeCount } from '@/mobile/hooks/useNotificationBadgeCount';

function getDisplayTitle(row: CompletionApprovalRow): string {
  const taskTitle = row.daily_tasks?.title ?? 'Task';
  if (row.entity_type === 'task') return taskTitle;
  const stepTitle = row.task_steps?.title ?? 'Step';
  if (row.entity_type === 'step') return `${taskTitle} → ${stepTitle}`;
  const subTitle = row.task_steps_to_steps?.title ?? 'Sub-step';
  return `${taskTitle} → ${stepTitle} → ${subTitle}`;
}

function showViewContent(row: CompletionApprovalRow): boolean {
  return row.entity_type === 'step' && !!row.task_steps?.social_media_plan_id;
}

function getEntityTypeLabel(entityType: string, t: (k: string, fallback: string) => string): string {
  if (entityType === 'task') return t('dailyTask.approval.entityTask', 'Task');
  if (entityType === 'step') return t('dailyTask.approval.entityStep', 'Step');
  return t('dailyTask.approval.entitySubstep', 'Sub-step');
}

export function HeaderNotificationsBell() {
  const [open, setOpen] = useState(false);
  const { totalCount } = useNotificationBadgeCount();
  const { t, dateLocale } = useAppTranslation();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        aria-label={t('mobileHome.notificationsTitle', 'Notifikasi')}
      >
        <Bell className="h-4 w-4" />
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('mobileHome.notificationsTitle', 'Notifikasi')}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 flex flex-1 min-h-0 flex-col overflow-hidden">
            <DesktopNotificationsTabs
              locale={dateLocale}
              t={t}
              onClose={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DesktopNotificationsTabs({
  locale,
  t,
  onClose,
}: {
  locale: Locale;
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'comments' | 'tasks' | 'updates'>('comments');

  const { notifications: commentNotifications, markOneRead: markCommentOneRead, markAllRead: markCommentAllRead } =
    useReviewCommentNotifications();
  const unreadComments = useMemo(() => commentNotifications.filter((n) => n.read_at == null), [commentNotifications]);

  const { pending, loading: approvalsLoading, fetchError: approvalsError, refresh: refreshApprovals } = useCompletionApprovals([]);
  const {
    notifications: dailyTaskNotifications,
    isLoading: dailyTaskLoading,
    markOneRead: markDailyTaskOneRead,
    markAllRead: markDailyTaskAllRead,
  } = useDailyTaskNotifications();

  const {
    notifications: planNotifications,
    isLoading: planLoading,
    error: planError,
    markOneRead: markPlanOneRead,
    markAllRead: markPlanAllRead,
    refetch: refetchPlan,
  } = usePlanStatusChangeNotifications();

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 min-h-0 flex flex-col">
      <TabsList className="flex-shrink-0 w-full justify-start">
        <TabsTrigger value="comments">{t('mobileHome.notificationsTabComments', 'Comments')}</TabsTrigger>
        <TabsTrigger value="tasks">{t('mobileHome.notificationsTabTasks', 'Tasks')}</TabsTrigger>
        <TabsTrigger value="updates">{t('mobileHome.notificationsTabUpdates', 'Updates')}</TabsTrigger>
      </TabsList>

      <TabsContent value="comments" className="flex-1 min-h-0 overflow-hidden mt-0">
        <div className="seamless-scroll nested-scroll-touch-chain overflow-y-auto overflow-x-hidden max-h-[calc(100vh-120px)] flex-1 min-h-0 pr-2">
          {unreadComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('reviewCommentNotifications.empty', 'No notifications')}</p>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => markCommentAllRead()}>
                  {t('mobileHome.notificationsMarkAllRead', 'Mark all as read')}
                </Button>
              </div>
              <ul className="space-y-2">
                {unreadComments.map((n) => (
                  <CommentItem
                    key={n.id}
                    item={n}
                    locale={locale}
                    t={t}
                    onClose={onClose}
                    onMarkAsRead={markCommentOneRead}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="tasks" className="flex-1 min-h-0 overflow-hidden mt-0">
        <TasksPanel
          locale={locale}
          t={t}
          onClose={onClose}
          pending={pending}
          loading={approvalsLoading}
          error={approvalsError}
          onRetry={refreshApprovals}
          dailyTaskNotifications={dailyTaskNotifications}
          dailyTaskLoading={dailyTaskLoading}
          onDailyTaskMarkAllRead={markDailyTaskAllRead}
          onDailyTaskMarkOneRead={markDailyTaskOneRead}
        />
      </TabsContent>

      <TabsContent value="updates" className="flex-1 min-h-0 overflow-hidden mt-0">
        <UpdatesPanel
          locale={locale}
          t={t}
          onClose={onClose}
          planNotifications={planNotifications}
          loading={planLoading}
          error={planError}
          onRetry={refetchPlan}
          onMarkAllRead={markPlanAllRead}
          onMarkOneRead={markPlanOneRead}
        />
      </TabsContent>
    </Tabs>
  );
}

function CommentItem({
  item,
  locale,
  t,
  onClose,
  onMarkAsRead,
}: {
  item: ReviewCommentNotificationRow;
  locale: Locale;
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
  onClose: () => void;
  onMarkAsRead: (id: string) => Promise<void>;
}) {
  const label = t('reviewCommentNotifications.commentedOn', '{{name}} commented on {{planTitle}}', {
    name: (item.commenter_display_name && item.commenter_display_name.trim()) || 'Someone',
    planTitle: (item.plan_title && item.plan_title.trim()) || 'plan',
  });
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale });
  const isUnread = item.read_at == null;

  const handleOpen = async () => {
    onClose();
    await onMarkAsRead(item.id);
    window.open(`/review/${item.review_token}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <li>
      <div className="rounded-lg border border-border bg-muted/50 p-2 transition-colors hover:bg-muted/70">
        <button type="button" onClick={handleOpen} className="block w-full text-left text-sm">
          <span className="font-medium text-foreground">{label}</span>
          {(item.comment_text?.trim() ?? '') && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.comment_text}</p>}
        </button>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {isUnread && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 border-input text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkAsRead(item.id);
              }}
            >
              {t('reviewCommentNotifications.markAsRead', 'Mark as read')}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function TasksPanel({
  locale,
  t,
  onClose,
  pending,
  loading,
  error,
  onRetry,
  dailyTaskNotifications,
  dailyTaskLoading,
  onDailyTaskMarkAllRead,
  onDailyTaskMarkOneRead,
}: {
  locale: Locale;
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
  onClose: () => void;
  pending: CompletionApprovalRow[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  dailyTaskNotifications: DailyTaskNotificationRow[];
  dailyTaskLoading: boolean;
  onDailyTaskMarkAllRead: () => Promise<void>;
  onDailyTaskMarkOneRead: (id: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreate } = usePublicReviewToken();
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

  const handlePendingTitleClick = (row: CompletionApprovalRow) => {
    onClose();
    const taskId = row.daily_task_id;
    const stepId = row.task_step_id ?? undefined;
    navigate('/tools/daily-task', {
      state: {
        pendingApprovalFocus: {
          taskId,
          stepId,
          openSubStepModalForStepId: row.entity_type === 'substep' ? stepId : undefined,
        },
      },
    });
  };

  const handleDailyTaskNotificationClick = (item: DailyTaskNotificationRow) => {
    onClose();
    const taskId = item.daily_task_id ?? undefined;
    const stepId = item.task_step_id ?? undefined;
    navigate('/tools/daily-task', {
      state: {
        pendingApprovalFocus: {
          taskId,
          stepId,
          openSubStepModalForStepId: item.task_steps_to_steps_id ? stepId : undefined,
        },
      },
    });
    onDailyTaskMarkOneRead(item.id);
  };

  const handleViewContent = async (row: CompletionApprovalRow) => {
    if (!showViewContent(row)) return;
    const planId = row.task_steps?.social_media_plan_id;
    if (!planId) return;

    onClose();
    setLoadingRowId(row.id);
    try {
      const { data, error: fetchErr } = await supabase
        .from('social_media_plans')
        .select('google_drive_link')
        .eq('id', planId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const linkUrl = (data as { google_drive_link?: string | null } | null)?.google_drive_link?.trim();
      if (!linkUrl) {
        toast({
          title: t('dailyTask.approval.error', 'Error'),
          description: t('dailyTask.approval.noContentLink', 'No content link for this plan.'),
          variant: 'destructive',
        });
        return;
      }
      const { token } = await getOrCreate({ socialMediaPlanId: planId, linkUrl });
      navigate(`/review/${token}`, { state: { from: 'notifications-bell' } });
    } catch (e) {
      toast({
        title: t('dailyTask.approval.error', 'Error'),
        description: e instanceof Error ? e.message : t('dailyTask.approval.reviewOpenFailed', 'Failed to open review.'),
        variant: 'destructive',
      });
    } finally {
      setLoadingRowId(null);
    }
  };

  return (
    <div className="seamless-scroll nested-scroll-touch-chain overflow-y-auto overflow-x-hidden max-h-[calc(100vh-120px)] flex-1 min-h-0 pr-2">
      {error ? (
        <p className="text-sm text-destructive py-2">
          {t('dailyTask.approval.fetchError', 'Failed to load approvals. Please try again.')}
          <button type="button" onClick={onRetry} className="ml-2 underline font-medium">
            {t('dailyTask.approval.retry', 'Retry')}
          </button>
        </p>
      ) : loading && pending.length === 0 && !dailyTaskLoading && dailyTaskNotifications.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {t('mobileHome.loading', 'Loading...')}
        </p>
      ) : pending.length === 0 && dailyTaskNotifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('mobileHome.notificationsNoTasks', 'No tasks')}</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t('dailyTask.pendingApprovalTitle', 'Pending your approval')}</p>
              <ul className="space-y-2">
                {pending.map((row) => (
                  <li key={row.id}>
                    <div className="rounded-lg border border-border bg-muted/50 p-2 transition-colors hover:bg-muted/70">
                      <button type="button" onClick={() => handlePendingTitleClick(row)} className="w-full text-left">
                        <p className="font-medium text-foreground truncate" title={getDisplayTitle(row)}>
                          {getDisplayTitle(row)}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{row.assignee?.full_name ?? t('dailyTask.approval.assignee', 'Assignee')}</span>
                        <span className="text-muted-foreground/50 flex-shrink-0">·</span>
                        <span className="flex-shrink-0">{getEntityTypeLabel(row.entity_type, t)}</span>
                      </div>
                      {showViewContent(row) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleViewContent(row)}
                            disabled={loadingRowId !== null}
                          >
                            {loadingRowId === row.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 mr-1" />
                            )}
                            {t('dailyTask.approval.viewContent', 'View Content')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dailyTaskNotifications.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-muted-foreground">{t('dailyTask.notificationsUpdates', 'Task updates')}</p>
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => onDailyTaskMarkAllRead()}>
                  {t('mobileHome.notificationsMarkAllRead', 'Mark all as read')}
                </Button>
              </div>
              <ul className="space-y-2">
                {dailyTaskNotifications.map((item) => (
                  <li key={item.id}>
                    <div
                      className={cn(
                        'rounded-lg border border-border p-2 transition-colors',
                        item.read_at == null ? 'bg-muted/50 hover:bg-muted/70' : 'bg-background'
                      )}
                    >
                      <button type="button" onClick={() => handleDailyTaskNotificationClick(item)} className="block w-full text-left text-sm">
                        <span className="font-medium text-foreground">{item.title}</span>
                        {(item.body?.trim() ?? '') && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>}
                      </button>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale })}
                        </span>
                        {item.read_at == null && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 border-input text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDailyTaskMarkOneRead(item.id);
                            }}
                          >
                            {t('reviewCommentNotifications.markAsRead', 'Mark as read')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UpdatesPanel({
  locale,
  t,
  onClose,
  planNotifications,
  loading,
  error,
  onRetry,
  onMarkAllRead,
  onMarkOneRead,
}: {
  locale: Locale;
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
  onClose: () => void;
  planNotifications: PlanStatusChangeNotificationRow[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onMarkAllRead: () => Promise<void>;
  onMarkOneRead: (id: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreate } = usePublicReviewToken();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleItemClick = async (item: PlanStatusChangeNotificationRow) => {
    onClose();
    setLoadingId(item.id);
    try {
      const { data, error: fetchErr } = await supabase
        .from('social_media_plans')
        .select('google_drive_link')
        .eq('id', item.social_media_plan_id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const linkUrl = (data as { google_drive_link?: string | null } | null)?.google_drive_link?.trim();
      if (!linkUrl) {
        toast({
          title: t('dailyTask.approval.error', 'Error'),
          description: t('dailyTask.approval.noContentLink', 'No content link for this plan.'),
          variant: 'destructive',
        });
        return;
      }
      await onMarkOneRead(item.id);
      const { token } = await getOrCreate({ socialMediaPlanId: item.social_media_plan_id, linkUrl });
      navigate(`/review/${token}`, { state: { from: 'notifications-bell' } });
    } catch (e) {
      toast({
        title: t('dailyTask.approval.error', 'Error'),
        description: e instanceof Error ? e.message : t('dailyTask.approval.reviewOpenFailed', 'Failed to open review.'),
        variant: 'destructive',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="seamless-scroll nested-scroll-touch-chain overflow-y-auto overflow-x-hidden max-h-[calc(100vh-120px)] flex-1 min-h-0 pr-2">
      {error ? (
        <p className="text-sm text-destructive py-2">
          {t('mobileHome.notificationsUpdatesError', 'Failed to load updates.')}
          <button type="button" onClick={onRetry} className="ml-2 underline font-medium">
            {t('mobileHome.retry', 'Retry')}
          </button>
        </p>
      ) : loading && planNotifications.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {t('mobileHome.loading', 'Loading...')}
        </p>
      ) : planNotifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('mobileHome.notificationsNoUpdates', 'No updates')}</p>
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => onMarkAllRead()}>
              {t('mobileHome.notificationsMarkAllRead', 'Mark all as read')}
            </Button>
          </div>
          <ul className="space-y-2">
            {planNotifications.map((item) => (
              <li key={item.id}>
                <div
                  className={cn(
                    'rounded-lg border border-border p-2 transition-colors',
                    item.read_at == null ? 'bg-muted/50 hover:bg-muted/70' : 'bg-background'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    disabled={loadingId !== null}
                    className="block w-full text-left text-sm"
                  >
                    <span className="font-medium text-foreground">{item.title}</span>
                    {(item.body?.trim() ?? '') && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>}
                  </button>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale })}
                    </span>
                    {item.read_at == null && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 border-input text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onMarkOneRead(item.id);
                        }}
                      >
                        {t('reviewCommentNotifications.markAsRead', 'Mark as read')}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

