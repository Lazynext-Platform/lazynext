import { cookies } from 'next/headers';
import { LOCALES, type Locale, messages } from '@/i18n/messages';

export default async function NotFound() {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const t = (messages[locale] as any)?.notFound || (messages.en as any).notFound;

  return (
    <main className="min-h-screen flex items-center justify-center text-[#f7f7f8]" style={{ backgroundColor: '#131416', colorScheme: 'dark' }}>
      <div className="max-w-md px-6 text-center">
        <p className="text-6xl font-bold text-white/10">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-3 text-sm text-white/50">{t.desc}</p>
        <div className="mt-8">
          <a href="/" className="text-sm text-white/70 hover:text-white transition">{t.back}</a>
        </div>
      </div>
    </main>
  );
}
