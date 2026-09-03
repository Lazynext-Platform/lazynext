/**
 * Lazynext Service Worker — basic offline caching for PWA.
 * Caches the app shell and static assets for offline use.
 */

const CACHE_NAME = 'lazynext-v1';
const APP_SHELL = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/favicon-32.png',
  '/icon-192.png',
  '/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip API requests (except health)
  if (url.pathname.startsWith('/api/') && url.pathname !== '/api/health') return;

  // Network-first for navigation requests, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Cache-first for static assets
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|svg|ico|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
  }
});
