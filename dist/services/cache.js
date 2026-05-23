const cache = new Map();
export function getFromCache(key) {
    const e = cache.get(key);
    if (!e)
        return null;
    if (Date.now() > e.expiry) {
        cache.delete(key);
        return null;
    }
    return e.value;
}
export function setCache(key, value, ttlSeconds = 60) {
    cache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}
export function clearCache(key) {
    if (key)
        cache.delete(key);
    else
        cache.clear();
}
export default { getFromCache, setCache, clearCache };
