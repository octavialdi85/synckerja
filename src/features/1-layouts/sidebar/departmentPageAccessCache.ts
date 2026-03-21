import { logger } from '@/config/logger';

/** Shared page-access result cache (used by useDepartmentAccess + permission mutations). */
export const accessCache = new Map<
  string,
  { result: boolean; timestamp: number; configHash: string }
>();

export const ACCESS_CACHE_TTL = 30000; // 30 seconds

let lastClearTime = 0;
const MIN_CLEAR_INTERVAL = 5000;

/** Clear cached canAccessPage results when permission config changes. */
export const clearAccessCache = () => {
  const now = Date.now();
  if (now - lastClearTime < MIN_CLEAR_INTERVAL) {
    return;
  }
  accessCache.clear();
  lastClearTime = now;
};

export const debugAccessCache = () => {
  logger.debug('🔍 Access Cache Debug:');
  logger.debug('Cache size:', accessCache.size);
  logger.debug('Cache entries:');
  accessCache.forEach((value, key) => {
    logger.debug(`  ${key}:`, value);
  });
};

export const forceClearCache = () => {
  logger.debug('🔥 FORCE CLEARING ALL CACHE');
  logger.debug('Cache before clear:', accessCache.size, 'entries');
  accessCache.forEach((value, key) => {
    logger.debug(`  Removing: ${key} = ${value.result}`);
  });
  accessCache.clear();
  logger.debug('✅ Force clear completed');
};

if (typeof window !== 'undefined') {
  (window as unknown as { debugAccessCache?: typeof debugAccessCache }).debugAccessCache =
    debugAccessCache;
  (window as unknown as { forceClearCache?: typeof forceClearCache }).forceClearCache =
    forceClearCache;
  (window as unknown as { clearAccessCache?: typeof clearAccessCache }).clearAccessCache =
    clearAccessCache;
}
