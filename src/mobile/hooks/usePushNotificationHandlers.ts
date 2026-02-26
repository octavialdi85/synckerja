/**
 * Single global handler for push notification tap: routes to home + reopen notifications modal
 * (general app notifications) or to Live Chat (livechat notifications).
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function usePushNotificationHandlers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handleRef = useRef<PluginListenerHandle | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      const h = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (ev: { notification: { data?: Record<string, string> } }) => {
          const data = ev.notification?.data ?? {};
          const url = data.url ?? "";
          const openNotifications = data.openNotifications === "true";

          if (openNotifications || url === "/" || url === "") {
            queryClient.invalidateQueries({ queryKey: ["review-comment-notifications"] });
            queryClient.invalidateQueries({ queryKey: ["completion-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["plan-status-change-notifications"] });
            queryClient.invalidateQueries({ queryKey: ["daily-task-notifications"] });
            const notificationType = data.notificationType ?? "";
            if (notificationType === "daily_task") {
              const dailyTaskId = data.daily_task_id ?? "";
              const taskStepId = data.task_step_id ?? "";
              const viewParam = data.view ?? "";
              const path = viewParam ? `/tools/daily-task?view=${encodeURIComponent(viewParam)}` : "/tools/daily-task";
              navigate(path, {
                state: dailyTaskId
                  ? {
                      pendingApprovalFocus: {
                        taskId: dailyTaskId,
                        stepId: taskStepId || undefined,
                        openSubStepModalForStepId: taskStepId || undefined,
                      },
                    }
                  : {},
              });
              return;
            }
            if (notificationType === "plan_status_change") {
              navigate("/", { state: { reopenNotifications: true, openNotificationsTab: "updates" as const } });
              return;
            }
            if (notificationType === "review_comment") {
              navigate("/", { state: { reopenNotifications: true, openNotificationsTab: "comments" as const } });
              return;
            }
            if (notificationType === "tasks") {
              navigate("/", { state: { reopenNotifications: true, openNotificationsTab: "tasks" as const } });
              return;
            }
            navigate("/", { state: { reopenNotifications: true } });
            return;
          }
          if (url) {
            try {
              const parsed = new URL(url, "https://x");
              navigate(parsed.pathname + parsed.search);
            } catch {
              navigate("/operations/consultant/all/livechat");
            }
            return;
          }
          navigate("/operations/consultant/all/livechat");
        }
      );
      handleRef.current = h;
    };

    setup();
    return () => {
      handleRef.current?.remove();
      handleRef.current = null;
    };
  }, [navigate, queryClient]);
}
