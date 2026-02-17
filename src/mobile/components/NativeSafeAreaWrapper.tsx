import { Capacitor } from "@capacitor/core";
import { SafeAreaInsetsProvider, useSafeAreaInsets } from "@/mobile/contexts/SafeAreaInsetsContext";

interface NativeSafeAreaWrapperProps {
  children: React.ReactNode;
}

function NativeSafeAreaWrapperInner({ children }: NativeSafeAreaWrapperProps) {
  const { top, bottom } = useSafeAreaInsets();
  return (
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
