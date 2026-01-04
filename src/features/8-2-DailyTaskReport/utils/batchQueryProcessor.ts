import { supabase } from '@/integrations/supabase/client';
import { QUERY_CONFIG } from '../constants/queryConfig';
import { logger } from '@/config/logger';

interface BatchQueryOptions {
  batchSize: number;
  timeout: number;
  delayBetweenBatches?: number;
  skipOnError?: boolean;
  onError?: (error: any, batch: string[]) => void;
}

interface QueryBuilder<T> {
  (batch: string[]): Promise<{ data: T[] | null; error: any }>;
}

/**
 * Process queries in batches with error handling and timeout
 */
export async function processBatchQuery<T>(
  ids: string[],
  queryBuilder: QueryBuilder<T>,
  options: BatchQueryOptions
): Promise<T[]> {
  const {
    batchSize,
    timeout,
    delayBetweenBatches = 0,
    skipOnError = true,
    onError,
  } = options;

  if (ids.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }

  const allResults: T[] = [];
  let failureCount = 0;

  for (const batch of batches) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      );

      const queryPromise = queryBuilder(batch);
      const result = await Promise.race([queryPromise, timeoutPromise]);

      if (result.data && result.data.length > 0) {
        allResults.push(...result.data);
      }

      // Reset failure count on success
      failureCount = 0;
    } catch (err: any) {
      failureCount++;
      
      // Don't retry for 500 errors (server errors)
      if (err?.status === 500) {
        if (onError) onError(err, batch);
        if (!skipOnError) throw err;
        continue;
      }

      // For other errors, log and optionally skip
      if (onError) onError(err, batch);
      if (!skipOnError) throw err;
    }

    // Delay between batches to avoid overwhelming database
    if (delayBetweenBatches > 0 && batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return allResults;
}

/**
 * Query completion dates for step IDs
 * DISABLED: This query causes 500 errors and timeouts. Returning empty map.
 */
export async function fetchCompletionDates(
  stepIds: string[]
): Promise<Record<string, string>> {
  // Query disabled due to 500 errors and timeout issues
  // Return empty map to prevent errors
  logger.debug('⚠️ Completion dates query disabled due to database performance issues');
  return {};
}

/**
 * Query blockers for step IDs
 * DISABLED: This query causes 500 errors and timeouts. Returning empty array.
 */
export async function fetchStepBlockers(
  stepIds: string[],
  isSubStep: boolean = false
): Promise<any[]> {
  // Query disabled due to 500 errors and timeout issues
  // Return empty array to prevent errors
  logger.debug(`⚠️ ${isSubStep ? 'Sub-step' : 'Step'} blockers query disabled due to database performance issues`);
  return [];
}

