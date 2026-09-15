import { supabase } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  domain: string;
}

export type CacheDomain =
  | 'inventory'
  | 'customers'
  | 'bookings'
  | 'financials'
  | 'audit_history'
  | 'users'
  | 'general';

class AppCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private broadcastChannel: any = null;

  constructor() {
    this.initRealtimeSync();
    this.initVisibilityListener();
  }

  private initRealtimeSync() {
    if (typeof window === 'undefined') return;
    try {
      this.broadcastChannel = supabase
        .channel('app-cache-sync')
        .on('broadcast', { event: 'cache-invalidate' }, (payload) => {
          const { domain } = payload?.payload || {};
          if (domain) {
            console.log(`[AppCache] Received cross-device invalidation for domain: "${domain}"`);
            this.invalidateLocal(domain);
            window.dispatchEvent(new CustomEvent('app-cache-invalidated', { detail: { domain } }));
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('[AppCache] Realtime broadcast setup error:', err);
    }
  }

  private initVisibilityListener() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (now - entry.timestamp > entry.ttlMs) {
            this.cache.delete(key);
          }
        }
      }
    });
  }

  /**
   * Fetches data with automatic deduplication of in-flight promises and in-memory caching.
   * Supports both (key, fetcher, options) and (domain, key, fetcher) signatures.
   */
  public async fetchWithCache<T>(
    keyOrDomain: string,
    fetcherOrKey: (() => Promise<T>) | string,
    optionsOrFetcher?: { ttlMs?: number; domain?: CacheDomain } | (() => Promise<T>)
  ): Promise<T> {
    let key: string;
    let fetcher: () => Promise<T>;
    let options: { ttlMs?: number; domain?: CacheDomain } | undefined;

    if (typeof fetcherOrKey === 'string' && typeof optionsOrFetcher === 'function') {
      key = `${keyOrDomain}:${fetcherOrKey}`;
      fetcher = optionsOrFetcher;
      options = { domain: keyOrDomain as CacheDomain };
    } else {
      key = keyOrDomain;
      fetcher = fetcherOrKey as () => Promise<T>;
      options = optionsOrFetcher as { ttlMs?: number; domain?: CacheDomain } | undefined;
    }

    const domain = options?.domain ?? (key.includes(':') ? (key.split(':')[0] as CacheDomain) : 'general');
    const ttlMs = options?.ttlMs ?? 10 * 60 * 1000; // default 10 minutes
    const now = Date.now();

    // 1. Return fresh cached copy if valid
    const existing = this.cache.get(key);
    if (existing && (now - existing.timestamp) < existing.ttlMs) {
      return existing.data as T;
    }

    // 2. In-flight request deduplication
    const activePromise = this.inFlight.get(key);
    if (activePromise) {
      return activePromise as Promise<T>;
    }

    // 3. Initiate single network request
    const promise = (async () => {
      try {
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: Date.now(), ttlMs, domain });
        return data;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public invalidateLocal(domainOrKey?: string) {
    if (!domainOrKey) {
      this.cache.clear();
      return;
    }
    const target = domainOrKey.toLowerCase();
    for (const [key, entry] of this.cache.entries()) {
      const entryDomain = (entry.domain || '').toLowerCase();
      const lowerKey = key.toLowerCase();
      if (
        entryDomain === target ||
        lowerKey === target ||
        lowerKey.startsWith(target + ':') ||
        lowerKey.startsWith(target + '_') ||
        entryDomain.startsWith(target) ||
        target.startsWith(entryDomain)
      ) {
        this.cache.delete(key);
      }
    }
  }

  public invalidate(domainOrKey: CacheDomain | string, broadcast: boolean = true) {
    this.invalidateLocal(domainOrKey);
    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.send({
          type: 'broadcast',
          event: 'cache-invalidate',
          payload: { domain: domainOrKey, timestamp: Date.now() }
        });
      } catch (err) {
        console.warn('[AppCache] Broadcast error:', err);
      }
    }
  }

  public getStats() {
    return {
      cachedKeys: Array.from(this.cache.keys()),
      inFlightCount: this.inFlight.size
    };
  }

  public hasValid(key: string): boolean {
    const existing = this.cache.get(key);
    if (!existing) return false;
    return (Date.now() - existing.timestamp) < existing.ttlMs;
  }
}

export const appCache = new AppCacheManager();

// Convenience Domain-Specific Invalidation Helpers
export const invalidateInventoryCache = (broadcast = true) => appCache.invalidate('inventory', broadcast);
export const invalidateCustomerCache = (broadcast = true) => appCache.invalidate('customers', broadcast);
export const invalidateBookingCache = (broadcast = true) => appCache.invalidate('bookings', broadcast);
export const invalidateFinancialCache = (broadcast = true) => appCache.invalidate('financials', broadcast);
export const invalidateAuditHistoryCache = (broadcast = true) => appCache.invalidate('audit_history', broadcast);
