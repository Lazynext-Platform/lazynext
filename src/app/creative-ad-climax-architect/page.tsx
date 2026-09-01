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
  Rocket,
  Flag,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ClimaxArchitectResult,
  ClimaxStructure,
  BuildupStep,
  PeakMoment,
  Resolution,
} from '@/lib/creative/creative-ad-climax-architect';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

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

export default function CreativeAdClimaxArchitectPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ClimaxArchitectResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-climax-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdClimaxArchitect.error'));
      setResult(data.result as ClimaxArchitectResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, targetAudience, platform, t]);

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
          {t('creativeAdClimaxArchitect.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeAdClimaxArchitect.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdClimaxArchitect.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdClimaxArchitect.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeAdClimaxArchitect.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdClimaxArchitect.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cacaProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdClimaxArchitect.productOrBrand')}
            </label>
            <input
              id="cacaProduct"
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
            <label htmlFor="cacaContent" className="block text-sm font-medium mb-1">
              {t('creativeAdClimaxArchitect.content')}
            </label>
            <textarea
              id="cacaContent"
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
            <label htmlFor="cacaAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdClimaxArchitect.targetAudience')}
            </label>
            <input
              id="cacaAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., women 25-40 interested in skincare and self-care"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdClimaxArchitect.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeAdClimaxArchitect.generating') : `${t('creativeAdClimaxArchitect.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdClimaxArchitect.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdClimaxArchitect.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdClimaxArchitect.dryRunNotice')}
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
                {copied ? t('creativeAdClimaxArchitect.copied') : t('creativeAdClimaxArchitect.copy')}
              </button>
            </div>

            {/* Climax score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdClimaxArchitect.climaxScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.architecture.climaxScore)}`}>{result.architecture.climaxScore}<span className="text-sm text-fg-muted">/100</span></p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor(result.architecture.climaxScore)}`}
                  style={{ width: `${result.architecture.climaxScore}%` }}
                />
              </div>
            </div>

            {/* Climax structure with intensity bar */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-accent" /> {t('creativeAdClimaxArchitect.climaxStructure')}
              </p>
              {(() => {
                const s: ClimaxStructure = result.architecture.structure;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                        {s.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-fg-muted">
                        <span><span className="font-medium text-fg">{t('creativeAdClimaxArchitect.timing')}:</span> {s.timing}</span>
                        <span><span className="font-medium text-fg">{t('creativeAdClimaxArchitect.duration')}:</span> {s.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg-muted">{t('creativeAdClimaxArchitect.intensity')}</span>
                      <span className={`text-sm font-bold ${scoreColor(s.intensity)}`}>{s.intensity}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(s.intensity)}`}
                        style={{ width: `${s.intensity}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{s.description}</p>
                  </div>
                );
              })()}
            </div>

            {/* Buildup sequence with tension levels */}
            {result.architecture.buildup.steps.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('creativeAdClimaxArchitect.buildupSequence')}
                </p>
                {result.architecture.buildup.steps.map((step: BuildupStep, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{step.step}</span>
                      <span className={`text-xs font-bold ${scoreColor(step.tensionLevel)}`}>{t('creativeAdClimaxArchitect.tensionLevel')}: {step.tensionLevel}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(step.tensionLevel)}`}
                        style={{ width: `${step.tensionLevel}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{step.action}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Peak moment with emotional intensity */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Rocket className="w-4 h-4 text-brand-accent" /> {t('creativeAdClimaxArchitect.peakMoment')}
              </p>
              {(() => {
                const p: PeakMoment = result.architecture.peak;
                return (
                  <div className="space-y-2">
                    <p className="text-xs text-fg-muted">{p.description}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg-muted">{t('creativeAdClimaxArchitect.emotionalIntensity')}</span>
                      <span className={`text-sm font-bold ${scoreColor(p.emotionalIntensity)}`}>{p.emotionalIntensity}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(p.emotionalIntensity)}`}
                        style={{ width: `${p.emotionalIntensity}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="rounded-lg border border-border bg-bg-secondary p-2">
                        <p className="text-xs font-medium text-fg">{t('creativeAdClimaxArchitect.visualElement')}</p>
                        <p className="text-xs text-fg-muted mt-0.5">{p.visualElement}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-bg-secondary p-2">
                        <p className="text-xs font-medium text-fg">{t('creativeAdClimaxArchitect.audioElement')}</p>
                        <p className="text-xs text-fg-muted mt-0.5">{p.audioElement}</p>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('creativeAdClimaxArchitect.viewerImpact')}:</span> {p.viewerImpact}</p>
                  </div>
                );
              })()}
            </div>

            {/* Resolution with CTA */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Flag className="w-4 h-4 text-brand-accent" /> {t('creativeAdClimaxArchitect.resolution')}
              </p>
              {(() => {
                const r: Resolution = result.architecture.resolution;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                        {r.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">{r.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('creativeAdClimaxArchitect.emotionalLanding')}:</span> {r.emotionalLanding}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-success">{t('creativeAdClimaxArchitect.callToAction')}:</span> {r.callToAction}</p>
                  </div>
                );
              })()}
            </div>

            {/* Recommendations */}
            {result.architecture.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdClimaxArchitect.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.architecture.recommendations.map((rec, i) => (
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
