type CacheEntry<T> = { value: T; expiry: number };

const cache = new Map<string, CacheEntry<unknown>>();

export function getFromCache<T>(key: string): T | null {
    const e = cache.get(key) as CacheEntry<T> | undefined;
    if (!e) return null;
    if (Date.now() > e.expiry) {
        cache.delete(key);
        return null;
    }
    return e.value;
}

export function setCache<T>(key: string, value: T, ttlSeconds = 60): void {
    cache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

export function clearCache(key?: string): void {
    if (key) cache.delete(key);
    else cache.clear();
}

export default { getFromCache, setCache, clearCache };
