'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Zap,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Eye,
  Activity,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AnticipationBuilderResult,
  AnticipationHook,
  SuspenseTechnique,
  RevealStrategy,
  AnticipationIntensity,
} from '@/lib/creative/creative-ad-anticipation-builder';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const INTENSITY_COLORS: Record<AnticipationIntensity, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function barColor(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeAdAnticipationBuilderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnticipationBuilderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-anticipation-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdAnticipationBuilder.error'));
      setResult(data.result as AnticipationBuilderResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, targetAudience, platform, t]);

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
          {t('creativeAdAnticipationBuilder.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeAdAnticipationBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdAnticipationBuilder.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdAnticipationBuilder.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeAdAnticipationBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdAnticipationBuilder.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="caabProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdAnticipationBuilder.productOrBrand')}
            </label>
            <input
              id="caabProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="caabContent" className="block text-sm font-medium mb-1">
              {t('creativeAdAnticipationBuilder.content')}
            </label>
            <textarea
              id="caabContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('common.phMessage')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="caabAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdAnticipationBuilder.targetAudience')}
            </label>
            <input
              id="caabAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and self-care"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdAnticipationBuilder.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !content.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeAdAnticipationBuilder.generating') : `${t('creativeAdAnticipationBuilder.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdAnticipationBuilder.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdAnticipationBuilder.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdAnticipationBuilder.dryRunNotice')}
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
                {copied ? t('creativeAdAnticipationBuilder.copied') : t('creativeAdAnticipationBuilder.copy')}
              </button>
            </div>

            {/* Anticipation score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdAnticipationBuilder.anticipationScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.plan.anticipationScore)}`}>{result.plan.anticipationScore}<span className="text-sm text-fg-muted">/100</span></p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor(result.plan.anticipationScore)}`}
                  style={{ width: `${result.plan.anticipationScore}%` }}
                />
              </div>
            </div>

            {/* Anticipation hooks */}
            {result.plan.hooks.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent" /> {t('creativeAdAnticipationBuilder.hooks')}
                </p>
                {result.plan.hooks.map((hook: AnticipationHook, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg-muted">{hook.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{hook.timing}</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${INTENSITY_COLORS[hook.intensity] || INTENSITY_COLORS.medium}`}>{hook.intensity}</span>
                      </div>
                    </div>
                    <p className="text-sm text-fg">{hook.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suspense techniques */}
            {result.plan.techniques.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('creativeAdAnticipationBuilder.techniques')}
                </p>
                {result.plan.techniques.map((tech: SuspenseTechnique, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{tech.name.replace(/_/g, ' ')}</span>
                      <span className={`text-sm font-bold ${scoreColor(tech.effectiveness)}`}>{tech.effectiveness}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(tech.effectiveness)}`}
                        style={{ width: `${tech.effectiveness}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{tech.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-brand-accent">{t('creativeAdAnticipationBuilder.apply')}:</span> {tech.application}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reveal strategies */}
            {result.plan.revealStrategies.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-accent" /> {t('creativeAdAnticipationBuilder.revealStrategies')}
                </p>
                {result.plan.revealStrategies.map((rev: RevealStrategy, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{rev.strategy.replace(/_/g, ' ')}</span>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{rev.timing}</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Buildup:</span> {rev.buildup}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-success">{t('creativeAdAnticipationBuilder.payoff')}:</span> {rev.payoff}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tension curve */}
            {result.plan.tensionCurve.phases.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-accent" /> {t('creativeAdAnticipationBuilder.tensionCurve')}
                </p>
                <div className="flex items-end gap-2 h-32">
                  {result.plan.tensionCurve.phases.map((phase, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-xs font-bold ${scoreColor(phase.intensity)}`}>{phase.intensity}</span>
                      <div
                        className={`w-full rounded-t-md ${barColor(phase.intensity)}`}
                        style={{ height: `${Math.max(8, phase.intensity)}%` }}
                        title={`${phase.phase}: ${phase.intensity}/100 (${phase.duration})`}
                      />
                      <span className="text-xs text-fg-muted text-center truncate w-full" title={phase.phase}>{phase.phase}</span>
                      <span className="text-xs text-fg-muted/70">{phase.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.plan.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeAdAnticipationBuilder.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.plan.recommendations.map((rec, i) => (
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
