// Logger configuration for development and production
const isDevelopment = import.meta.env.DEV;
const isVerbose = import.meta.env.VITE_VERBOSE_LOGGING === 'true';

export const logger = {
  // Only log in development or when verbose logging is enabled
  debug: (...args: any[]) => {
    if (isDevelopment || isVerbose) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment || isVerbose) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  // Special method for query logs (reduce noise)
  query: (...args: any[]) => {
    if (isDevelopment && isVerbose) {
      console.log(...args);
    }
  },
  
  // Special method for user data logs (reduce noise)
  userData: (...args: any[]) => {
    if (isDevelopment && isVerbose) {
      console.log(...args);
    }
  },
  
  // Special method for realtime logs (reduce noise)
  realtime: (...args: any[]) => {
    if (isDevelopment && isVerbose) {
      console.log(...args);
    }
  }
};

export default logger;




