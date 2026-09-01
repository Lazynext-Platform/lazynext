'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Brain,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  PersuasionStrategistResult,
  PersuasionPrinciple,
  PersuasionTechnique,
  PsychologicalTrigger,
  TechniqueStrength,
} from '@/lib/creative/creative-ad-persuasion-strategist';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const STRENGTH_COLORS: Record<TechniqueStrength, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function relevanceColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function intensityColor(score: number): string {
  if (score >= 75) return 'bg-brand-accent';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeAdPersuasionStrategistPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PersuasionStrategistResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim() || !content.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-persuasion-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          content,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdPersuasionStrategist.error'));
      setResult(data.result as PersuasionStrategistResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, content, platform, t]);

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
          {t('creativeAdPersuasionStrategist.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" /> {t('creativeAdPersuasionStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdPersuasionStrategist.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdPersuasionStrategist.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" /> {t('creativeAdPersuasionStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdPersuasionStrategist.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="capsProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdPersuasionStrategist.productOrBrand')}
            </label>
            <input
              id="capsProduct"
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
            <label htmlFor="capsAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdPersuasionStrategist.targetAudience')}
            </label>
            <input
              id="capsAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t('common.phAudienceCleanBeauty')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="capsContent" className="block text-sm font-medium mb-1">
              {t('creativeAdPersuasionStrategist.content')}
            </label>
            <textarea
              id="capsContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Promote a 7-day glow challenge with a limited-time discount..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdPersuasionStrategist.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim() || !content.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeAdPersuasionStrategist.generating') : `${t('creativeAdPersuasionStrategist.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdPersuasionStrategist.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdPersuasionStrategist.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdPersuasionStrategist.dryRunNotice')}
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
                {copied ? t('creativeAdPersuasionStrategist.copied') : t('creativeAdPersuasionStrategist.copy')}
              </button>
            </div>

            {/* Persuasion principles */}
            {result.strategy.principles.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4 text-brand-accent" /> {t('creativeAdPersuasionStrategist.principles')}
                </p>
                {result.strategy.principles.map((p: PersuasionPrinciple, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium capitalize">{p.principle}</span>
                      <span className={`text-sm font-bold ${relevanceColor(p.relevance)}`}>{p.relevance}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.relevance >= 75 ? 'bg-success' : p.relevance >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${p.relevance}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{p.application}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-brand-accent">{t('creativeAdPersuasionStrategist.effect')}:</span> {p.expectedEffect}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Persuasion techniques */}
            {result.strategy.techniques.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent" /> {t('creativeAdPersuasionStrategist.techniques')}
                </p>
                {result.strategy.techniques.map((tech: PersuasionTechnique, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{tech.technique}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STRENGTH_COLORS[tech.strength] || STRENGTH_COLORS.medium}`}>{tech.strength}</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('creativeAdPersuasionStrategist.principle')}:</span> <span className="capitalize">{tech.principle}</span></p>
                    <p className="text-xs text-fg-muted">{tech.implementation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Psychological triggers */}
            {result.strategy.triggers.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-accent" /> {t('creativeAdPersuasionStrategist.triggers')}
                </p>
                {result.strategy.triggers.map((tr: PsychologicalTrigger, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{tr.trigger}</span>
                      <span className={`text-xs font-bold ${relevanceColor(tr.intensity)}`}>{tr.intensity}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${intensityColor(tr.intensity)}`}
                        style={{ width: `${tr.intensity}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{tr.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-brand-accent">{t('common.resultLabels.timing')}:</span> {tr.timing}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ethical considerations */}
            {result.strategy.ethicalConsiderations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-success" /> {t('creativeAdPersuasionStrategist.ethicalConsiderations')}
                </p>
                <ul className="space-y-1.5">
                  {result.strategy.ethicalConsiderations.map((e, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeAdPersuasionStrategist.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.strategy.recommendations.map((rec, i) => (
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
