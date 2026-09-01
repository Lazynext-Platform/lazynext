'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Anchor,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Scale,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AnchoringFrameworkDesignerResult,
  AnchoringFramework,
} from '@/lib/creative/ad-creative-anchoring-effect-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const ANCHOR_TYPE_COLORS: Record<string, string> = {
  price_anchor: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  value_anchor: 'bg-success/20 text-success border-success/30',
  competitor_anchor: 'bg-warning/20 text-warning border-warning/30',
  premium_anchor: 'bg-danger/20 text-danger border-danger/30',
  historical_anchor: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  aspirational_anchor: 'bg-success/20 text-success border-success/30',
  social_anchor: 'bg-warning/20 text-warning border-warning/30',
  scarcity_anchor: 'bg-danger/20 text-danger border-danger/30',
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

export default function AdCreativeAnchoringEffectDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnchoringFrameworkDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-anchoring-effect-designer', {
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
      if (!res.ok) throw new Error(data.error || t('adCreativeAnchoringEffectDesigner.error'));
      setResult(data.result as AnchoringFrameworkDesignerResult);
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
          {t('adCreativeAnchoringEffectDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Anchor className="w-6 h-6" /> {t('adCreativeAnchoringEffectDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeAnchoringEffectDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeAnchoringEffectDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Anchor className="w-6 h-6" /> {t('adCreativeAnchoringEffectDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeAnchoringEffectDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acaedProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeAnchoringEffectDesigner.productOrBrand')}
            </label>
            <input
              id="acaedProduct"
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
            <label htmlFor="acaedContent" className="block text-sm font-medium mb-1">
              {t('adCreativeAnchoringEffectDesigner.content')}
            </label>
            <textarea
              id="acaedContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('adCreativeAnchoringEffectDesigner.contentPh')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acaedAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeAnchoringEffectDesigner.targetAudience')}
            </label>
            <input
              id="acaedAudience"
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
            <label className="block text-sm font-medium mb-2">{t('adCreativeAnchoringEffectDesigner.platform')}</label>
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
            {loading ? t('adCreativeAnchoringEffectDesigner.generating') : `${t('adCreativeAnchoringEffectDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeAnchoringEffectDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeAnchoringEffectDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeAnchoringEffectDesigner.dryRunNotice')}
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
                {copied ? t('adCreativeAnchoringEffectDesigner.copied') : t('adCreativeAnchoringEffectDesigner.copy')}
              </button>
            </div>

            {/* Anchoring frameworks */}
            {result.strategy.frameworks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('adCreativeAnchoringEffectDesigner.frameworks')}</p>
                {result.strategy.frameworks.map((f: AnchoringFramework, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${ANCHOR_TYPE_COLORS[f.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {f.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Anchor className="w-3 h-3" /> {t('adCreativeAnchoringEffectDesigner.anchorReference')}
                        </p>
                        <p className="text-sm text-fg">{f.anchorReference}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Scale className="w-3 h-3" /> {t('adCreativeAnchoringEffectDesigner.anchorValue')}
                        </p>
                        <p className="text-sm text-fg">{f.anchorValue}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {t('adCreativeAnchoringEffectDesigner.perceivedValueShift')}
                        </p>
                        <p className="text-sm text-fg">{f.perceivedValueShift}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('adCreativeAnchoringEffectDesigner.anchoringPathway')}</p>
                        <p className="text-sm text-fg">{f.anchoringPathway}</p>
                      </div>
                    </div>

                    {/* Anchor strength bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('adCreativeAnchoringEffectDesigner.anchorStrength')}</span>
                        <span className={`text-sm font-bold ${scoreColor(f.anchorStrength)}`}>{f.anchorStrength}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(f.anchorStrength)}`}
                          style={{ width: `${f.anchorStrength}%` }}
                        />
                      </div>
                    </div>

                    {/* Perception shift bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('adCreativeAnchoringEffectDesigner.perceptionShift')}</span>
                        <span className={`text-sm font-bold ${scoreColor(f.perceptionShift)}`}>{f.perceptionShift}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(f.perceptionShift)}`}
                          style={{ width: `${f.perceptionShift}%` }}
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
                <p className="text-sm font-medium mb-2">{t('adCreativeAnchoringEffectDesigner.recommendations')}</p>
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
