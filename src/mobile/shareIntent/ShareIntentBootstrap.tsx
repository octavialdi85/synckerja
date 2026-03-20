import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/features/1-login";
import { ShareIntent } from "@/plugins/share-intent";

/**
 * When the app opens from Android share with pending files, navigate authenticated users
 * to the receipt validation route.
 */
export function ShareIntentBootstrap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    const goIfNeeded = async () => {
      try {
        const { files } = await ShareIntent.getPendingPayload();
        if (files.length === 0) return;
        if (location.pathname === "/share/receipt-validation") return;
        navigate("/share/receipt-validation", { replace: true });
      } catch {
        /* ignore */
      }
    };

    void goIfNeeded();

    let removeListener: (() => Promise<void>) | undefined;
    ShareIntent.addListener("shareIntentReceived", () => {
      void goIfNeeded();
    }).then((handle) => {
      removeListener = () => handle.remove();
    });

    return () => {
      void removeListener?.();
    };
  }, [user, navigate, location.pathname]);

  return null;
}
