'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for PWA offline support.
 * Only runs in production to avoid caching issues during development.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        // Silent fail — SW is a progressive enhancement
        console.warn('[sw] Registration failed:', err);
      });
  }, []);

  return null;
}
