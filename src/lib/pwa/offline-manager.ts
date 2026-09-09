/**
 * PWA offline manager.
 *
 * Tracks online/offline status, exposes cache-storage helpers, and provides a
 * subscribe API for React components to react to connectivity changes.
 *
 * The status helpers (`isOnline`, `subscribeStatusChange`) accept an optional
 * `win` parameter so they can be unit-tested in Node without a real browser.
 */

export interface StorageEstimate {
  usage: number;
  quota: number;
}

export interface CacheStatus {
  cacheNames: string[];
  urlCount: number;
}

type StatusCallback = (online: boolean) => void;

const statusCallbacks = new Set<StatusCallback>();
let initialized = false;

/**
 * Return whether the browser is currently online.
 * Accepts an optional window-like object for testability.
 */
export function isOnline(
  win?: { navigator?: { onLine?: boolean } } | null,
): boolean {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (!w?.navigator) return true; // SSR / no navigator — assume online
  return w.navigator.onLine !== false;
}

/**
 * Subscribe to online/offline status changes.
 * Returns an unsubscribe function.
 */
export function subscribeStatusChange(callback: StatusCallback): () => void {
  statusCallbacks.add(callback);
  return () => statusCallbacks.delete(callback);
}

/**
 * Attach browser event listeners for online/offline events. Safe to call once.
 */
export function initOfflineManager(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('online', () => {
    statusCallbacks.forEach((cb) => cb(true));
  });
  window.addEventListener('offline', () => {
    statusCallbacks.forEach((cb) => cb(false));
  });
}

/**
 * Get the list of cache names and total cached URL count via the Cache API.
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  if (typeof caches === 'undefined') return { cacheNames: [], urlCount: 0 };
  const cacheNames = await caches.keys();
  let urlCount = 0;
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    urlCount += keys.length;
  }
  return { cacheNames, urlCount };
}

/**
 * Clear all caches via the Cache API.
 */
export async function clearCache(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const names = await caches.keys();
  await Promise.all(names.map((n) => caches.delete(n)));
  return names.length;
}

/**
 * Manually cache a URL by fetching it and storing the response.
 */
export async function cacheUrl(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open('lazynext-manual');
    await cache.add(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all URLs currently held in any cache.
 */
export async function getCachedUrls(): Promise<string[]> {
  if (typeof caches === 'undefined') return [];
  const names = await caches.keys();
  const urls: string[] = [];
  for (const name of names) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (const req of keys) urls.push(req.url);
  }
  return urls;
}

/**
 * Get a storage quota estimate via the Storage API.
 */
export async function getStorageEstimate(): Promise<StorageEstimate> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }
  const est = await navigator.storage.estimate();
  return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}

/**
 * Singleton facade matching the requested API shape.
 */
export const OfflineManager = {
  init: initOfflineManager,
  isOnline,
  subscribeStatusChange,
  getCacheStatus,
  clearCache,
  cacheUrl,
  getCachedUrls,
  getStorageEstimate,
};
