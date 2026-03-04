/**
 * Registers for FCM push notifications on native (Android/iOS) and saves the token
 * to the backend so Live Chat can send notifications when the app is in background.
 * Call this when the user is on Live Chat (or app shell) so token is saved.
 * Uses fallback strings for toasts so this hook does not require LanguageProvider
 * (NativePushSetup is mounted at app root and may run before context is ready, e.g. on HMR).
 */
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/integrations/supabase/client";
import { showLocalNotification } from "@/mobile/utils/showLocalNotification";
import { devLog } from "@/config/logger";
import { toast } from "sonner";

const FALLBACK_SAVE_FAILED = "Gagal menyimpan token notifikasi. Coba lagi nanti.";
const FALLBACK_SAVE_ERROR = "Token notifikasi gagal disimpan.";

export function useLiveChatFCM() {
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
          body: JSON.stringify({ token, platform, context: "livechat" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          devLog.error("livechat-save-fcm-token failed", res.status, err);
          toast.error(FALLBACK_SAVE_FAILED);
        }
      } catch (e) {
        devLog.error("livechat-save-fcm-token error", e);
        toast.error(FALLBACK_SAVE_ERROR);
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
        (ev: { data?: Record<string, string>; title?: string; body?: string }) => {
          const data = ev.data ?? {};
          // Hanya handle push Live Chat; skip push app-notifications (review comment, pending approval, dll)
          const isAppNotification = data.openNotifications === "true" || data.url === "/";
          if (isAppNotification) return;

          const title = ev.title ?? "Live Chat";
          const body = ev.body ?? "";
          const isForeground =
            typeof document !== "undefined" && document.visibilityState === "visible";

          // Foreground: tampilkan system banner saja (sama seperti background), tanpa suara
          if (isForeground) {
            showLocalNotification({ title, body });
          }
          // Background: biarkan FCM OS yang menampilkan banner + bunyi dari payload server
        }
      );
      // pushNotificationActionPerformed is handled globally by usePushNotificationHandlers
      handlesRef.current = [h1, h2];
      run();
    };

    setup();

    return () => {
      handlesRef.current.forEach((h) => h.remove());
      handlesRef.current = [];
    };
  }, []);
}
