import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LOCALES, type Locale, messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const nav = messages[locale]?.nav || messages.en.nav;
  return { title: `${nav.settings} — Lazynext`, referrer: 'no-referrer' };
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
