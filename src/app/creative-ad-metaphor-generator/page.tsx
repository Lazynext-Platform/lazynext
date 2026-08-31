'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Lightbulb,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Eye,
  Heart,
  Tag,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  MetaphorGeneratorResult,
  Metaphor,
} from '@/lib/creative/creative-ad-metaphor-generator';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  everyday_object: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  nature: 'bg-success/20 text-success border-success/30',
  journey: 'bg-warning/20 text-warning border-warning/30',
  transformation: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  contrast: 'bg-danger/20 text-danger border-danger/30',
  sensory: 'bg-success/20 text-success border-success/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function scoreBarColor(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeAdMetaphorGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [benefit, setBenefit] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MetaphorGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !benefit.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-metaphor-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          benefit,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdMetaphorGenerator.error'));
      setResult(data.result as MetaphorGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, benefit, targetAudience, platform, t]);

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
          {t('creativeAdMetaphorGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" /> {t('creativeAdMetaphorGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdMetaphorGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdMetaphorGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" /> {t('creativeAdMetaphorGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdMetaphorGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="camgProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdMetaphorGenerator.productOrBrand')}
            </label>
            <input
              id="camgProduct"
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
            <label htmlFor="camgBenefit" className="block text-sm font-medium mb-1">
              {t('creativeAdMetaphorGenerator.benefit')}
            </label>
            <input
              id="camgBenefit"
              type="text"
              value={benefit}
              onChange={(e) => setBenefit(e.target.value)}
              placeholder="e.g., brightens dull skin in 7 days"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="camgAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdMetaphorGenerator.targetAudience')}
            </label>
            <input
              id="camgAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., women 25-40 concerned about skin aging"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdMetaphorGenerator.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !benefit.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeAdMetaphorGenerator.generating') : `${t('creativeAdMetaphorGenerator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdMetaphorGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdMetaphorGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdMetaphorGenerator.dryRunNotice')}
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
                {copied ? t('creativeAdMetaphorGenerator.copied') : t('creativeAdMetaphorGenerator.copy')}
              </button>
            </div>

            {/* Metaphor cards */}
            {result.collection.metaphors.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('creativeAdMetaphorGenerator.metaphors')}</p>
                {result.collection.metaphors.map((m: Metaphor, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <p className="text-sm font-medium flex-1 min-w-0">{m.metaphor}</p>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[m.category] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        <Tag className="w-3 h-3 mr-1" /> {m.category}
                      </span>
                    </div>

                    {/* Memorability score bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('creativeAdMetaphorGenerator.memorabilityScore')}</span>
                        <span className={`text-xs font-bold ${scoreColor(m.memorabilityScore)}`}>{m.memorabilityScore}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBarColor(m.memorabilityScore)}`}
                          style={{ width: `${m.memorabilityScore}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-fg-muted">{m.explanation}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-bg-secondary p-2.5">
                        <p className="text-xs font-medium flex items-center gap-1.5 mb-1">
                          <Eye className="w-3.5 h-3.5 text-brand-accent" /> {t('creativeAdMetaphorGenerator.visualSuggestion')}
                        </p>
                        <p className="text-xs text-fg-muted">{m.visualSuggestion}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-bg-secondary p-2.5">
                        <p className="text-xs font-medium flex items-center gap-1.5 mb-1">
                          <Heart className="w-3.5 h-3.5 text-danger" /> {t('creativeAdMetaphorGenerator.emotionalResonance')}
                        </p>
                        <p className="text-xs text-fg-muted">{m.emotionalResonance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.collection.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdMetaphorGenerator.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.collection.recommendations.map((rec, i) => (
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
