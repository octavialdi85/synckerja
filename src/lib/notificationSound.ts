/**
 * Single source of truth for playing notification sound across the app
 * (Livechat, Comment notifications, Pending Approval / Tasks, and future sources).
 */

export interface PlayNotificationSoundOptions {
  /** Whether to vibrate (if supported). Default true. */
  vibrate?: boolean;
}

function getNotificationSoundUrl(): string {
  if (typeof window === 'undefined') return '/notification-bell.wav';
  return `${window.location.origin}/notification-bell.wav`;
}

/**
 * Play the standard notification sound (and optionally vibrate).
 * No-op when document is hidden (tab in background).
 */
export function playNotificationSound(options?: PlayNotificationSoundOptions): void {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') return;

  const vibrate = options?.vibrate !== false;
  if (vibrate && navigator.vibrate) {
    try {
      navigator.vibrate(200);
    } catch {
      // ignore
    }
  }

  try {
    const url = getNotificationSoundUrl();
    const audio = new Audio(url);
    audio.volume = 0.9;
    audio.play().catch(() => {
      tryBeep();
    });
  } catch {
    tryBeep();
  }
}

function tryBeep(): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore
  }
}
