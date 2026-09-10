import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lazynext — Autonomous Company OS',
    short_name: 'Lazynext',
    description:
      'The autonomous company operating system. Plan, execute, measure, learn, and continue.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'any',
    categories: ['business', 'productivity', 'developer'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Tasks',
        url: '/tasks',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Notifications',
        url: '/notifications',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
