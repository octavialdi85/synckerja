import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface SafeAreaInsets {
  top: number;
  bottom: number;
}

const defaultInsets: SafeAreaInsets = { top: 0, bottom: 0 };

const SafeAreaInsetsContext = createContext<SafeAreaInsets>(defaultInsets);

export function useSafeAreaInsets(): SafeAreaInsets {
  return useContext(SafeAreaInsetsContext);
}

interface SafeAreaInsetsProviderProps {
  children: React.ReactNode;
}

interface SafeAreaInsetsPlugin {
  getInsets(): Promise<{ top: number; bottom: number }>;
}

/** Fallback when platform reports 0,0 (e.g. some emulators or timing). Only used on native. */
const NATIVE_FALLBACK_INSETS: SafeAreaInsets = { top: 24, bottom: 48 };

/**
 * Provides safe area insets from the platform (Android WindowInsets API).
 * On native, if the system reports 0,0 after retries, uses a fallback so content is not covered.
 * On web/non-native, provides { top: 0, bottom: 0 }.
 */
export function SafeAreaInsetsProvider({ children }: SafeAreaInsetsProviderProps) {
  const [insets, setInsets] = useState<SafeAreaInsets>(defaultInsets);
  const retryCleanupRef = useRef<(() => void) | null>(null);

  const fetchInsets = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    const plugin = registerPlugin<SafeAreaInsetsPlugin>("SafeAreaInsets");
    const tryFetch = async (): Promise<SafeAreaInsets> => {
      try {
        const result = await plugin.getInsets();
        return { top: result?.top ?? 0, bottom: result?.bottom ?? 0 };
      } catch {
        return defaultInsets;
      }
    };
    const first = await tryFetch();
    setInsets(first.top > 0 || first.bottom > 0 ? first : NATIVE_FALLBACK_INSETS);
    if (first.top === 0 && first.bottom === 0) {
      const t1 = window.setTimeout(async () => {
        const retry = await tryFetch();
        if (retry.top > 0 || retry.bottom > 0) setInsets(retry);
      }, 300);
      const t2 = window.setTimeout(async () => {
        const retry = await tryFetch();
        if (retry.top > 0 || retry.bottom > 0) setInsets(retry);
      }, 800);
      const t3 = window.setTimeout(async () => {
        const retry = await tryFetch();
        if (retry.top > 0 || retry.bottom > 0) setInsets(retry);
      }, 1500);
      retryCleanupRef.current = () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }
  }, []);

  useEffect(() => {
    fetchInsets();
    return () => retryCleanupRef.current?.();
  }, [fetchInsets]);

  return (
    <SafeAreaInsetsContext.Provider value={insets}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}
