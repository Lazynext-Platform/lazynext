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
  Clock,
  Heart,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { MomentDesignerResult, MicroMoment } from '@/lib/creative/creative-ad-micro-moment-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const MOMENT_TYPE_COLORS: Record<string, string> = {
  visual_pop: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  text_reveal: 'bg-success/20 text-success border-success/30',
  sound_cue: 'bg-warning/20 text-warning border-warning/30',
  expression_change: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  scene_shift: 'bg-success/20 text-success border-success/30',
  color_burst: 'bg-warning/20 text-warning border-warning/30',
  motion_accel: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  pause_beat: 'bg-bg-secondary text-fg-muted border-border',
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

export default function CreativeAdMicroMomentDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MomentDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-micro-moment-designer', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdMicroMomentDesigner.error'));
      setResult(data.result as MomentDesignerResult);
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
          {t('creativeAdMicroMomentDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeAdMicroMomentDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdMicroMomentDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdMicroMomentDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeAdMicroMomentDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdMicroMomentDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cammProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdMicroMomentDesigner.productOrBrand')}
            </label>
            <input
              id="cammProduct"
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
            <label htmlFor="cammContent" className="block text-sm font-medium mb-1">
              {t('creativeAdMicroMomentDesigner.content')}
            </label>
            <textarea
              id="cammContent"
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
            <label htmlFor="cammAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdMicroMomentDesigner.targetAudience')}
            </label>
            <input
              id="cammAudience"
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
            <label className="block text-sm font-medium mb-2">{t('creativeAdMicroMomentDesigner.platform')}</label>
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
            {loading ? t('creativeAdMicroMomentDesigner.generating') : `${t('creativeAdMicroMomentDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdMicroMomentDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdMicroMomentDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdMicroMomentDesigner.dryRunNotice')}
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
                {copied ? t('creativeAdMicroMomentDesigner.copied') : t('creativeAdMicroMomentDesigner.copy')}
              </button>
            </div>

            {/* Micro-moment timeline */}
            {result.sequence.moments.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent" /> {t('creativeAdMicroMomentDesigner.moments')}
                </p>
                <div className="relative">
                  {/* Timeline rail */}
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-border" aria-hidden="true" />
                  <ol className="space-y-3">
                    {result.sequence.moments.map((m: MicroMoment, i: number) => (
                      <li key={i} className="relative pl-8">
                        {/* Timeline dot */}
                        <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-brand-accent border-2 border-bg-card" aria-hidden="true" />
                        <div className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${MOMENT_TYPE_COLORS[m.type] || MOMENT_TYPE_COLORS.pause_beat}`}>
                                {m.type.replace(/_/g, ' ')}
                              </span>
                              <span className="inline-flex items-center text-xs text-fg-muted gap-1">
                                <Clock className="w-3 h-3" /> {m.timestamp}
                              </span>
                              <span className="text-xs text-fg-muted">({m.duration})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${scoreColor(m.attentionScore)}`}>{m.attentionScore}/100</span>
                            </div>
                          </div>

                          {/* Attention score bar */}
                          <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreBar(m.attentionScore)}`}
                              style={{ width: `${m.attentionScore}%` }}
                            />
                          </div>

                          <p className="text-xs text-fg">{m.description}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="rounded-md border border-border bg-bg-card p-2">
                              <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdMicroMomentDesigner.implementation')}</p>
                              <p className="text-xs text-fg">{m.implementation}</p>
                            </div>
                            <div className="rounded-md border border-border bg-bg-card p-2">
                              <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {t('creativeAdMicroMomentDesigner.emotionalBeat')}
                              </p>
                              <p className="text-xs text-fg">{m.emotionalBeat}</p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.sequence.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdMicroMomentDesigner.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.sequence.recommendations.map((rec, i) => (
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
