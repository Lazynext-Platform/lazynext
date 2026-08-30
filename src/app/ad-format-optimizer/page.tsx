'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  LayoutGrid,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Trophy,
  Target,
  DollarSign,
  Wrench,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdFormatOptimizerResult,
  FormatRecommendation,
  AdFormat,
} from '@/lib/creative/ad-format-optimizer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const BUDGETS = ['low', 'medium', 'high'] as const;
const GOALS = ['awareness', 'consideration', 'conversion', 'retention'] as const;

const FORMAT_LABELS: Record<AdFormat, string> = {
  single_image: 'Single Image',
  carousel: 'Carousel',
  video: 'Video',
  story: 'Story',
  reel: 'Reel',
  collection: 'Collection',
};

const COMPLEXITY_COLORS: Record<string, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function scoreColor(s: number): string {
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-brand-accent';
  if (s >= 40) return 'text-warning';
  return 'text-danger';
}

export default function AdFormatOptimizerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'instagram']);
  const [budget, setBudget] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['awareness', 'conversion']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdFormatOptimizerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const toggleGoal = (g: string) => {
    setSelectedGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const optimize = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-format-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience: targetAudience || undefined,
          platforms: selectedPlatforms,
          budget,
          goals: selectedGoals,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adFormatOptimizer.error'));
      setResult(data.result as AdFormatOptimizerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, selectedPlatforms, budget, selectedGoals, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('adFormatOptimizer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" /> {t('adFormatOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adFormatOptimizer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adFormatOptimizer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" /> {t('adFormatOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adFormatOptimizer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="afoProduct" className="block text-sm font-medium mb-1">
              {t('adFormatOptimizer.productOrBrand')}
            </label>
            <textarea
              id="afoProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="afoAudience" className="block text-sm font-medium mb-1">
              {t('adFormatOptimizer.targetAudience')}
            </label>
            <input
              id="afoAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., women 25-40 interested in clean beauty"
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adFormatOptimizer.platforms')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedPlatforms.includes(p)
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('adFormatOptimizer.budget')}</label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      budget === b
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('adFormatOptimizer.goals')}</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      selectedGoals.includes(g)
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={optimize}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adFormatOptimizer.optimizing') : `${t('adFormatOptimizer.optimize')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adFormatOptimizer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adFormatOptimizer.optimizing')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adFormatOptimizer.dryRunNotice')}
              </div>
            )}

            {/* Best pick */}
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-brand-accent" />
                <h2 className="font-medium">{t('adFormatOptimizer.bestPick')}</h2>
                <span className="ml-auto text-sm font-bold text-brand-accent">
                  {FORMAT_LABELS[result.bestPick] || result.bestPick}
                </span>
              </div>
              <p className="text-sm text-fg-muted">{result.reasoning}</p>
            </div>

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('adFormatOptimizer.copied') : t('adFormatOptimizer.copy')}
              </button>
            </div>

            {/* Ranked recommendations */}
            <div className="space-y-3">
              {result.recommendations.map((rec: FormatRecommendation, i: number) => {
                const isBest = rec.format === result.bestPick;
                return (
                  <div
                    key={rec.format}
                    className={`rounded-lg border bg-bg-card p-4 ${isBest ? 'border-brand-accent/40' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-fg-muted">#{i + 1}</span>
                      <span className="font-medium">{FORMAT_LABELS[rec.format] || rec.format}</span>
                      {isBest && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                          {t('adFormatOptimizer.bestPick')}
                        </span>
                      )}
                      <span className={`ml-auto text-lg font-bold ${scoreColor(rec.score)}`}>{rec.score}</span>
                    </div>

                    <p className="text-sm text-fg-muted mb-3">{rec.rationale}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-fg-muted" />
                        <span className="text-fg-muted">{t('adFormatOptimizer.complexity')}:</span>
                        <span className={`px-2 py-0.5 rounded-full border ${COMPLEXITY_COLORS[rec.productionComplexity] || COMPLEXITY_COLORS.medium}`}>
                          {rec.productionComplexity}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-fg-muted" />
                        <span className="text-fg-muted">{t('adFormatOptimizer.estimatedCost')}:</span>
                        <span>{rec.estimatedCostRange}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-fg-muted" />
                        <span className="text-fg-muted">{t('adFormatOptimizer.score')}:</span>
                        <span className={scoreColor(rec.score)}>{rec.score}/100</span>
                      </div>
                    </div>

                    {rec.bestFor.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-fg-muted mb-1">{t('adFormatOptimizer.bestFor')}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.bestFor.map((b, j) => (
                            <span key={j} className="text-xs px-2 py-0.5 rounded-full border border-border bg-bg-secondary">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.platformFit.length > 0 && (
                      <div>
                        <div className="text-xs text-fg-muted mb-1">{t('adFormatOptimizer.platformFit')}</div>
                        <div className="flex flex-wrap gap-2">
                          {rec.platformFit.map((pf, j) => (
                            <span
                              key={j}
                              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[pf.platform] || 'bg-bg-secondary text-fg-muted border-border'}`}
                            >
                              {pf.platform}
                              <span className={scoreColor(pf.fitScore)}>{pf.fitScore}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
