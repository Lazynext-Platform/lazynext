'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Swords,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CompetitiveIntelligenceResult,
  CompetitorAnalysis,
  CounterStrategy,
} from '@/lib/creative/ad-competitive-intelligence';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const POSITION_COLORS: Record<string, string> = {
  leader: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  challenger: 'bg-warning/20 text-warning border-warning/30',
  niche: 'bg-success/20 text-success border-success/30',
  follower: 'bg-bg-secondary text-fg-muted border-border',
  unknown: 'bg-bg-secondary text-fg-muted border-border',
};

export default function AdCompetitiveIntelligencePage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [category, setCategory] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CompetitiveIntelligenceResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !category.trim() || !competitors.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-competitive-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          category,
          competitors,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCompetitiveIntelligence.error'));
      setResult(data.result as CompetitiveIntelligenceResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, category, competitors, platform, t]);

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
          {t('adCompetitiveIntelligence.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="w-6 h-6" /> {t('adCompetitiveIntelligence.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCompetitiveIntelligence.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCompetitiveIntelligence.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="w-6 h-6" /> {t('adCompetitiveIntelligence.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCompetitiveIntelligence.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aciProduct" className="block text-sm font-medium mb-1">
              {t('adCompetitiveIntelligence.productOrBrand')}
            </label>
            <input
              id="aciProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aciCategory" className="block text-sm font-medium mb-1">
              {t('adCompetitiveIntelligence.category')}
            </label>
            <input
              id="aciCategory"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., skincare, fitness apps, meal kits"
              maxLength={500}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aciCompetitors" className="block text-sm font-medium mb-1">
              {t('adCompetitiveIntelligence.competitors')}
            </label>
            <input
              id="aciCompetitors"
              type="text"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="e.g., Glossier, The Ordinary, CeraVe, Drunk Elephant"
              maxLength={1000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCompetitiveIntelligence.platform')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatform('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  platform === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                any
              </button>
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    platform === p
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

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !category.trim() || !competitors.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCompetitiveIntelligence.generating') : `${t('adCompetitiveIntelligence.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCompetitiveIntelligence.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCompetitiveIntelligence.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCompetitiveIntelligence.dryRunNotice')}
              </div>
            )}

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('adCompetitiveIntelligence.copied') : t('adCompetitiveIntelligence.copy')}
              </button>
            </div>

            {/* Market positioning */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-brand-accent" />
                <p className="text-sm font-medium">{t('adCompetitiveIntelligence.marketPositioning')}</p>
              </div>
              <p className="text-sm text-fg-muted">{result.intelligence.marketPositioning}</p>
            </div>

            {/* Competitors */}
            {result.intelligence.competitors.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('adCompetitiveIntelligence.competitorsAnalysis')}</p>
                {result.intelligence.competitors.map((comp: CompetitorAnalysis, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-semibold">{comp.name}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${POSITION_COLORS[comp.marketPosition] || POSITION_COLORS.unknown}`}>
                        {comp.marketPosition}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCompetitiveIntelligence.estimatedStrategy')}:</span> {comp.estimatedStrategy}</p>
                    {comp.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-success mb-0.5">{t('adCompetitiveIntelligence.strengths')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {comp.strengths.map((s, j) => (
                            <span key={j} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-success/10 text-success border-success/20">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {comp.weaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-danger mb-0.5">{t('adCompetitiveIntelligence.weaknesses')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {comp.weaknesses.map((w, j) => (
                            <span key={j} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-danger/10 text-danger border-danger/20">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Positioning gaps + Differentiation opportunities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.intelligence.positioningGaps.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <p className="text-sm font-medium mb-2">{t('adCompetitiveIntelligence.positioningGaps')}</p>
                  <ul className="space-y-1.5">
                    {result.intelligence.positioningGaps.map((gap, i) => (
                      <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                        <Target className="w-3 h-3 text-warning flex-shrink-0 mt-0.5" /> {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.intelligence.differentiationOpportunities.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <p className="text-sm font-medium mb-2">{t('adCompetitiveIntelligence.differentiationOpportunities')}</p>
                  <ul className="space-y-1.5">
                    {result.intelligence.differentiationOpportunities.map((opp, i) => (
                      <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-brand-accent flex-shrink-0 mt-0.5" /> {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Counter strategies */}
            {result.intelligence.counterStrategies.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('adCompetitiveIntelligence.counterStrategies')}</p>
                {result.intelligence.counterStrategies.map((cs: CounterStrategy, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{cs.targetCompetitor}</span>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">{cs.expectedImpact}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{cs.strategy}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.intelligence.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCompetitiveIntelligence.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.intelligence.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
