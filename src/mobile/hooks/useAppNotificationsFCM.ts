/**
 * Registers FCM token with context "general" for app notifications (comments, pending approvals, etc.)
 * so push is sent when app is in background. Call once at app shell when on native.
 * When app is in foreground: shows system banner only (same style as background), no sound, no toast.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/integrations/supabase/client";
import { showLocalNotification } from "@/mobile/utils/showLocalNotification";
import { playNotificationSound } from "@/lib/notificationSound";
import { devLog } from "@/config/logger";
import { toast } from "sonner";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

export function useAppNotificationsFCM() {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const handlesRef = useRef<PluginListenerHandle[]>([]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const saveToken = async (token: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const platform = Capacitor.getPlatform() as "android" | "ios";
        const res = await fetch(`${SUPABASE_URL}/functions/v1/livechat-save-fcm-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token, platform, context: "general" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          devLog.error("app-notifications FCM token save failed", res.status, err);
          toast.error(t("livechat.fcmTokenSaveFailed", "Gagal menyimpan token notifikasi. Coba lagi nanti."));
        }
      } catch (e) {
        devLog.error("app-notifications FCM token save error", e);
        toast.error(t("livechat.fcmTokenSaveError", "Token notifikasi gagal disimpan."));
      }
    };

    const run = async () => {
      try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;
        await PushNotifications.register();
      } catch (e) {
        devLog.error("PushNotifications register (app notifications) error", e);
      }
    };

    const setup = async () => {
      const h1 = await PushNotifications.addListener("registration", (ev: { value: string }) => {
        if (ev.value) saveToken(ev.value);
      });
      const h2 = await PushNotifications.addListener(
        "pushNotificationReceived",
        (ev: { data?: Record<string, string>; title?: string; body?: string }) => {
          const data = ev.data ?? {};
          const isAppNotification = data.openNotifications === "true" || data.url === "/";
          if (!isAppNotification) return;
          // Foreground: play sound, then show system banner (same as background)
          playNotificationSound({ vibrate: true });
          const title = ev.title ?? t("notifications.newNotification", "Notifikasi");
          const body = ev.body ?? "";
          showLocalNotification({ title, body });
          queryClient.invalidateQueries({ queryKey: ["review-comment-notifications"] });
          queryClient.invalidateQueries({ queryKey: ["completion-approvals"] });
          queryClient.invalidateQueries({ queryKey: ["plan-status-change-notifications"] });
          queryClient.invalidateQueries({ queryKey: ["daily-task-notifications"] });
        }
      );
      handlesRef.current = [h1, h2];
      run();
    };

    setup();
    return () => {
      handlesRef.current.forEach((h) => h.remove());
      handlesRef.current = [];
    };
  }, [t, queryClient]);
}
