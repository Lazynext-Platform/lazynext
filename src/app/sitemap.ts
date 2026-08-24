import type { MetadataRoute } from 'next';
import { LOCALES } from '@/i18n/messages';

// Locale-tagged sitemap. Each page is emitted once per locale with the locale
// cookie path so search engines can index every language variant.
const PAGES = [
  '',
  '/ad-skit',
  '/ad-reference',
  '/drama-studio',
  '/lazynext-studio',
  '/settings',
  '/pricing',
  '/my-work',
  '/terms',
  '/privacy',
];

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://lazynext.com').replace(/\/$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const page of PAGES) {
    // Build alternate-language links for this page
    const alternates: Record<string, string> = {};
    for (const loc of LOCALES) {
      alternates[loc] = `${base}${page}?locale=${loc}`;
    }

    for (const loc of LOCALES) {
      entries.push({
        url: `${base}${page}?locale=${loc}`,
        lastModified: now,
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page === '/pricing' ? 0.9 : 0.7,
        alternates: { languages: alternates },
      });
    }
  }

  return entries;
}
