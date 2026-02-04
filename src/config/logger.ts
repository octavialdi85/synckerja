// Logger configuration for development and production
const isDevelopment = import.meta.env.DEV;
const isVerbose = import.meta.env.VITE_VERBOSE_LOGGING === 'true';

// Env-based log level: error (0), warn (1), info (2), debug (3), trace (4)
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 } as const;
const envLevel = (import.meta.env.VITE_LOG_LEVEL as keyof typeof LEVELS) || (isDevelopment ? 'info' : 'warn');
const currentLevel = LEVELS[envLevel] ?? (isDevelopment ? 2 : 1);

/** When true, all logs use console.log (not debug) so DevTools "Default" level shows them; no "133 hidden". */
function isDailyTaskPage(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.includes('/tools/daily-task');
}

/** Home page (path "/") – show all console for analysis/optimization decisions. */
function isHomePage(): boolean {
  return typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '');
}

/** OKR section (all paths under /okr) – show all console for performance analysis. */
function isOKRPage(): boolean {
  return typeof window !== 'undefined' && (window.location.pathname === '/okr' || window.location.pathname.startsWith('/okr/'));
}

/** Pages where we show full console (no hidden logs) for analysis and optimization. */
function isAnalysisPage(): boolean {
  return isDailyTaskPage() || isHomePage() || isOKRPage();
}

/** On analysis pages (home, daily-task) use log so nothing is hidden by DevTools Verbose filter; else use debug. */
function consoleForAnalysisPage(...args: any[]) {
  if (isAnalysisPage()) console.log(...args);
  else console.debug(...args);
}

// Simple in-memory rate limiter and log-once tracker
const lastLogAt = new Map<string, number>();
const loggedOnce = new Set<string>();

function shouldLogRateLimited(key: string, minIntervalMs = 3000): boolean {
  if (isAnalysisPage()) return true; // no throttling on home/daily-task for performance analysis
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
  if (isDevelopment || isAnalysisPage()) {
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
  // Level-aware logging; on home/daily-task use console.log so DevTools doesn't hide as "Verbose"
  trace: (...args: any[]) => {
    if (isAnalysisPage() || currentLevel >= LEVELS.trace) consoleForAnalysisPage(...args);
  },
  debug: (...args: any[]) => {
    if (isAnalysisPage() || currentLevel >= LEVELS.debug || isVerbose) consoleForAnalysisPage(...args);
  },
  info: (...args: any[]) => {
    if (isAnalysisPage() || currentLevel >= LEVELS.info || isVerbose) console.info(...args);
  },
  warn: (...args: any[]) => {
    if (currentLevel >= LEVELS.warn) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (currentLevel >= LEVELS.error) console.error(...args);
  },

  // Special channels: on home/daily-task use console.log so nothing appears as "133 hidden"
  query: (...args: any[]) => {
    if (isAnalysisPage() || (isDevelopment && (isVerbose || currentLevel >= LEVELS.debug))) {
      (isAnalysisPage() ? console.log : console.debug)(...args);
    }
  },
  userData: (...args: any[]) => {
    if (isAnalysisPage() || (isDevelopment && (isVerbose || currentLevel >= LEVELS.debug))) {
      (isAnalysisPage() ? console.log : console.debug)(...args);
    }
  },
  realtime: (...args: any[]) => {
    if (isAnalysisPage() || (isDevelopment && (isVerbose || currentLevel >= LEVELS.debug))) {
      (isAnalysisPage() ? console.log : console.debug)(...args);
    }
  },

  // Performance monitoring; on home/daily-task use console.log so visible without Verbose level
  performance: (label: string, duration: number, threshold: number = 500) => {
    const isUserDataFetch = label.toLowerCase().includes('user data fetch');
    const showAll = isAnalysisPage();
    if (duration > threshold && !isUserDataFetch) {
      console.warn(`⚠️ SLOW OPERATION: ${label} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
    } else if ((showAll || (isDevelopment && (isVerbose || currentLevel >= LEVELS.debug))) && !isUserDataFetch) {
      (isAnalysisPage() ? console.log : console.debug)(`⚡ ${label}: ${duration.toFixed(2)}ms`);
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