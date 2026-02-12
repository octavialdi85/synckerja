import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/features/ui/sheet';
import { Button } from '@/features/ui/button';
import { useReviewCommentNotifications, type ReviewCommentNotificationRow } from '../hook/useReviewCommentNotifications';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { cn } from '@/lib/utils';

interface ReviewCommentNotificationBellProps {
  /** When provided, clicking a notification opens this plan in the dashboard preview modal instead of the public page */
  onOpenPreview?: (planId: string) => void;
}

export function ReviewCommentNotificationBell({ onOpenPreview }: ReviewCommentNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { t, dateLocale } = useAppTranslation();
  const { notifications, unreadCount, markAllRead } = useReviewCommentNotifications();

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch {
      // ignore
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        aria-label={t('reviewCommentNotifications.title', 'Comment notifications')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('reviewCommentNotifications.title', 'Comment notifications')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-1 flex-col gap-4 overflow-hidden">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="w-fit">
                {t('reviewCommentNotifications.markAllRead', 'Mark all as read')}
              </Button>
            )}
            <div className="seamless-scroll max-h-[calc(100vh-120px)] flex-1 overflow-y-auto pr-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('reviewCommentNotifications.empty', 'No notifications')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      item={n}
                      locale={dateLocale}
                      t={t}
                      onNavigate={() => setOpen(false)}
                      onOpenPreview={onOpenPreview}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NotificationItem({
  item,
  locale,
  t,
  onNavigate,
  onOpenPreview,
}: {
  item: ReviewCommentNotificationRow;
  locale: Locale;
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
  onNavigate: () => void;
  onOpenPreview?: (planId: string) => void;
}) {
  const name = (item.commenter_display_name && item.commenter_display_name.trim()) || 'Someone';
  const planTitle = (item.plan_title && item.plan_title.trim()) || 'plan';
  const label = t('reviewCommentNotifications.commentedOn', '{{name}} commented on {{planTitle}}', {
    name,
    planTitle,
  });
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale });

  const handleClick = () => {
    onNavigate();
    if (onOpenPreview) {
      onOpenPreview(item.social_media_plan_id);
    } else {
      window.open(`/review/${item.review_token}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className="block w-full rounded-lg border border-transparent p-2 text-left text-sm transition-colors hover:border-border hover:bg-muted/50"
      >
        <span className="font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{timeAgo}</span>
      </button>
    </li>
  );
}
