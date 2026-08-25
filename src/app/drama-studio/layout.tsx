import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LOCALES, type Locale, appMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const title = (appMessages[locale]?.['drama-studio']?.title || 'AI Drama Ad') + ' — Lazynext';
  return { title, referrer: 'no-referrer' };
}

export default function DramaStudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
