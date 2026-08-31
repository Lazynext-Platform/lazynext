'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  MousePointerClick,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdCTAOptimizerResult,
  AdCTA,
  UrgencyLevel,
} from '@/lib/creative/ad-cta-optimizer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  critical: 'bg-danger/20 text-danger border-danger/30',
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function AdCTAOptimizerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [goal, setGoal] = useState('');
  const [currentCTA, setCurrentCTA] = useState('');
  const [count, setCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdCTAOptimizerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const optimize = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-cta-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          goal: goal || undefined,
          currentCTA: currentCTA || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCtaOptimizer.error'));
      setResult(data.result as AdCTAOptimizerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, goal, currentCTA, count, t]);

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
          {t('adCtaOptimizer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MousePointerClick className="w-6 h-6" /> {t('adCtaOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCtaOptimizer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCtaOptimizer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MousePointerClick className="w-6 h-6" /> {t('adCtaOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCtaOptimizer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acoProduct" className="block text-sm font-medium mb-1">
              {t('adCtaOptimizer.productOrBrand')}
            </label>
            <textarea
              id="acoProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCtaOptimizer.platform')}</label>
            <div className="flex flex-wrap gap-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="acoGoal" className="block text-sm font-medium mb-1">
                {t('adCtaOptimizer.goal')}
              </label>
              <input
                id="acoGoal"
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., purchases (optional)"
                maxLength={200}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="acoCurrentCTA" className="block text-sm font-medium mb-1">
                {t('adCtaOptimizer.currentCTA')}
              </label>
              <input
                id="acoCurrentCTA"
                type="text"
                value={currentCTA}
                onChange={(e) => setCurrentCTA(e.target.value)}
                placeholder="e.g., Shop now (optional)"
                maxLength={200}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="acoCount" className="block text-sm font-medium mb-1">
              {t('adCtaOptimizer.count')}
            </label>
            <input
              id="acoCount"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={8}
              className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={optimize}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCtaOptimizer.optimizing') : `${t('adCtaOptimizer.optimize')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCtaOptimizer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCtaOptimizer.optimizing')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCtaOptimizer.dryRunNotice')}
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
                {copied ? t('adCtaOptimizer.copied') : t('adCtaOptimizer.copy')}
              </button>
            </div>

            {/* CTA cards */}
            <div className="space-y-3">
              {result.ctas.map((cta: AdCTA, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-fg-muted">#{i + 1}</span>
                    <span className="font-medium text-base">{cta.text}</span>
                    <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${URGENCY_COLORS[cta.urgencyLevel]}`}>
                      <Zap className="w-3 h-3" /> {cta.urgencyLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">{t('adCtaOptimizer.actionVerb')}:</span>
                      <span className="font-medium">{cta.actionVerb}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">{t('adCtaOptimizer.psychologicalTrigger')}:</span>
                      <span className="font-medium">{cta.psychologicalTrigger}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">{t('adCtaOptimizer.predictedConversionLift')}:</span>
                      <span className="font-medium text-success">{cta.predictedConversionLift}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">{t('adCtaOptimizer.bestForPlatform')}:</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[cta.bestForPlatform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {cta.bestForPlatform}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
