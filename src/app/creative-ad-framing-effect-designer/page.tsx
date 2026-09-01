'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Focus,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  FramingEffectDesignerResult,
  FramingEffect,
} from '@/lib/creative/creative-ad-framing-effect-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const FRAMING_TYPE_COLORS: Record<string, string> = {
  gain_frame: 'bg-success/20 text-success border-success/30',
  loss_frame: 'bg-danger/20 text-danger border-danger/30',
  attribute_frame: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  goal_frame: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  risk_frame: 'bg-danger/20 text-danger border-danger/30',
  opportunity_frame: 'bg-warning/20 text-warning border-warning/30',
  progress_frame: 'bg-success/20 text-success border-success/30',
  identity_frame: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function scoreBar(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeAdFramingEffectDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FramingEffectDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-framing-effect-designer', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdFramingEffectDesigner.error'));
      setResult(data.result as FramingEffectDesignerResult);
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
          {t('creativeAdFramingEffectDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Focus className="w-6 h-6" /> {t('creativeAdFramingEffectDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdFramingEffectDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdFramingEffectDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Focus className="w-6 h-6" /> {t('creativeAdFramingEffectDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdFramingEffectDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cafedProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdFramingEffectDesigner.productOrBrand')}
            </label>
            <input
              id="cafedProduct"
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
            <label htmlFor="cafedContent" className="block text-sm font-medium mb-1">
              {t('creativeAdFramingEffectDesigner.content')}
            </label>
            <textarea
              id="cafedContent"
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
            <label htmlFor="cafedAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdFramingEffectDesigner.targetAudience')}
            </label>
            <input
              id="cafedAudience"
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
            <label className="block text-sm font-medium mb-2">{t('creativeAdFramingEffectDesigner.platform')}</label>
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
            {loading ? t('creativeAdFramingEffectDesigner.generating') : `${t('creativeAdFramingEffectDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdFramingEffectDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdFramingEffectDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdFramingEffectDesigner.dryRunNotice')}
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
                {copied ? t('creativeAdFramingEffectDesigner.copied') : t('creativeAdFramingEffectDesigner.copy')}
              </button>
            </div>

            {/* Effects */}
            {result.strategy.effects.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('creativeAdFramingEffectDesigner.effects')}</p>
                {result.strategy.effects.map((effect: FramingEffect, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${FRAMING_TYPE_COLORS[effect.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {effect.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {t('creativeAdFramingEffectDesigner.framePerspective')}
                        </p>
                        <p className="text-sm text-fg">{effect.framePerspective}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdFramingEffectDesigner.messageFrame')}</p>
                        <p className="text-sm text-fg">{effect.messageFrame}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdFramingEffectDesigner.perceptionShift')}</p>
                        <p className="text-sm text-fg">{effect.perceptionShift}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdFramingEffectDesigner.framingPathway')}</p>
                        <p className="text-sm text-fg">{effect.framingPathway}</p>
                      </div>
                    </div>

                    {/* Frame strength bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {t('creativeAdFramingEffectDesigner.frameStrength')}
                        </span>
                        <span className={`text-sm font-bold ${scoreColor(effect.frameStrength)}`}>{effect.frameStrength}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(effect.frameStrength)}`}
                          style={{ width: `${effect.frameStrength}%` }}
                        />
                      </div>
                    </div>

                    {/* Decision influence bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('creativeAdFramingEffectDesigner.decisionInfluence')}</span>
                        <span className={`text-sm font-bold ${scoreColor(effect.decisionInfluence)}`}>{effect.decisionInfluence}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(effect.decisionInfluence)}`}
                          style={{ width: `${effect.decisionInfluence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdFramingEffectDesigner.recommendations')}</p>
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
