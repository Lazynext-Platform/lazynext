'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import {
  ArrowRight,
  Clapperboard,
  Zap,
  DollarSign,
  Percent,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { appTitle, appDesc, isFeatured } from '@/config/appCatalog';

type App = { id: string; href: string; icon: typeof Clapperboard; kind: string };

// After streamlining, home page only keeps 4 premium apps (other app pages have been deleted).
const APPS: App[] = [
  { id: 'lazynext-studio', href: '/lazynext-studio', icon: Clapperboard, kind: 'pipeline' },
  { id: 'ad-reference', href: '/ad-reference', icon: Clapperboard, kind: 'pipeline' },
  { id: 'drama-studio', href: '/drama-studio', icon: Clapperboard, kind: 'pipeline' },
  { id: 'ad-skit', href: '/ad-skit', icon: Clapperboard, kind: 'pipeline' },
];

export default function Home() {
  const { t, appText, locale } = useI18n();
  const appCount = APPS.length;
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const verified = searchParams.get('verified');

  const errorMessages: Record<string, string> = {
    'invalid-token': t('auth.invalidToken'),
    'token-expired': t('auth.tokenExpired'),
    'verification-failed': t('auth.verificationFailed'),
    'Configuration': t('auth.signInError'),
    'OAuthCallback': t('auth.signInError'),
  };
  const errorText = authError ? (errorMessages[authError] || t('auth.signInError')) : '';

  const STATS = [
    { icon: Zap, value: '~$0.01-0.04', label: t('home.statCost') },
    { icon: DollarSign, value: '$0.50–1+', label: t('home.statCharge') },
    { icon: Percent, value: '~95%', label: t('home.statMargin') },
  ];

  const featured = APPS.filter((app) => isFeatured(app.href));
return (
    <main className="min-h-screen text-fg app-grid-bg bg-app">
      {/* Email verification success banner */}
      {verified === 'true' && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{t('auth.emailVerified')}</span>
          </div>
        </div>
      )}
      {/* Auth error banner — shown when OAuth sign-in fails or email verification fails */}
      {authError && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        </div>
      )}
      {/* hero */}
      <div className="text-center pt-10 pb-12 px-6">
        <div className="mb-3 flex justify-center">
          <a href="https://atlascloud.ai?utm_source=github&utm_campaign=ecommerce-studio" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11px] text-fg-faint transition hover:border-line-strong hover:text-fg-secondary">
            <span>{t('common.poweredBy')}</span>
            <img src="/atlas-cloud-wordmark.png" alt="Atlas Cloud" className="h-3 w-auto opacity-80" />
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="text-[14px] uppercase tracking-[0.24em] text-fg-muted font-semibold mb-3" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", sans-serif' }}>Lazynext</div>
        <h1 className="font-bold uppercase leading-[1.06] tracking-[-0.03em] text-[clamp(38px,5.2vw,56px)] text-fg" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif' }}>
          {t('home.heroTitle')}<br /><span style={{ color: 'var(--color-brand-accent)' }}>{t('home.heroTitleHl')}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-fg-faint">{t('home.heroSubtitle', { n: featured.length })}</p>
      </div>

      {/* Premium app cards */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((app) => {
            const a = appText(app.id);
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                href={app.href}
                className="group rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-[#00b2fc]/50 hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>⭐ {t('home.featured')}</span>
                </div>
                <h3 className="mt-4 font-bold tracking-tight">{appTitle(app.id, a.title, locale)}</h3>
                <p className="mt-1 text-sm text-fg-faint leading-relaxed">{appDesc(app.id, a.description, locale)}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium opacity-0 transition duration-300 group-hover:opacity-100" style={{ color: 'var(--color-brand-accent)' }}>
                  {t('home.tryIt')} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
