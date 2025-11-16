// Logger configuration for development and production
const isDevelopment = import.meta.env.DEV;
const isVerbose = import.meta.env.VITE_VERBOSE_LOGGING === 'true';

// Env-based log level: error (0), warn (1), info (2), debug (3), trace (4)
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 } as const;
const envLevel = (import.meta.env.VITE_LOG_LEVEL as keyof typeof LEVELS) || (isDevelopment ? 'info' : 'warn');
const currentLevel = LEVELS[envLevel] ?? (isDevelopment ? 2 : 1);

// Simple in-memory rate limiter and log-once tracker
const lastLogAt = new Map<string, number>();
const loggedOnce = new Set<string>();

function shouldLogRateLimited(key: string, minIntervalMs = 3000): boolean {
  const now = Date.now();
  const last = lastLogAt.get(key) ?? 0;
  if (now - last < minIntervalMs) return false;
  lastLogAt.set(key, now);
  return true;
}

function shouldLogOnce(key: string): boolean {
  if (loggedOnce.has(key)) return false;
  loggedOnce.add(key);
  return true;
}

function withGroupCollapsed(label: string, fn: () => void): void {
  if (isDevelopment) {
    console.groupCollapsed(label);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  } else {
    fn();
  }
}

export const logger = {
  // Level-aware logging
  trace: (...args: any[]) => {
    if (currentLevel >= LEVELS.trace) console.debug(...args);
  },
  debug: (...args: any[]) => {
    if (currentLevel >= LEVELS.debug || isVerbose) console.debug(...args);
  },
  info: (...args: any[]) => {
    if (currentLevel >= LEVELS.info || isVerbose) console.info(...args);
  },
  warn: (...args: any[]) => {
    if (currentLevel >= LEVELS.warn) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (currentLevel >= LEVELS.error) console.error(...args);
  },

  // Special channels to reduce noise in production
  query: (...args: any[]) => {
    if (isDevelopment && (isVerbose || currentLevel >= LEVELS.debug)) {
      console.debug(...args);
    }
  },
  userData: (...args: any[]) => {
    if (isDevelopment && (isVerbose || currentLevel >= LEVELS.debug)) {
      console.debug(...args);
    }
  },
  realtime: (...args: any[]) => {
    if (isDevelopment && (isVerbose || currentLevel >= LEVELS.debug)) {
      console.debug(...args);
    }
  },

  // Helpers
  rateLimited: (key: string, minIntervalMs: number, cb: () => void) => {
    if (shouldLogRateLimited(key, minIntervalMs)) cb();
  },
  once: (key: string, cb: () => void) => {
    if (shouldLogOnce(key)) cb();
  },
  groupCollapsed: (label: string, cb: () => void) => withGroupCollapsed(label, cb),
};

// Alias for devLog (to maintain consistency with existing codebase)
export const devLog = {
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: logger.error,
  log: logger.debug, // Alias for console.log replacement
};

// Export default logger
export default logger;