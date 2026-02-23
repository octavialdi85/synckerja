/**
 * Registers for FCM push notifications on native (Android/iOS) and saves the token
 * to the backend so Live Chat can send notifications when the app is in background.
 * Call this when the user is on Live Chat (or app shell) so token is saved.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/integrations/supabase/client";
import { devLog } from "@/config/logger";
import { toast } from "sonner";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

export function useLiveChatFCM() {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const handlesRef = useRef<PluginListenerHandle[]>([]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const saveToken = async (token: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const platform = Capacitor.getPlatform() as "android" | "ios";
        const res = await fetch(`${SUPABASE_URL}/functions/v1/livechat-save-fcm-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token, platform }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          devLog.error("livechat-save-fcm-token failed", res.status, err);
          toast.error(t("livechat.fcmTokenSaveFailed", "Gagal menyimpan token notifikasi. Coba lagi nanti."));
        }
      } catch (e) {
        devLog.error("livechat-save-fcm-token error", e);
        toast.error(t("livechat.fcmTokenSaveError", "Token notifikasi gagal disimpan."));
      }
    };

    const run = async () => {
      try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;
        await PushNotifications.register();
      } catch (e) {
        devLog.error("PushNotifications register error", e);
      }
    };

    const setup = async () => {
      const h1 = await PushNotifications.addListener(
        "registration",
        (ev: { value: string }) => {
          if (ev.value) saveToken(ev.value);
        }
      );
      const h2 = await PushNotifications.addListener(
        "pushNotificationReceived",
        () => {
          // Optional: in-app toast or play sound when in foreground
        }
      );
      const h3 = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (ev: { notification: { data?: Record<string, string> } }) => {
          const data = ev.notification?.data;
          if (data?.url) {
            try {
              const url = new URL(data.url);
              navigate(url.pathname + url.search);
            } catch {
              navigate("/operations/consultant/all/livechat");
            }
          } else {
            navigate("/operations/consultant/all/livechat");
          }
        }
      );
      handlesRef.current = [h1, h2, h3];
      run();
    };

    setup();

    return () => {
      handlesRef.current.forEach((h) => h.remove());
      handlesRef.current = [];
    };
  }, [navigate, t]);
}
