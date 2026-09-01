'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Clapperboard, Coins, Boxes, FolderOpen, ArrowRight, Loader2,
  TrendingDown, TrendingUp, BarChart3, Trophy, Calendar, Film, Play,
  Sparkles, Video, Drama, Mic, Star, Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { formatNumber, formatDateTime } from '@/lib/i18n-format';
import { AuthModal } from '@/components/AuthModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { CategorizedAppGrid } from '@/components/CategorizedAppGrid';
import { fetchWithRetry, warmupApi } from '@/lib/fetch-retry';


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
  const [analytics, setAnalytics] = useState<{
    totalSpent: number; totalGranted: number; currentBalance: number;
    byReason: Record<string, { count: number; totalDelta: number }>;
    byDay: Array<{ date: string; spent: number; granted: number }>;
    projection: { avgDailySpend: number; daysUntilEmpty: number | null; currentBalance: number };
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    entries: Array<{
      creationId: string; platform: string; hookType: string | null; angleName: string | null;
      impressions: number; clicks: number; conversions: number; spend: number; revenue: number;
      ctr: number; cvr: number; roas: number; recordedAt: string;
    }>;
    summary: { totalImpressions: number; totalClicks: number; totalConversions: number; totalSpend: number; totalRevenue: number; avgCtr: number; avgRoas: number };
    byPlatform: Record<string, { count: number; avgRoas: number }>;
  } | null>(null);
  const [calendar, setCalendar] = useState<{
    month: string;
    entries: Array<{ date: string; type: 'campaign' | 'creative'; name: string; platform?: string; status?: string; id: string }>;
    upcoming: Array<{ date: string; type: 'campaign' | 'creative'; name: string; platform?: string; status?: string; id: string }>;
    stats: { totalCampaigns: number; totalCreatives: number; activeCampaigns: number };
  } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    // Warm up the Worker/D1 connection before firing data requests
    warmupApi();
    fetchWithRetry('/api/me').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setCredits(j.credits ?? 0); }).catch(() => {});
    fetchWithRetry('/api/creations', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { creations: [] }))
      .then((j) => setRecent(((j.creations || []) as Creation[]).slice(0, 4)))
      .catch(() => setRecent([]));
    Promise.all([
      fetchWithRetry('/api/assets/products', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { products: [] })),
      fetchWithRetry('/api/assets/avatars', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { avatars: [] })),
      fetchWithRetry('/api/assets/brand-kits', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { brandKits: [] })),
    ])
      .then(([p, a, b]) => setCounts({
        products: (p.products || []).length,
        avatars: (a.avatars || []).length,
        brandKits: (b.brandKits || []).length,
      }))
      .catch(() => setCounts({ products: 0, avatars: 0, brandKits: 0 }));
    fetchWithRetry('/api/credits/analytics', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) setAnalytics(j); })
      .catch(() => {});
    fetchWithRetry('/api/creative/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) setLeaderboard(j); })
      .catch(() => {});
    fetchWithRetry('/api/creative/calendar', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && j.stats) setCalendar(j); })
      .catch(() => {});
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
          <h1 className="text-2xl font-bold text-fg">{t('dashboard.welcome')}</h1>
          <p className="text-fg-faint">{t('dashboard.subtitle')}</p>
          <button onClick={() => setAuthOpen(true)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('common.signIn')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
      </div>
    );
  }


  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <OnboardingModal />
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

        {/* Credit analytics */}
        {analytics && (
          <div className="mb-10 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-fg">{t('dashboard.creditAnalytics')}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="flex items-center gap-1 text-xs text-fg-faint">
                  <TrendingDown className="h-3 w-3" />
                  {t('dashboard.totalSpent')}
                </div>
                <div className="mt-1 text-xl font-bold text-fg">{analytics.totalSpent}</div>
              </div>
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="flex items-center gap-1 text-xs text-fg-faint">
                  <TrendingUp className="h-3 w-3" />
                  {t('dashboard.totalGranted')}
                </div>
                <div className="mt-1 text-xl font-bold text-fg">{analytics.totalGranted}</div>
              </div>
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="text-xs text-fg-faint">{t('dashboard.avgDailySpend')}</div>
                <div className="mt-1 text-xl font-bold text-fg">{analytics.projection.avgDailySpend}</div>
              </div>
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="text-xs text-fg-faint">{t('dashboard.daysRemaining')}</div>
                <div className="mt-1 text-xl font-bold text-fg">
                  {analytics.projection.daysUntilEmpty !== null
                    ? `${analytics.projection.daysUntilEmpty}d`
                    : '∞'}
                </div>
              </div>
            </div>

            {/* By reason breakdown */}
            {Object.keys(analytics.byReason).length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-medium text-fg-faint">{t('dashboard.spendByCategory')}</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analytics.byReason)
                    .sort(([, a], [, b]) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta))
                    .map(([reason, data]) => (
                      <span key={reason} className="text-xs rounded-full bg-app border border-line px-3 py-1">
                        {reason}: {data.totalDelta > 0 ? '+' : ''}{data.totalDelta} ({data.count}x)
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* 30-day spend chart (simple bar chart with divs) */}
            {analytics.byDay.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-fg-faint">{t('dashboard.spendLast30Days')}</h3>
                <div className="flex items-end gap-px h-20 overflow-x-auto">
                  {analytics.byDay.map(day => {
                    const maxSpent = Math.max(...analytics.byDay.map(d => d.spent), 1);
                    const heightPct = (day.spent / maxSpent) * 100;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 min-w-[4px] bg-brand-accent/60 rounded-t hover:bg-brand-accent transition-colors"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                        title={`${day.date}: -${day.spent} credits, +${day.granted} granted`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance leaderboard */}
        {leaderboard && (
          <div className="mb-10 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-fg">{t('dashboard.leaderboard')}</h2>
            </div>

            {leaderboard.entries.length === 0 ? (
              <p className="text-xs text-fg-faint">{t('dashboard.leaderboardEmpty')}</p>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.totalImpressions')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{formatNumber(leaderboard.summary.totalImpressions, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.totalClicks')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{formatNumber(leaderboard.summary.totalClicks, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.totalConversions')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{formatNumber(leaderboard.summary.totalConversions, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.avgRoas')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{leaderboard.summary.avgRoas}x</div>
                  </div>
                </div>

                {/* Platform breakdown */}
                <div className="mb-4 flex gap-2">
                  {Object.entries(leaderboard.byPlatform).map(([platform, data]) => (
                    data.count > 0 && (
                      <span key={platform} className="text-xs rounded-full bg-app border border-line px-3 py-1">
                        {platform}: {data.count} campaigns, avg ROAS {data.avgRoas.toFixed(2)}x
                      </span>
                    )
                  ))}
                </div>

                {/* Leaderboard table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-fg-faint">
                        <th className="pb-2 pr-3 font-medium">#</th>
                        <th className="pb-2 pr-3 font-medium">{t('dashboard.colPlatform')}</th>
                        <th className="pb-2 pr-3 font-medium">{t('dashboard.colHook')}</th>
                        <th className="pb-2 pr-3 font-medium">{t('dashboard.colAngle')}</th>
                        <th className="pb-2 pr-3 font-medium text-right">{t('dashboard.colImpressions')}</th>
                        <th className="pb-2 pr-3 font-medium text-right">{t('dashboard.colCtr')}</th>
                        <th className="pb-2 pr-3 font-medium text-right">{t('dashboard.colRoas')}</th>
                        <th className="pb-2 pr-3 font-medium text-right">{t('dashboard.colRevenue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.entries.map((entry, i) => (
                        <tr key={i} className="border-b border-line/50">
                          <td className="py-2 pr-3 font-bold text-fg">{i + 1}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${entry.platform === 'meta' ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-500'}`}>
                              {entry.platform}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-fg-faint">{entry.hookType || '—'}</td>
                          <td className="py-2 pr-3 text-fg-faint">{entry.angleName || '—'}</td>
                          <td className="py-2 pr-3 text-right text-fg">{formatNumber(entry.impressions, locale)}</td>
                          <td className="py-2 pr-3 text-right text-fg">{(entry.ctr * 100).toFixed(2)}%</td>
                          <td className="py-2 pr-3 text-right font-bold text-fg">{entry.roas.toFixed(2)}x</td>
                          <td className="py-2 pr-3 text-right text-fg">${entry.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Content calendar */}
        {calendar && (
          <div className="mb-10 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-fg">{t('dashboard.contentCalendar')}</h2>
              <span className="ml-auto text-xs text-fg-faint">{calendar.month}</span>
            </div>

            {/* Upcoming reminders */}
            {calendar.upcoming.length > 0 && (
              <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <h3 className="mb-2 text-xs font-medium text-warning">{t('dashboard.upcomingDeployments')}</h3>
                <div className="space-y-1">
                  {calendar.upcoming.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-fg">{u.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="rounded bg-app border border-line px-1.5 py-0.5 text-[10px]">{u.platform}</span>
                        <span className="text-fg-faint">{u.date}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar grid */}
            {calendar.entries.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {calendar.entries.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 rounded bg-app px-3 py-2 text-xs">
                    <span className="text-fg-faint font-mono shrink-0">{e.date.slice(5)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${
                      e.type === 'campaign'
                        ? e.platform === 'meta' ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-500'
                        : 'bg-brand-accent/15 text-brand-accent'
                    }`}>
                      {e.type === 'campaign' ? e.platform : e.type}
                    </span>
                    <span className="text-fg truncate">{e.name}</span>
                    {e.status && (
                      <span className="ml-auto text-fg-faint shrink-0">{e.status}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-fg-faint">{t('dashboard.calendarEmpty')}</p>
            )}

            {/* Stats */}
            {calendar?.stats && (
            <div className="mt-3 flex gap-3 text-xs text-fg-faint">
              <span>{calendar.stats.totalCampaigns} {t('dashboard.statCampaigns')}</span>
              <span>·</span>
              <span>{calendar.stats.totalCreatives} {t('dashboard.statCreatives')}</span>
              <span>·</span>
              <span className="text-success">{calendar.stats.activeCampaigns} {t('dashboard.statActive')}</span>
            </div>
            )}
          </div>
        )}

        {/* Featured apps — 4 flagship creative studios */}
        <div className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-fg">
            <Star className="h-5 w-5 text-brand-accent" />
            {t('dashboard.featuredApps') || 'Featured Apps'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: '/lazynext-studio', icon: Mic, key: 'ugcProductAd' },
              { href: '/ad-reference', icon: Video, key: 'referenceToAd' },
              { href: '/drama-studio', icon: Drama, key: 'aiDramaAd' },
              { href: '/ad-skit', icon: Sparkles, key: 'adSkit' },
            ].map((app) => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.href}
                  href={app.href}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 transition hover:border-[#00b2fc]/50 hover:shadow-lg hover:shadow-[#00b2fc]/5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#00b2fc]/10 text-[#00b2fc] transition group-hover:bg-[#00b2fc]/20">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-fg">
                    {t(`home.${app.key}.title`) || app.key}
                  </h3>
                  <p className="mt-1 text-xs text-fg-faint line-clamp-2">
                    {t(`home.${app.key}.subtitle`) || ''}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-brand-accent opacity-0 transition group-hover:opacity-100">
                    {t('common.tryIt') || 'Try it'} <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recently used — tracked in localStorage */}
        <RecentlyUsed t={t} />

        {/* Quick create — categorized with search */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-fg">{t('dashboard.quickCreate')}</h2>
          <CategorizedAppGrid />
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

/** Recently Used section — tracks visited features in localStorage and shows quick links. */
function RecentlyUsed({ t }: { t: (k: string) => string }) {
  const [recent, setRecent] = useState<{ slug: string; title: string; visitedAt: number }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lazynext-recent-apps');
      if (raw) setRecent(JSON.parse(raw).slice(0, 6));
    } catch { /* ignore */ }
  }, []);

  // Listen for changes (other tabs / same tab updates)
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('lazynext-recent-apps');
        if (raw) setRecent(JSON.parse(raw).slice(0, 6));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', handler);
    window.addEventListener('lazynext-recent-updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('lazynext-recent-updated', handler);
    };
  }, []);

  if (recent.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-fg">
        <Clock className="h-5 w-5 text-brand-accent" />
        {t('dashboard.recentlyUsed') || 'Recently Used'}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {recent.map((item) => (
          <Link
            key={item.slug}
            href={`/${item.slug}`}
            className="group rounded-xl border border-line bg-surface p-3 transition hover:border-[#00b2fc]/40"
          >
            <div className="truncate text-xs font-medium text-fg group-hover:text-[#00b2fc] transition">
              {item.title}
            </div>
            <div className="mt-1 text-[10px] text-fg-faint">
              {new Date(item.visitedAt).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
