/**
 * Query Manager - Prevents duplicate queries and implements request queuing
 * This dramatically reduces database load by deduplicating concurrent requests
 */

interface PendingQuery {
  key: string;
  promise: Promise<any>;
  timestamp: number;
}

class QueryManager {
  private pendingQueries: Map<string, PendingQuery> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private readonly MAX_CONCURRENT = 3; // Limit concurrent queries
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly DEDUPE_WINDOW = 2000; // 2 seconds deduplication window
  private activeCalls = 0;

  /**
   * Execute a query with deduplication and caching
   */
  async execute<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      cacheTTL?: number;
      priority?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const { cacheTTL = this.CACHE_TTL, skipCache = false } = options;

    // Check cache first
    if (!skipCache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        console.log(`📦 Cache hit: ${key}`);
        return cached.data;
      }
    }

    // Check if same query is already pending (deduplication)
    const pending = this.pendingQueries.get(key);
    if (pending && Date.now() - pending.timestamp < this.DEDUPE_WINDOW) {
      console.log(`🔗 Deduplicating query: ${key}`);
      return pending.promise;
    }

    // Create new query promise
    const queryPromise = this.queueQuery(key, queryFn, cacheTTL);
    
    // Store as pending
    this.pendingQueries.set(key, {
      key,
      promise: queryPromise,
      timestamp: Date.now()
    });

    try {
      const result = await queryPromise;
      return result;
    } finally {
      // Clean up pending after deduplication window
      setTimeout(() => {
        if (this.pendingQueries.get(key)?.timestamp === pending?.timestamp) {
          this.pendingQueries.delete(key);
        }
      }, this.DEDUPE_WINDOW);
    }
  }

  /**
   * Queue a query to prevent overwhelming the database
   */
  private async queueQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    cacheTTL: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.activeCalls++;
          console.log(`📡 Executing query: ${key} (active: ${this.activeCalls})`);
          
          const result = await queryFn();
          
          // Cache the result
          this.cache.set(key, {
            data: result,
            timestamp: Date.now()
          });

          resolve(result);
        } catch (error) {
          console.error(`❌ Query failed: ${key}`, error);
          reject(error);
        } finally {
          this.activeCalls--;
          this.processQueue();
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process queued queries respecting concurrency limit
   */
  private async processQueue() {
    if (this.processing || this.activeCalls >= this.MAX_CONCURRENT) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeCalls < this.MAX_CONCURRENT) {
      const task = this.queue.shift();
      if (task) {
        task(); // Don't await - let it run concurrently
      }
    }

    this.processing = false;
  }

  /**
   * Clear cache for a specific key or all
   */
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
      console.log(`🗑️ Cleared cache: ${key}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cleared all cache');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingQueries: this.pendingQueries.size,
      queueLength: this.queue.length,
      activeCalls: this.activeCalls
    };
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL * 2) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} stale cache entries`);
    }
  }
}

// Singleton instance
export const queryManager = new QueryManager();

// Auto cleanup every 5 minutes
setInterval(() => queryManager.cleanupCache(), 5 * 60 * 1000);

