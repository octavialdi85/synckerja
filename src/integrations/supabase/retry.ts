/**
 * Retry utility for handling network failures with exponential backoff
 * Useful for transient network errors that might succeed on retry
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
  retryableErrors: [
    'Failed to fetch',
    'ERR_CONNECTION_CLOSED',
    'NetworkError',
    'Network request failed',
    'Network request timeout',
    'AuthRetryableFetchError',
    'ERR_FAILED',
    'CORS',
    '520',
    'timeout',
  ],
};

/**
 * Check if an error is retryable (network-related)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorName = error.name || '';
  const errorCode = error.code || '';
  const errorDetails = error.details || '';
  
  // Check if it's a 520 error or timeout
  if (errorMessage.includes('520') || errorCode === '520') return true;
  if (errorMessage.toLowerCase().includes('timeout')) return true;
  if (errorMessage.toLowerCase().includes('cors')) return true;
  
  return DEFAULT_OPTIONS.retryableErrors.some(pattern => 
    errorMessage.includes(pattern) || 
    errorName.includes(pattern) ||
    errorCode.includes(pattern) ||
    errorDetails.includes(pattern)
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * Only retries on network-related errors, not on auth errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry if we've exceeded max retries
      if (attempt >= opts.maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(2, attempt),
        opts.maxDelay
      );
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Wrapper for Supabase auth operations with retry logic
 */
export async function retryableAuthOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(operation, {
    maxRetries: 1, // Only 1 retry for auth operations to avoid delays
    initialDelay: 300,
    maxDelay: 1000,
    ...options,
  });
}

/**
 * Wrapper for Supabase database query operations with retry logic
 */
export async function retryableQuery<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(operation, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    ...options,
  });
}















