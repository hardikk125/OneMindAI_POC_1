/**
 * API Response Cache Hook
 * 
 * Caches API responses for 5 minutes (per rules) to reduce redundant calls.
 * Supports automatic invalidation and manual cache clearing.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** Cache duration in milliseconds (default: 5 minutes per rules) */
  ttl?: number;
  /** Unique key for this cache entry */
  key: string;
}

// Global cache store (persists across component remounts)
const globalCache = new Map<string, CacheEntry<unknown>>();

// Default TTL: 5 minutes (300,000 ms) per rules
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Get cached data if valid
 */
export function getCachedData<T>(key: string): T | null {
  const entry = globalCache.get(key) as CacheEntry<T> | undefined;
  
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    globalCache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Set cached data
 */
export function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  const now = Date.now();
  globalCache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  });
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  globalCache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  globalCache.clear();
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of globalCache.entries()) {
    if (now > (entry as CacheEntry<unknown>).expiresAt) {
      globalCache.delete(key);
    }
  }
}

/**
 * Hook for caching API responses
 */
export function useApiCache<T>(options: CacheOptions) {
  const { key, ttl = DEFAULT_TTL } = options;
  const [data, setData] = useState<T | null>(() => getCachedData<T>(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch data with caching
   */
  const fetchWithCache = useCallback(
    async (
      fetcher: (signal: AbortSignal) => Promise<T>,
      forceRefresh: boolean = false
    ): Promise<T | null> => {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getCachedData<T>(key);
        if (cached !== null) {
          setData(cached);
          return cached;
        }
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher(abortControllerRef.current.signal);
        setCachedData(key, result, ttl);
        setData(result);
        return result;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, don't update state
          return null;
        }
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [key, ttl]
  );

  /**
   * Invalidate cache and optionally refetch
   */
  const invalidate = useCallback(
    async (refetch?: () => Promise<T>): Promise<void> => {
      clearCache(key);
      setData(null);
      
      if (refetch) {
        await fetchWithCache(async () => refetch(), true);
      }
    },
    [key, fetchWithCache]
  );

  /**
   * Get time until cache expires (in ms)
   */
  const getTimeUntilExpiry = useCallback((): number | null => {
    const entry = globalCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : null;
  }, [key]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    fetchWithCache,
    invalidate,
    getTimeUntilExpiry,
    isCached: data !== null && getTimeUntilExpiry() !== null,
  };
}

/**
 * Simple fetch with cache wrapper
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // Check cache first
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const result = await fetcher();
  setCachedData(key, result, ttl);
  return result;
}

export default useApiCache;
