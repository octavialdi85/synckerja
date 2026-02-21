import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SafeAreaInsetsProvider, useSafeAreaInsets } from "@/mobile/contexts/SafeAreaInsetsContext";

interface NativeSafeAreaWrapperProps {
  children: React.ReactNode;
}

function NativeSafeAreaWrapperInner({ children }: NativeSafeAreaWrapperProps) {
  const { top, bottom } = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const check = () => setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    check();
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);

  const showBottomBar = bottom > 0 && !keyboardOpen;

  return (
    <>
      <div
        className="min-h-[100dvh]"
        style={{
          paddingTop: top,
          paddingBottom: bottom,
          ["--safe-area-inset-top" as string]: `${top}px`,
          ["--safe-area-inset-bottom" as string]: `${bottom}px`,
        }}
      >
        {children}
      </div>
      {showBottomBar && (
        <div
          aria-hidden
          className="bg-black fixed left-0 right-0 bottom-0 z-40"
          style={{ height: `${bottom}px` }}
        />
      )}
    </>
  );
}

/**
 * When running inside Capacitor (native app), wraps children with safe area
 * insets so content is not obscured by status bar (top) or device nav bar (bottom).
 * No-op when not on native platform (web/desktop).
 */
export function NativeSafeAreaWrapper({ children }: NativeSafeAreaWrapperProps) {
  if (!Capacitor.isNativePlatform()) {
    return <>{children}</>;
  }

  return (
    <SafeAreaInsetsProvider>
      <NativeSafeAreaWrapperInner>{children}</NativeSafeAreaWrapperInner>
    </SafeAreaInsetsProvider>
  );
}
