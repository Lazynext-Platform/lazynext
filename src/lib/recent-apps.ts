/**
 * Track recently visited app pages in localStorage.
 * Called from the Shell on route changes to build a "Recently Used" list.
 */

const STORAGE_KEY = 'lazynext-recent-apps';
const MAX_ENTRIES = 10;

interface RecentApp {
  slug: string;
  title: string;
  visitedAt: number;
}

/** Record a visit to an app page. */
export function trackAppVisit(slug: string, title: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: RecentApp[] = raw ? JSON.parse(raw) : [];
    // Remove duplicate entry for this slug
    const filtered = existing.filter((e) => e.slug !== slug);
    // Add new entry at front
    filtered.unshift({ slug, title, visitedAt: Date.now() });
    // Trim to max
    const trimmed = filtered.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    // Notify listeners
    window.dispatchEvent(new Event('lazynext-recent-updated'));
  } catch {
    // localStorage might be full or unavailable — ignore
  }
}

/** Get the list of recently used apps. */
export function getRecentApps(limit = 6): RecentApp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).slice(0, limit);
  } catch {
    return [];
  }
}
