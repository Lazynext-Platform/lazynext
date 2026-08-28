'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Clapperboard, Coins, Boxes, FolderOpen, ArrowRight, Loader2, Film, Play, Sparkles,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { appTitle, appDesc, isFeatured } from '@/config/appCatalog';
import { formatNumber, formatDateTime } from '@/lib/i18n-format';
import { AuthModal } from '@/components/AuthModal';

type App = { id: string; href: string; icon: typeof Clapperboard };
const APPS: App[] = [
  { id: 'lazynext-studio', href: '/lazynext-studio', icon: Clapperboard },
  { id: 'ad-reference', href: '/ad-reference', icon: Clapperboard },
  { id: 'drama-studio', href: '/drama-studio', icon: Clapperboard },
  { id: 'ad-skit', href: '/ad-skit', icon: Clapperboard },
  { id: 'creative-studio', href: '/creative-studio', icon: Sparkles },
  { id: 'creative-director', href: '/creative-director', icon: Sparkles },
  { id: 'ads', href: '/ads', icon: Clapperboard },
  { id: 'performance', href: '/performance', icon: Clapperboard },
  { id: 'creative-assets', href: '/creative-assets', icon: Sparkles },
];

type Creation = {
  id: string; templateId: string; prompt: string; status: string;
  outputs: string[] | null; inputImage: string | null; createdAt: string;
};

type Counts = { products: number; avatars: number; brandKits: number };

export default function DashboardPage() {
  const { status, data: session } = useSession();
  const { t, appText, locale } = useI18n();
  const [credits, setCredits] = useState<number | null>(null);
  const [recent, setRecent] = useState<Creation[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/me').then((r) => r.json()).then((j) => setCredits(j.credits ?? 0)).catch(() => {});
    fetch('/api/creations', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setRecent(((j.creations || []) as Creation[]).slice(0, 4)))
      .catch(() => setRecent([]));
    Promise.all([
      fetch('/api/assets/products', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/assets/avatars', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/assets/brand-kits', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([p, a, b]) => setCounts({
        products: (p.products || []).length,
        avatars: (a.avatars || []).length,
        brandKits: (b.brandKits || []).length,
      }))
      .catch(() => setCounts({ products: 0, avatars: 0, brandKits: 0 }));
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center py-32"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center gap-4 py-32 text-center">
          <div className="text-5xl">🔐</div>
          <p className="text-fg-faint">{t('dashboard.welcome')}</p>
          <button onClick={() => setAuthOpen(true)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('common.signIn')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
      </div>
    );
  }

  const featured = APPS.filter((app) => isFeatured(app.href));

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        {/* Welcome + credits */}
        <div className="pt-6 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('dashboard.welcome')}, {session.user?.name?.split(' ')[0] || session.user?.email?.split('@')[0]}
          </h1>
          <p className="mt-2 text-sm text-fg-faint">{t('dashboard.subtitle')}</p>
        </div>

        {/* Quick stats row */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/pricing" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><Coins className="h-4 w-4" /><span className="text-xs font-medium">{t('dashboard.credits')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{credits === null ? '·' : formatNumber(credits, locale)}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('dashboard.buyCredits')} →</div>
          </Link>
          <Link href="/my-work" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><FolderOpen className="h-4 w-4" /><span className="text-xs font-medium">{t('nav.myWork')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{recent ? recent.length : '·'}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('dashboard.viewAll')} →</div>
          </Link>
          <Link href="/assets" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><Boxes className="h-4 w-4" /><span className="text-xs font-medium">{t('nav.assets')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{counts ? counts.products + counts.avatars + counts.brandKits : '·'}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('dashboard.viewAll')} →</div>
          </Link>
          <Link href="/settings" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><Clapperboard className="h-4 w-4" /><span className="text-xs font-medium">{t('nav.settings')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{session.user?.name?.split(' ')[0] || '·'}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('nav.settings')} →</div>
          </Link>
        </div>

        {/* Quick create */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-fg">{t('dashboard.quickCreate')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {APPS.map((app) => {
              const a = appText(app.id);
              return (
                <Link key={app.id} href={app.href}
                  className="group rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-[#00b2fc]/40 hover:bg-surface">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                    <app.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold">{appTitle(app.id, a.title, locale)}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-fg-faint">{appDesc(app.id, a.description, locale)}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-0 transition group-hover:opacity-100" style={{ color: 'var(--color-brand-accent)' }}>
                    {t('dashboard.startNow')} <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent work */}
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg">{t('dashboard.recentWork')}</h2>
            <Link href="/my-work" className="text-xs text-brand-accent hover:underline">{t('dashboard.viewAll')} →</Link>
          </div>
          {recent === null ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
          ) : recent.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-line bg-hover py-12 text-center">
              <Film className="h-8 w-8 text-fg-placeholder" />
              <p className="text-sm text-fg-faint">{t('dashboard.noWork')}</p>
              <Link href="/lazynext-studio" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('dashboard.startNow')}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recent.map((c) => {
                const url = Array.isArray(c.outputs) && typeof c.outputs[0] === 'string' ? c.outputs[0] : '';
                const title = c.prompt || t('myWork.untitled');
                return (
                  <Link key={c.id} href="/my-work" className="group overflow-hidden rounded-2xl border border-line bg-black/30">
                    <div className="relative aspect-[9/16] w-full">
                      {c.inputImage ? (
                        <img src={c.inputImage} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                      ) : url ? (
                        <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-3xl">🎬</div>
                      )}
                      {c.status === 'processing' && (
                        <div className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-brand-accent)' }} /></div>
                      )}
                      {c.status === 'completed' && url && (
                        <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100"><div className="grid h-10 w-10 place-items-center rounded-full bg-black/60"><Play className="h-4 w-4 text-white" /></div></div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="truncate text-xs font-medium">{title}</div>
                      <div className="mt-0.5 text-[10px] text-fg-faint">{formatDateTime(c.createdAt, locale)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Assets summary */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg">{t('dashboard.yourAssets')}</h2>
            <Link href="/assets" className="text-xs text-brand-accent hover:underline">{t('dashboard.viewAll')} →</Link>
          </div>
          {counts === null ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
          ) : counts.products + counts.avatars + counts.brandKits === 0 ? (
            <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-line bg-hover py-12 text-center">
              <Boxes className="h-8 w-8 text-fg-placeholder" />
              <p className="text-sm text-fg-faint">{t('dashboard.noAssets')}</p>
              <Link href="/assets" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('nav.assets')}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <Link href="/assets" className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-[#00b2fc]/40">
                <div className="text-2xl font-bold text-fg">{counts.products}</div>
                <div className="mt-1 text-xs text-fg-faint">{t('nav.products')}</div>
              </Link>
              <Link href="/assets" className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-[#00b2fc]/40">
                <div className="text-2xl font-bold text-fg">{counts.avatars}</div>
                <div className="mt-1 text-xs text-fg-faint">{t('nav.avatars')}</div>
              </Link>
              <Link href="/assets" className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-[#00b2fc]/40">
                <div className="text-2xl font-bold text-fg">{counts.brandKits}</div>
                <div className="mt-1 text-xs text-fg-faint">{t('nav.brandKits')}</div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
