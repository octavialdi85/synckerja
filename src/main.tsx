import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress expected browser errors (CORS/404 for KOL tables)
if (typeof window !== 'undefined') {
  // Register service worker for Live Chat Web Push (so push works when tab is closed)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (import.meta.env.DEV) {
          // Optional: log in dev
        }
      })
      .catch(() => {});
  }

  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  // Filter out expected errors
  console.error = (...args: any[]) => {
    // Convert all arguments to string for checking
    const allArgsStr = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg).toLowerCase();
        } catch {
          return String(arg).toLowerCase();
        }
      }
      return String(arg).toLowerCase();
    }).join(' ');
    
    const message = allArgsStr;
    const url = args.find(arg => typeof arg === 'string' && arg.includes('http')) || '';
    const errorObj = args.find(arg => typeof arg === 'object' && arg !== null);
    const errorCode = (errorObj as any)?.code || '';
    const errorMessage = (errorObj as any)?.message || '';
    
    // Check if any argument contains KOL-related URLs or error messages
    const hasKOLUrl = args.some(arg => {
      const argStr = String(arg).toLowerCase();
      return argStr.includes('kol_ratings') ||
             argStr.includes('kol_metrics') ||
             argStr.includes('kol_posts') ||
             argStr.includes('kol_operations') ||
             argStr.includes('kol_content_post_performance') ||
             argStr.includes('kol_campaign_assignments') ||
             argStr.includes('conversion_types');
    });
    
    const isExpectedError = 
      // CORS errors for KOL tables
      (message.includes('cors') && (message.includes('kol_') || url.includes('kol_') || hasKOLUrl)) ||
      // 404 errors for KOL tables
      ((message.includes('404') || errorCode === '42P01') && (message.includes('kol_') || url.includes('kol_') || hasKOLUrl)) ||
      // 400 errors for KOL tables (column doesn't exist, etc)
      ((message.includes('400') || errorCode === '42703') && (message.includes('kol_') || url.includes('kol_') || hasKOLUrl)) ||
      // Failed to fetch for KOL tables
      (message.includes('failed to fetch') && (message.includes('kol_') || url.includes('kol_') || hasKOLUrl)) ||
      (message.includes('net::err_failed') && (url.includes('kol_') || hasKOLUrl)) ||
      // Specific KOL table names in message
      message.includes('kol_ratings') ||
      message.includes('kol_metrics') ||
      message.includes('kol_posts') ||
      message.includes('kol_operations') ||
      message.includes('kol_content_post_performance') ||
      message.includes('kol_campaign_assignments') ||
      message.includes('conversion_types') ||
      // Error messages about missing tables/columns
      (errorMessage && errorMessage.includes('does not exist') && (message.includes('kol_') || url.includes('kol_') || hasKOLUrl || errorMessage.includes('kol_'))) ||
      (errorMessage && errorMessage.includes('column') && errorMessage.includes('does not exist') && (message.includes('kol_') || url.includes('kol_') || hasKOLUrl || errorMessage.includes('kol_'))) ||
      (errorMessage && errorMessage.includes('relation') && errorMessage.includes('does not exist') && (message.includes('kol_') || url.includes('kol_') || hasKOLUrl || errorMessage.includes('kol_'))) ||
      // URL patterns
      url.includes('kol_ratings') ||
      url.includes('kol_metrics') ||
      url.includes('kol_posts') ||
      url.includes('kol_operations') ||
      url.includes('kol_content_post_performance') ||
      url.includes('kol_campaign_assignments') ||
      url.includes('conversion_types') ||
      // Direct URL check
      hasKOLUrl;
    
    if (!isExpectedError) {
      originalError.apply(console, args);
    }
  };
  
  console.warn = (...args: any[]) => {
    const message = args.join(' ').toLowerCase();
    const url = args.find(arg => typeof arg === 'string' && arg.includes('http')) || '';
    const isExpectedWarning = 
      // CORS warnings for KOL tables
      (message.includes('cors') && (message.includes('kol_') || url.includes('kol_'))) ||
      // Specific KOL table names
      message.includes('kol_ratings') ||
      message.includes('kol_metrics') ||
      message.includes('kol_posts') ||
      message.includes('kol_operations') ||
      message.includes('kol_content_post_performance') ||
      message.includes('kol_campaign_assignments') ||
      message.includes('conversion_types') ||
      message.includes('table not found') ||
      message.includes('does not exist') ||
      // Slow operation warnings for User Data Fetch (expected on initial load)
      message.includes('slow operation') && message.includes('user data fetch') ||
      // URL patterns
      url.includes('kol_ratings') ||
      url.includes('kol_metrics') ||
      url.includes('kol_posts') ||
      url.includes('kol_operations') ||
      url.includes('kol_content_post_performance') ||
      url.includes('kol_campaign_assignments') ||
      url.includes('conversion_types');
    
    if (!isExpectedWarning) {
      originalWarn.apply(console, args);
    }
  };
  
  // Suppress console.log for KOL-related messages
  // Set to true to suppress ALL KOL logs even in development
  const SUPPRESS_KOL_LOGS_IN_DEV = true; // Suppress all KOL logs to reduce console noise
  
  console.log = (...args: any[]) => {
    const message = args.join(' ').toLowerCase();
    const isKOLLog = 
      message.includes('kol') ||
      message.includes('fetching kol') ||
      message.includes('kol analytics') ||
      message.includes('kol campaigns') ||
      message.includes('kol performance') ||
      message.includes('kol management') ||
      message.includes('modal opened') ||
      message.includes('🔧') ||
      message.includes('🎯') ||
      message.includes('✅') ||
      message.includes('🔍') ||
      message.includes('📊');
    
    // Suppress KOL logs in production, or in dev if SUPPRESS_KOL_LOGS_IN_DEV is true
    if (import.meta.env.PROD || SUPPRESS_KOL_LOGS_IN_DEV) {
      if (!isKOLLog) {
        originalLog.apply(console, args);
      }
    } else {
      // In development, allow all logs (normal for debugging)
      originalLog.apply(console, args);
    }
  };
  
  // Suppress network errors for expected 404s/CORS/400
  window.addEventListener('error', (event) => {
    const message = (event.message || '').toLowerCase();
    const filename = (event.filename || '').toLowerCase();
    const isExpectedNetworkError = 
      // Specific KOL table names
      message.includes('kol_ratings') ||
      message.includes('kol_metrics') ||
      message.includes('kol_posts') ||
      message.includes('kol_operations') ||
      message.includes('kol_content_post_performance') ||
      message.includes('kol_campaign_assignments') ||
      message.includes('conversion_types') ||
      // Error codes and patterns
      ((message.includes('404') || message.includes('400')) && (message.includes('kol_') || filename.includes('kol_'))) ||
      (message.includes('cors') && (message.includes('kol_') || filename.includes('kol_'))) ||
      (message.includes('failed to fetch') && (message.includes('kol_') || filename.includes('kol_'))) ||
      (message.includes('does not exist') && (message.includes('kol_') || filename.includes('kol_'))) ||
      // Filename patterns
      filename.includes('kol_ratings') ||
      filename.includes('kol_metrics') ||
      filename.includes('kol_posts') ||
      filename.includes('kol_operations') ||
      filename.includes('kol_content_post_performance') ||
      filename.includes('kol_campaign_assignments') ||
      filename.includes('conversion_types');
    
    if (isExpectedNetworkError) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
  
  // Suppress unhandled promise rejections for expected errors
  window.addEventListener('unhandledrejection', (event) => {
    const message = (event.reason?.message || event.reason?.toString() || '').toLowerCase();
    const errorObj = event.reason;
    const errorCode = (errorObj as any)?.code || '';
    const errorMessage = (errorObj as any)?.message || '';
    
    const isExpectedRejection = 
      // Specific KOL table names
      message.includes('kol_ratings') ||
      message.includes('kol_metrics') ||
      message.includes('kol_posts') ||
      message.includes('kol_operations') ||
      message.includes('kol_content_post_performance') ||
      message.includes('kol_campaign_assignments') ||
      message.includes('conversion_types') ||
      // Error codes
      ((errorCode === '42P01' || errorCode === '42703') && (message.includes('kol_') || errorMessage.includes('kol_'))) ||
      // Error patterns
      ((message.includes('404') || message.includes('400')) && message.includes('kol_')) ||
      (message.includes('cors') && message.includes('kol_')) ||
      (message.includes('failed to fetch') && message.includes('kol_')) ||
      ((errorMessage.includes('does not exist') || errorMessage.includes('column') || errorMessage.includes('relation')) && 
       (message.includes('kol_') || errorMessage.includes('kol_')));
    
    if (isExpectedRejection) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <App />
);
