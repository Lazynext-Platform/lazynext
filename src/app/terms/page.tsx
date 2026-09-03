import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LOCALES, type Locale, messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const legal = messages[locale]?.legal?.terms || messages.en.legal.terms;
  return {
    title: legal.metaTitle,
    description: legal.metaDesc,
    referrer: 'no-referrer',
  };
}

export default async function TermsPage() {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const t = messages[locale]?.legal?.terms || messages.en.legal.terms;
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-2 text-sm text-fg-faint">{t.lastUpdated.replace('{year}', String(year))}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-fg-secondary">
          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s1Title}</h2>
            <p className="mt-3">{t.s1Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s2Title}</h2>
            <p className="mt-3">{t.s2Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s3Title}</h2>
            <p className="mt-3">{t.s3Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s4Title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>{t.s4Li1}</li>
              <li>{t.s4Li2}</li>
              <li>{t.s4Li3}</li>
              <li>{t.s4Li4}</li>
              {t.s4Li5 && <li>{t.s4Li5}</li>}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s5Title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>{t.s5Li1}</li>
              <li>{t.s5Li2}</li>
              <li>{t.s5Li3}</li>
              {t.s5Li4 && <li>{t.s5Li4}</li>}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s6Title}</h2>
            <p className="mt-3">{t.s6Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s7Title}</h2>
            <p className="mt-3">{t.s7Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s8Title}</h2>
            <p className="mt-3">{t.s8Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s9Title}</h2>
            <p className="mt-3">{t.s9Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-fg">{t.s10Title}</h2>
            <p className="mt-3">{t.s10Body}</p>
          </section>

          {t.s11Title && (
            <section>
              <h2 className="text-lg font-semibold text-fg">{t.s11Title}</h2>
              <p className="mt-3">{t.s11Body}</p>
            </section>
          )}
        </div>

        <div className="mt-12">
          <a href="/" className="text-sm text-fg-faint hover:text-fg transition">{t.back}</a>
        </div>
      </div>
    </div>
  );
}
