'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Activity,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  PacingVariabilityDesignerResult,
  PacingVariation,
  SpeedTransition,
  EnergyFluctuation,
  AttentionReset,
  TransitionImpact,
  EnergyDirection,
} from '@/lib/creative/ad-creative-pacing-variability-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const SPEED_COLORS: Record<string, string> = {
  very_slow: 'bg-info/20 text-info border-info/30',
  slow: 'bg-info/20 text-info border-info/30',
  medium: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  fast: 'bg-warning/20 text-warning border-warning/30',
  very_fast: 'bg-danger/20 text-danger border-danger/30',
  variable: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

const IMPACT_COLORS: Record<TransitionImpact, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function energyBarColor(energy: number): string {
  if (energy >= 75) return 'bg-danger';
  if (energy >= 50) return 'bg-warning';
  return 'bg-info';
}

export default function AdCreativePacingVariabilityDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PacingVariabilityDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-pacing-variability-designer', {
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
      if (!res.ok) throw new Error(data.error || t('adCreativePacingVariabilityDesigner.error'));
      setResult(data.result as PacingVariabilityDesignerResult);
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg"
        >
          {t('adCreativePacingVariabilityDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativePacingVariabilityDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('adCreativePacingVariabilityDesigner.signInPrompt')}
          </p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg"
      >
        {t('adCreativePacingVariabilityDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativePacingVariabilityDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('adCreativePacingVariabilityDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acpvdProduct" className="block text-sm font-medium mb-1">
              {t('adCreativePacingVariabilityDesigner.productOrBrand')}
            </label>
            <input
              id="acpvdProduct"
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
            <label htmlFor="acpvdContent" className="block text-sm font-medium mb-1">
              {t('adCreativePacingVariabilityDesigner.content')}
            </label>
            <textarea
              id="acpvdContent"
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
            <label htmlFor="acpvdAudience" className="block text-sm font-medium mb-1">
              {t('adCreativePacingVariabilityDesigner.targetAudience')}
            </label>
            <input
              id="acpvdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t('common.phAudience')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('adCreativePacingVariabilityDesigner.platform')}
            </label>
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
            {loading
              ? t('adCreativePacingVariabilityDesigner.generating')
              : `${t('adCreativePacingVariabilityDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativePacingVariabilityDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" />{' '}
            {t('adCreativePacingVariabilityDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div
                role="status"
                className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning"
              >
                {t('adCreativePacingVariabilityDesigner.dryRunNotice')}
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
                {copied
                  ? t('adCreativePacingVariabilityDesigner.copied')
                  : t('adCreativePacingVariabilityDesigner.copy')}
              </button>
            </div>

            {/* Variability score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Gauge className="w-8 h-8 text-brand-accent" />
                  <div>
                    <p className="text-xs font-medium text-fg-muted">
                      {t('adCreativePacingVariabilityDesigner.variabilityScore')}
                    </p>
                    <p className={`text-3xl font-bold ${scoreColor(result.design.variabilityScore)}`}>
                      {result.design.variabilityScore}
                      <span className="text-sm text-fg-muted">/100</span>
                    </p>
                  </div>
                </div>
                <div className="h-2 w-40 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${result.design.variabilityScore >= 75 ? 'bg-success' : result.design.variabilityScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                    style={{ width: `${result.design.variabilityScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Pacing variations */}
            {result.design.variations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">
                  {t('adCreativePacingVariabilityDesigner.variations')}
                </p>
                {result.design.variations.map((v: PacingVariation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{v.segment}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SPEED_COLORS[v.speed] || SPEED_COLORS.medium}`}
                        >
                          {v.speed}
                        </span>
                        <span className="text-xs text-fg-muted">{v.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fg-muted w-14">{t('adCreativePacingVariabilityDesigner.energy')}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${energyBarColor(v.energy)}`}
                          style={{ width: `${v.energy}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${scoreColor(v.energy)}`}>{v.energy}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{v.purpose}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Speed transitions */}
            {result.design.transitions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">
                  {t('adCreativePacingVariabilityDesigner.transitions')}
                </p>
                {result.design.transitions.map((tr: SpeedTransition, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded border ${SPEED_COLORS[tr.fromSpeed] || SPEED_COLORS.medium}`}>
                          {tr.fromSpeed}
                        </span>
                        <span className="text-fg-muted">→</span>
                        <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded border ${SPEED_COLORS[tr.toSpeed] || SPEED_COLORS.medium}`}>
                          {tr.toSpeed}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[tr.impact] || IMPACT_COLORS.medium}`}
                      >
                        {tr.impact}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">{tr.timing}</span> · {tr.transitionMethod}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Energy fluctuations */}
            {result.design.energyFluctuations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">
                  {t('adCreativePacingVariabilityDesigner.energyFluctuations')}
                </p>
                {result.design.energyFluctuations.map((ef: EnergyFluctuation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        {ef.direction === 'up' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-danger" />
                        )}
                        {ef.timing}
                      </span>
                      <span className="text-xs text-fg-muted">
                        <span className={`font-bold ${scoreColor(ef.fromEnergy)}`}>{ef.fromEnergy}</span>
                        <span className="mx-1">→</span>
                        <span className={`font-bold ${scoreColor(ef.toEnergy)}`}>{ef.toEnergy}</span>
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">{ef.trigger}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Attention resets */}
            {result.design.attentionResets.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-brand-accent" />{' '}
                  {t('adCreativePacingVariabilityDesigner.attentionResets')}
                </p>
                {result.design.attentionResets.map((r: AttentionReset, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-warning" /> {r.timing} · {r.method}
                      </span>
                      <span className={`text-xs font-bold ${scoreColor(r.reengagementScore)}`}>
                        {r.reengagementScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">{r.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.design.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">
                  {t('adCreativePacingVariabilityDesigner.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.design.recommendations.map((rec, i) => (
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
