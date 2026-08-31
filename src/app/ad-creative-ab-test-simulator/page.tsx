'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  FlaskConical,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Trophy,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AbTestSimulatorResult,
  VariantPrediction,
  SimulatedMetric,
  PredictedWinner,
} from '@/lib/creative/ad-creative-ab-test-simulator';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const OBJECTIVES = ['ctr', 'engagement', 'conversion', 'brand_awareness', 'retention'] as const;

const WINNER_COLORS: Record<PredictedWinner, string> = {
  A: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  B: 'bg-success/20 text-success border-success/30',
  tie: 'bg-warning/20 text-warning border-warning/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function VariantCard({
  label,
  variant,
  isWinner,
  t,
}: {
  label: string;
  variant: VariantPrediction;
  isWinner: boolean;
  t: (k: string) => string;
}) {
  return (
    <div
      className={`rounded-lg border bg-bg-card p-4 space-y-3 ${
        isWinner ? 'border-brand-accent/40 ring-1 ring-brand-accent/20' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium flex items-center gap-2">
          {isWinner && <Trophy className="w-4 h-4 text-brand-accent" />}
          {label}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-fg-muted">predicted score</span>
          <span className={`text-lg font-bold ${scoreColor(variant.predictedScore)}`}>
            {variant.predictedScore}
            <span className="text-xs text-fg-muted">/100</span>
          </span>
        </div>
      </div>

      {variant.metrics.length > 0 && (
        <div className="space-y-2">
          {variant.metrics.map((m: SimulatedMetric, i: number) => (
            <div key={i} className="rounded-lg border border-border bg-bg-secondary p-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-xs font-medium">{m.metric.replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold">
                  {m.value}
                  <span className="text-xs text-fg-muted ml-0.5">{m.unit}</span>
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-fg-muted">confidence</span>
                <span className="text-xs text-fg-muted">{m.confidence}%</span>
              </div>
              <div className="h-1 rounded-full bg-bg-app overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-brand-accent"
                  style={{ width: `${m.confidence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {variant.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-fg-muted mb-1">{t('adCreativeAbTestSimulator.strengths')}</p>
            <ul className="space-y-1">
              {variant.strengths.map((s, i) => (
                <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {variant.weaknesses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-fg-muted mb-1">{t('adCreativeAbTestSimulator.weaknesses')}</p>
            <ul className="space-y-1">
              {variant.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 text-danger flex-shrink-0 mt-0.5" /> {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdCreativeAbTestSimulatorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [testObjective, setTestObjective] = useState<string>('ctr');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AbTestSimulatorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!variantA.trim() || !variantB.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-ab-test-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantA,
          variantB,
          productOrBrand,
          testObjective,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeAbTestSimulator.error'));
      setResult(data.result as AbTestSimulatorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [variantA, variantB, productOrBrand, testObjective, platform, t]);

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
          {t('adCreativeAbTestSimulator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6" /> {t('adCreativeAbTestSimulator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeAbTestSimulator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeAbTestSimulator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6" /> {t('adCreativeAbTestSimulator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeAbTestSimulator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="abtsVariantA" className="block text-sm font-medium mb-1">
              {t('adCreativeAbTestSimulator.variantA')}
            </label>
            <textarea
              id="abtsVariantA"
              value={variantA}
              onChange={(e) => setVariantA(e.target.value)}
              placeholder="e.g., Tired of dull skin? Our vitamin C serum brightens in just 7 days..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="abtsVariantB" className="block text-sm font-medium mb-1">
              {t('adCreativeAbTestSimulator.variantB')}
            </label>
            <textarea
              id="abtsVariantB"
              value={variantB}
              onChange={(e) => setVariantB(e.target.value)}
              placeholder="e.g., Glow up in 7 days. Our vitamin C serum is clinically proven to brighten skin..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="abtsProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeAbTestSimulator.productOrBrand')}
            </label>
            <input
              id="abtsProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adCreativeAbTestSimulator.testObjective')}</label>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.map((obj) => (
                <button
                  key={obj}
                  type="button"
                  onClick={() => setTestObjective(obj)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    testObjective === obj
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {obj.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeAbTestSimulator.platform')}</label>
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
            disabled={loading || !variantA.trim() || !variantB.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeAbTestSimulator.generating') : `${t('adCreativeAbTestSimulator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeAbTestSimulator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeAbTestSimulator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeAbTestSimulator.dryRunNotice')}
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
                {copied ? t('adCreativeAbTestSimulator.copied') : t('adCreativeAbTestSimulator.copy')}
              </button>
            </div>

            {/* Predicted winner + confidence */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-brand-accent" />
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('adCreativeAbTestSimulator.predictedWinner')}</p>
                    <span className={`inline-flex items-center text-2xl font-bold px-4 py-1 rounded-lg border ${WINNER_COLORS[result.simulation.predictedWinner] || WINNER_COLORS.tie}`}>
                      {result.simulation.predictedWinner === 'tie' ? 'Tie' : `Variant ${result.simulation.predictedWinner}`}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-fg-muted mb-1">{t('adCreativeAbTestSimulator.confidenceScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.simulation.confidenceScore)}`}>
                    {result.simulation.confidenceScore}
                    <span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Variant comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <VariantCard
                label={t('adCreativeAbTestSimulator.variantAPrediction')}
                variant={result.simulation.variantA}
                isWinner={result.simulation.predictedWinner === 'A'}
                t={t}
              />
              <VariantCard
                label={t('adCreativeAbTestSimulator.variantBPrediction')}
                variant={result.simulation.variantB}
                isWinner={result.simulation.predictedWinner === 'B'}
                t={t}
              />
            </div>

            {/* Significance estimate */}
            {result.simulation.significanceEstimate && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adCreativeAbTestSimulator.significanceEstimate')}
                </p>
                <p className="text-xs text-fg-muted">{result.simulation.significanceEstimate}</p>
              </div>
            )}

            {/* Key differences */}
            {result.simulation.keyDifferences.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeAbTestSimulator.keyDifferences')}</p>
                <ul className="space-y-1.5">
                  {result.simulation.keyDifferences.map((d, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 text-brand-accent flex-shrink-0 mt-0.5" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.simulation.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeAbTestSimulator.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.simulation.recommendations.map((rec, i) => (
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
