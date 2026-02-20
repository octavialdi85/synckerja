import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/features/1-login/types';

export const SUPABASE_URL = "https://najgdwffjhnqlogfrlqa.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamdkd2ZmamhucWxvZ2ZybHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDg3NjgsImV4cCI6MjA2NTQ4NDc2OH0.Qr10qkO19ssS8ZoF7HUULGFVLX_zeFLCFYJNyI97XHg";

// True singleton using window global - survives hot reload and multiple imports
declare global {
  interface Window {
    __SUPABASE_CLIENT_INSTANCE__?: ReturnType<typeof createClient<Database>>;
  }
}

function getSupabaseClient(): ReturnType<typeof createClient<Database>> {
  if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT_INSTANCE__) {
    return window.__SUPABASE_CLIENT_INSTANCE__;
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Flow type for better compatibility
    flowType: 'pkce',
  },
  global: {
    // Better error handling for network issues with retry logic
    fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
      const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : (url as URL).href;
      const isAuthRequest = urlStr.includes('/auth/v1/');
      // Detect refresh token vs login: refresh_token in URL params or body
      const isRefreshToken = urlStr.includes('grant_type=refresh_token') || 
                            (options.body && typeof options.body === 'string' && options.body.includes('grant_type=refresh_token'));
      // Refresh token: 1 retry on 503/PGRST002 so transient server issues don't expire session immediately
      // Login: longer timeout (40s) and 1 retry on timeout so slow networks can complete
      const isLoginRequest = isAuthRequest && !isRefreshToken;
      const MAX_RETRIES = isRefreshToken ? 1 : (isAuthRequest ? 1 : 1);
      const TIMEOUT_MS = isRefreshToken ? 18000 : (isAuthRequest ? 40000 : 25000);
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Create abort controller for timeout if not already provided
        const controller = options.signal ? undefined : new AbortController();
        const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : undefined;
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: options.signal || controller?.signal,
          });
          
          // Clear timeout on success
          if (timeoutId) clearTimeout(timeoutId);

          // Don't retry for certain error statuses that won't succeed on retry
          // 404: Table/resource doesn't exist - won't exist on retry
          // 500: Server errors - database/query issues, not network issues
          // CORS errors: Configuration issue, won't be fixed by retry
          if (response.status === 404) {
            // Check if this is an expected 404 for KOL tables
            const isExpected404 = urlStr.includes('/kol_') || 
                                 urlStr.includes('/kol-') ||
                                 urlStr.includes('kol_ratings') ||
                                 urlStr.includes('kol_metrics') ||
                                 urlStr.includes('kol_posts') ||
                                 urlStr.includes('kol_operations');
            
            if (isExpected404) {
              // For expected 404s, return a response that Supabase can parse as empty result
              // This prevents the error from propagating while maintaining compatibility
              const emptyResponse = response.clone();
              // Return the response as-is - hooks will handle 404 gracefully
              return response;
            }
            
            // For other 404s, throw error silently
            throw new Error(`Resource not found (404) - ${urlStr}`);
          }
          
          if (response.status === 500) {
            // Refresh token: retry once on "context canceled" (server-side cancel, often transient)
            if (isRefreshToken && attempt < MAX_RETRIES) {
              let bodyText = '';
              try {
                bodyText = await response.clone().text();
              } catch {
                // ignore
              }
              if (bodyText && (bodyText.includes('context canceled') || bodyText.includes('context cancelled'))) {
                if (timeoutId) clearTimeout(timeoutId);
                if (import.meta.env.DEV) {
                  console.warn('⚠️ Auth refresh 500 (context canceled), retrying...');
                }
                await new Promise(r => setTimeout(r, Math.min(600 * Math.pow(2, attempt), 2000)));
                continue;
              }
            }
            if (urlStr.includes('/auth/v1/')) {
              window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
                detail: { status: 500, message: 'Session or refresh token error (500)', url: urlStr }
              }));
            }
            throw new Error(`Server error (500) - ${urlStr}`);
          }
          if (response.status === 502 && urlStr.includes('/auth/v1/')) {
            window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
              detail: { status: 502, message: 'Auth service unavailable. Please sign in again.', url: urlStr }
            }));
            throw new Error(`Auth service unavailable (502) - ${urlStr}`);
          }
          
          // Handle 503 Service Unavailable - usually temporary, should retry
          // This can happen when database connection pool is exhausted or service is overloaded
          // PGRST002 errors often come as 503 status with error code in body
          if (response.status === 503) {
            // Try to read error body to check for PGRST002
            let errorBody: any = null;
            try {
              const text = await response.clone().text();
              if (text) {
                try {
                  errorBody = JSON.parse(text);
                } catch {
                  // Not JSON, use text as message
                  errorBody = { message: text };
                }
              }
            } catch {
              // Can't read body, continue with status-based handling
            }
            
            // Check if it's a PGRST002 error (schema cache issue)
            const isPGRST002 = errorBody?.code === 'PGRST002' || 
                              (errorBody?.message && errorBody.message.includes('PGRST002')) ||
                              (errorBody?.message && errorBody.message.includes('schema cache'));
            
            // For auth endpoints, dispatch timeout event
            if (urlStr.includes('/auth/v1/')) {
              window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
                detail: { 
                  status: 503, 
                  message: isPGRST002 
                    ? 'Database connection issue (PGRST002). Retrying...' 
                    : 'Service temporarily unavailable (503). Retrying...', 
                  url 
                }
              }));
            }
            
            // Create error with PGRST002 info if available
            const errorMsg = isPGRST002 
              ? `Database connection issue (PGRST002) - ${urlStr}`
              : `Service unavailable (503) - ${urlStr}`;
            const error = new Error(errorMsg);
            if (isPGRST002) {
              (error as any).code = 'PGRST002';
            }
            throw error;
          }
          
          // Check for CORS errors in response headers
          // Note: Browser CORS errors may prevent us from reading headers, so we check status
          // If we get a response but it's a CORS error, the browser will block it before we can read headers
          // This check is mainly for server-side CORS errors
          const corsHeader = response.headers.get('Access-Control-Allow-Origin');
          if (response.status >= 400 && corsHeader && !corsHeader.includes(window.location.origin)) {
            // CORS configuration issue - won't be fixed by retry
            throw new Error(`CORS error - origin not allowed: ${urlStr}`);
          }

          // CRITICAL: Handle 504/522 on any auth path (/token refresh, /user, etc.)
          // 522 = Connection Timed Out (Cloudflare can't reach Supabase origin - server down/slow)
          // 504 = Gateway Timeout (Supabase "context deadline exceeded" - auth service overloaded)
          if ((response.status === 504 || response.status === 522) && urlStr.includes('/auth/v1/')) {
            const errorType = response.status === 504 ? 'Gateway Timeout' : 'Connection Timed Out';
            const isRefresh = urlStr.includes('grant_type=refresh_token');
            // Retry login once on 504/522 (server-side timeout) - often succeeds on retry
            if (isLoginRequest && !isRefresh && attempt < MAX_RETRIES) {
              if (timeoutId) clearTimeout(timeoutId);
              if (import.meta.env.DEV) {
                console.warn(`⚠️ Auth login ${response.status} (${errorType}), retrying (${attempt + 1}/${MAX_RETRIES + 1})...`);
              }
              const delay = Math.min(800 * Math.pow(2, attempt), 3000);
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            if (import.meta.env.DEV) {
              console.warn(`⚠️ Auth ${isRefresh ? 'refresh token' : 'request'} ${response.status} (${errorType})`);
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
                detail: { 
                  status: response.status, 
                  message: `${errorType} - Auth service unavailable. Please sign in again.`, 
                  url 
                }
              }));
            }
            throw new Error(`Auth ${response.status} - ${errorType}`);
          }
          
          return response;
        } catch (error: any) {
          // Clear timeout
          if (timeoutId) clearTimeout(timeoutId);
          
          // Check for CORS errors first - these won't succeed on retry
          // CORS errors appear as TypeError with "Failed to fetch" or specific CORS messages
          // Note: Browser CORS errors may not have the message in error.message, check error.toString() too
          const errorMessage = (error.message || error.toString() || '').toLowerCase();
          const errorName = error.name || '';
          const errorStack = (error.stack || '').toLowerCase();
          
          // Detect CORS errors - they can appear in different forms:
          // 1. Explicit CORS message in error message
          // 2. TypeError with "Failed to fetch" for REST API calls (common CORS pattern)
          // 3. Error stack containing CORS-related text
          // 4. Specific CORS error about origin mismatch (e.g., "has a value 'http://localhost:8081' that is not equal")
          const isCorsError = errorMessage.includes('cors') || 
                             errorMessage.includes('access-control-allow-origin') ||
                             errorMessage.includes('blocked by cors policy') ||
                             errorMessage.includes('not equal to the supplied origin') ||
                             errorMessage.includes('has a value') && errorMessage.includes('that is not equal') ||
                             errorStack.includes('cors') ||
                             (errorName === 'TypeError' && 
                              errorMessage.includes('failed to fetch') && 
                              urlStr.includes('/rest/v1/') &&
                              !errorMessage.includes('timeout')); // Exclude timeout errors
          
          // Check for other non-retryable errors
          const isTimeout = errorName === 'AbortError' || errorName === 'TimeoutError' || errorMessage.includes('timeout');
          const isNetworkError = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');
          const is404Error = errorMessage.includes('404') || errorMessage.includes('Resource not found');
          const is500Error = errorMessage.includes('500') || errorMessage.includes('Server error');
          const is503Error = errorMessage.includes('503') || errorMessage.includes('Service unavailable');
          // PGRST002 = PostgREST schema cache error - database connection issue, should retry
          const isPGRSTError = errorMessage.includes('PGRST002') || errorMessage.includes('schema cache') || 
                              (error.code && error.code === 'PGRST002');
          
          // Refresh token failures: redirect unless user just logged in (< 15s ago)
          if (isRefreshToken && (isTimeout || isNetworkError || isCorsError || is500Error)) {
            if (typeof window !== 'undefined') {
              const justLoggedIn = sessionStorage.getItem('justLoggedIn');
              let shouldRedirect = true;
              
              if (justLoggedIn) {
                const loginTime = parseInt(justLoggedIn, 10);
                const timeSinceLogin = Date.now() - loginTime;
                // Grace period 60s after login so slow/503 responses don't redirect immediately
                if (timeSinceLogin < 60000) {
                  if (import.meta.env.DEV) {
                    console.log(`Refresh token failed but ignoring redirect (user logged in ${Math.round(timeSinceLogin / 1000)}s ago)`);
                  }
                  shouldRedirect = false;
                } else {
                  sessionStorage.removeItem('justLoggedIn');
                }
              }
              
              if (shouldRedirect) {
                const status = isTimeout ? 408 : (is500Error ? 500 : 502);
                window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
                  detail: { 
                    status, 
                    message: 'Session expired or auth service unavailable. Please sign in again.', 
                    url 
                  }
                }));
              }
            }
            // Still throw error so Supabase knows refresh failed, but handler won't redirect if just logged in
            throw new Error('Refresh token failed - please sign in again.');
          }
          
          // Auth + network/CORS failure (e.g. 502 Bad Gateway, CORS block): don't retry, redirect to login
          if (isAuthRequest && (isNetworkError || isCorsError)) {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
                detail: { status: 502, message: 'Auth service unavailable. Please sign in again.', url: urlStr }
              }));
            }
            throw new Error('Auth service unavailable (network/CORS). Please sign in again.');
          }
          
          // Don't retry for errors that won't succeed on retry
          // CORS errors are critical - never retry them (they're configuration issues)
          // Timeout errors (especially auth) - don't retry, fail fast
          if (isCorsError || (isTimeout && isAuthRequest)) {
            if (isTimeout && isAuthRequest && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
                detail: { status: 408, message: 'Auth request timed out or was aborted. Please sign in again.', url: urlStr }
              }));
            }
            // Check if this is an expected CORS error for KOL tables
            const isExpectedCorsError = urlStr.includes('/kol_') || 
                                       urlStr.includes('/kol-') ||
                                       urlStr.includes('kol_ratings') ||
                                       urlStr.includes('kol_metrics') ||
                                       urlStr.includes('kol_posts') ||
                                       urlStr.includes('kol_operations');
            
            // For expected CORS errors, throw silently - hooks will handle gracefully
            // Note: Browser console will still show CORS errors, but our code handles them silently
            if (isExpectedCorsError) {
              // Create a custom error that hooks can catch and handle silently
              const silentError = new Error('CORS_ERROR_SILENT');
              (silentError as any).isExpected = true;
              throw silentError;
            }
            
            // For unexpected CORS errors, don't log - they're handled by hooks
            throw error;
          }
          
          // Retry for 503 (Service Unavailable), PGRST002, and login timeout - these are usually temporary
          // Don't retry: timeout on refresh token, 404, 500 (unless PGRST002), or non-network errors
          const isRetryable503OrPGRST = is503Error || isPGRSTError;
          const retryOnTimeout = isLoginRequest && attempt < MAX_RETRIES;
          const shouldNotRetry = attempt === MAX_RETRIES || 
                                (isTimeout && !isRetryable503OrPGRST && !retryOnTimeout) || 
                                is404Error || 
                                (is500Error && !isPGRSTError) || 
                                (!isTimeout && !isNetworkError && !isRetryable503OrPGRST);
          
          if (shouldNotRetry) {
            if (isTimeout) {
              const timeoutSeconds = TIMEOUT_MS / 1000;
              // For auth timeout, dispatch event so app can handle gracefully
              if (isAuthRequest) {
                window.dispatchEvent(new CustomEvent('supabase-auth-timeout', {
                  detail: { status: 408, message: `Auth request timeout after ${timeoutSeconds}s`, url: urlStr }
                }));
              }
              throw new Error(`Network request timeout after ${timeoutSeconds} seconds${isAuthRequest ? ' (auth request)' : ''}`);
            }
            if (isNetworkError) {
              throw new Error('Network request failed - please check your connection');
            }
            throw error;
          }
          
          // Use longer delay for 503/PGRST errors (service overloaded, needs more time)
          const baseDelay = isRetryable503OrPGRST ? 500 : 200;
          const delay = Math.min(baseDelay * Math.pow(2, attempt), isRetryable503OrPGRST ? 5000 : 2000);
          if (import.meta.env.DEV && !isCorsError) {
            console.log(`Supabase request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw new Error('Max retries exceeded');
    },
  },
  });

  if (typeof window !== 'undefined') {
    window.__SUPABASE_CLIENT_INSTANCE__ = client;
  }  return client;
}export const supabase = getSupabaseClient();