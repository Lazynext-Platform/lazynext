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
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  MicroCommitmentDesignerResult,
  MicroCommitment,
} from '@/lib/creative/creative-ad-micro-commitment-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const COMMITMENT_TYPE_COLORS: Record<string, string> = {
  attention_commitment: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  engagement_commitment: 'bg-success/20 text-success border-success/30',
  click_commitment: 'bg-warning/20 text-warning border-warning/30',
  signup_commitment: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  trial_commitment: 'bg-success/20 text-success border-success/30',
  preference_commitment: 'bg-warning/20 text-warning border-warning/30',
  social_commitment: 'bg-success/20 text-success border-success/30',
  purchase_commitment: 'bg-danger/20 text-danger border-danger/30',
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

export default function CreativeAdMicroCommitmentDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MicroCommitmentDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-micro-commitment-designer', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdMicroCommitmentDesigner.error'));
      setResult(data.result as MicroCommitmentDesignerResult);
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
          {t('creativeAdMicroCommitmentDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MousePointerClick className="w-6 h-6" /> {t('creativeAdMicroCommitmentDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdMicroCommitmentDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdMicroCommitmentDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MousePointerClick className="w-6 h-6" /> {t('creativeAdMicroCommitmentDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdMicroCommitmentDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="camcdProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdMicroCommitmentDesigner.productOrBrand')}
            </label>
            <input
              id="camcdProduct"
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
            <label htmlFor="camcdContent" className="block text-sm font-medium mb-1">
              {t('creativeAdMicroCommitmentDesigner.content')}
            </label>
            <textarea
              id="camcdContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Tired of dull skin? Our vitamin C serum brightens in just 7 days..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="camcdAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdMicroCommitmentDesigner.targetAudience')}
            </label>
            <input
              id="camcdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdMicroCommitmentDesigner.platform')}</label>
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
            {loading ? t('creativeAdMicroCommitmentDesigner.generating') : `${t('creativeAdMicroCommitmentDesigner.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdMicroCommitmentDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdMicroCommitmentDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdMicroCommitmentDesigner.dryRunNotice')}
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
                {copied ? t('creativeAdMicroCommitmentDesigner.copied') : t('creativeAdMicroCommitmentDesigner.copy')}
              </button>
            </div>

            {/* Commitments */}
            {result.strategy.commitments.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('creativeAdMicroCommitmentDesigner.commitments')}</p>
                {result.strategy.commitments.map((commitment: MicroCommitment, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${COMMITMENT_TYPE_COLORS[commitment.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {commitment.type.replace(/_/g, ' ')}
                      </span>
                      {i < result.strategy.commitments.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-fg-muted" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3" /> {t('creativeAdMicroCommitmentDesigner.commitmentTrigger')}
                        </p>
                        <p className="text-sm text-fg">{commitment.commitmentTrigger}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdMicroCommitmentDesigner.frictionLevel')}</p>
                        <p className="text-sm text-fg">{commitment.frictionLevel}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> {t('creativeAdMicroCommitmentDesigner.nextCommitmentCue')}
                        </p>
                        <p className="text-sm text-fg">{commitment.nextCommitmentCue}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdMicroCommitmentDesigner.commitmentPathway')}</p>
                        <p className="text-sm text-fg">{commitment.commitmentPathway}</p>
                      </div>
                    </div>

                    {/* Commitment momentum bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {t('creativeAdMicroCommitmentDesigner.commitmentMomentum')}
                        </span>
                        <span className={`text-sm font-bold ${scoreColor(commitment.commitmentMomentum)}`}>{commitment.commitmentMomentum}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(commitment.commitmentMomentum)}`}
                          style={{ width: `${commitment.commitmentMomentum}%` }}
                        />
                      </div>
                    </div>

                    {/* Conversion probability bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('creativeAdMicroCommitmentDesigner.conversionProbability')}</span>
                        <span className={`text-sm font-bold ${scoreColor(commitment.conversionProbability)}`}>{commitment.conversionProbability}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(commitment.conversionProbability)}`}
                          style={{ width: `${commitment.conversionProbability}%` }}
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
                <p className="text-sm font-medium mb-2">{t('creativeAdMicroCommitmentDesigner.recommendations')}</p>
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
