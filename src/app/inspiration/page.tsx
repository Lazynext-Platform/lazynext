'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Loader2, AlertCircle, Sparkles, TrendingUp, Eye, MousePointerClick,
  ArrowRight, Lightbulb, MessageSquare, Target,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { formatNumber } from '@/lib/i18n-format';

type InspirationCreative = {
  id: string;
  title: string;
  platform: string;
  format: string;
  industry: string;
  hook: string;
  angle: string;
  cta: string;
  avgRoas: number;
  avgCtr: number;
  impressions: number;
  source: 'user' | 'curated';
  creationId?: string;
};

type Filters = {
  platforms: string[];
  formats: string[];
  industries: string[];
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  instagram: 'bg-pink-500/15 text-pink-400',
  youtube: 'bg-red-500/15 text-red-400',
  facebook: 'bg-blue-600/15 text-blue-400',
};

const FORMAT_COLORS: Record<string, string> = {
  ugc: 'bg-purple-500/15 text-purple-400',
  commercial: 'bg-amber-500/15 text-amber-400',
  drama: 'bg-rose-500/15 text-rose-400',
  skit: 'bg-teal-500/15 text-teal-400',
};

export default function InspirationPage() {
  const { status, data: session } = useSession();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  const [creatives, setCreatives] = useState<InspirationCreative[]>([]);
  const [filters, setFilters] = useState<Filters>({ platforms: [], formats: [], industries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [platform, setPlatform] = useState('');
  const [format, setFormat] = useState('');
  const [industry, setIndustry] = useState('');

  const load = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (platform) params.set('platform', platform);
      if (format) params.set('format', format);
      if (industry) params.set('industry', industry);
      const res = await fetch(`/api/creative/inspiration?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json().catch(() => ({}));
      setCreatives(j.creatives || []);
      setFilters(j.filters || { platforms: [], formats: [], industries: [] });
    } catch {
      setError(t('inspiration.error'));
    } finally {
      setLoading(false);
    }
  }, [status, session?.user, platform, format, industry, t]);

  useEffect(() => {
    load();
  }, [load]);

  const remix = useCallback((c: InspirationCreative) => {
    if (!session?.user) { setAuthOpen(true); return; }
    const params = new URLSearchParams();
    params.set('inspirationId', c.id);
    if (c.hook) params.set('hook', c.hook);
    if (c.angle) params.set('angle', c.angle);
    if (c.cta) params.set('cta', c.cta);
    router.push(`/creative-studio?${params}`);
  }, [session?.user, router]);

  // Show auth modal prompt for unauthenticated users
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-app">
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <main id="main-content" className="max-w-2xl mx-auto px-4 py-16 text-center" tabIndex={-1}>
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-brand-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">{t('inspiration.title')}</h1>
          <p className="text-sm text-fg-faint mb-6">{t('inspiration.signInRequired')}</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="rounded-xl bg-brand-accent px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            {t('inspiration.signInRequired')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8" tabIndex={-1}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">
            <Sparkles className="inline w-6 h-6 mr-2 text-brand-accent" aria-hidden="true" />
            {t('inspiration.title')}
          </h1>
          <p className="text-sm text-fg-faint">{t('inspiration.description')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Platform filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-platform" className="text-xs font-medium text-fg-faint">
              {t('inspiration.filterPlatform')}
            </label>
            <select
              id="filter-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              aria-label={t('inspiration.filterPlatform')}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">{t('inspiration.allPlatforms')}</option>
              {filters.platforms.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Format filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-format" className="text-xs font-medium text-fg-faint">
              {t('inspiration.filterFormat')}
            </label>
            <select
              id="filter-format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              aria-label={t('inspiration.filterFormat')}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">{t('inspiration.allFormats')}</option>
              {filters.formats.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Industry filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-industry" className="text-xs font-medium text-fg-faint">
              {t('inspiration.filterIndustry')}
            </label>
            <select
              id="filter-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              aria-label={t('inspiration.filterIndustry')}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">{t('inspiration.allIndustries')}</option>
              {filters.industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-line bg-surface p-4 text-sm text-danger">
            <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
            {error}
            <button
              onClick={() => load()}
              className="ml-3 underline hover:opacity-80"
            >
              {t('inspiration.retry')}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div role="status" className="flex items-center gap-2 text-fg-faint py-12">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span className="text-sm">{t('inspiration.loading')}</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && creatives.length === 0 && (
          <div className="py-12 text-center">
            <Lightbulb className="mx-auto mb-3 h-8 w-8 text-fg-faint" aria-hidden="true" />
            <p className="text-sm text-fg-faint">{t('inspiration.empty')}</p>
          </div>
        )}

        {/* Inspiration grid */}
        {!loading && creatives.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creatives.map(c => (
              <article
                key={c.id}
                className="flex flex-col rounded-xl border border-line bg-surface p-4"
              >
                {/* Title + source badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="text-sm font-bold leading-tight min-w-0 flex-1">{c.title}</h2>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.source === 'user'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-purple-500/15 text-purple-400'
                    }`}
                  >
                    {c.source === 'user' ? t('inspiration.sourceUser') : t('inspiration.sourceCurated')}
                  </span>
                </div>

                {/* Badges: platform + format + industry */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[c.platform] || 'bg-fg-faint/10 text-fg-faint'}`}>
                    {c.platform}
                  </span>
                  {c.format && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORMAT_COLORS[c.format] || 'bg-fg-faint/10 text-fg-faint'}`}>
                      {c.format}
                    </span>
                  )}
                  {c.industry && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-fg-faint/10 text-fg-faint font-medium">
                      {c.industry}
                    </span>
                  )}
                </div>

                {/* Hook */}
                {c.hook && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-fg-faint mb-0.5">
                      <MessageSquare className="w-3 h-3" aria-hidden="true" />
                      {t('inspiration.hook')}
                    </div>
                    <p className="text-sm italic text-fg leading-snug">&ldquo;{c.hook}&rdquo;</p>
                  </div>
                )}

                {/* Angle */}
                {c.angle && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-fg-faint mb-0.5">
                      <Lightbulb className="w-3 h-3" aria-hidden="true" />
                      {t('inspiration.angle')}
                    </div>
                    <p className="text-sm text-fg leading-snug">{c.angle}</p>
                  </div>
                )}

                {/* CTA */}
                {c.cta && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1 text-xs font-medium text-fg-faint mb-0.5">
                      <Target className="w-3 h-3" aria-hidden="true" />
                      {t('inspiration.cta')}
                    </div>
                    <p className="text-sm text-fg leading-snug">{c.cta}</p>
                  </div>
                )}

                {/* Performance metrics */}
                <div className="grid grid-cols-3 gap-2 mb-3 mt-auto">
                  <div className="rounded-lg border border-line bg-app px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5 text-xs text-fg-faint mb-0.5">
                      <TrendingUp className="w-3 h-3" aria-hidden="true" />
                      {t('inspiration.roas')}
                    </div>
                    <div className={`text-sm font-bold ${c.avgRoas >= 3 ? 'text-success' : 'text-fg'}`}>
                      {c.avgRoas.toFixed(1)}x
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-app px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5 text-xs text-fg-faint mb-0.5">
                      <MousePointerClick className="w-3 h-3" aria-hidden="true" />
                      {t('inspiration.ctr')}
                    </div>
                    <div className="text-sm font-bold text-fg">
                      {c.avgCtr.toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-app px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5 text-xs text-fg-faint mb-0.5">
                      <Eye className="w-3 h-3" aria-hidden="true" />
                      {t('inspiration.impressions')}
                    </div>
                    <div className="text-sm font-bold text-fg">
                      {formatNumber(c.impressions, locale)}
                    </div>
                  </div>
                </div>

                {/* Remix button */}
                <button
                  onClick={() => remix(c)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-accent px-3 py-2 text-sm font-bold text-white transition hover:opacity-90"
                  aria-label={`${t('inspiration.remix')} — ${c.title}`}
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  {t('inspiration.remix')}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
