'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Target,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AudienceSegmentResult,
  AudienceSegment,
} from '@/lib/creative/ad-audience-segment-builder';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-success/20 text-success border-success/30',
};

export default function AdAudienceSegmentBuilderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [primaryAudience, setPrimaryAudience] = useState('');
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [segmentCount, setSegmentCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AudienceSegmentResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !primaryAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-audience-segment-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          primaryAudience,
          platform: platform || undefined,
          segmentCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adAudienceSegmentBuilder.error'));
      setResult(data.result as AudienceSegmentResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, primaryAudience, platform, segmentCount, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const lines = result.segments.map(
        (s) =>
          `${s.segmentName} [${s.priority}]\n  Demographics: ${s.demographics.ageRange}, ${s.demographics.gender}, ${s.demographics.location}, ${s.demographics.income}\n  Interests: ${s.interests.join(', ')}\n  Behaviors: ${s.behaviors.join(', ')}\n  Platform Targeting: ${s.platformTargeting.join(', ')}\n  Estimated Reach: ${s.estimatedReach}\n  Recommended Format: ${s.recommendedAdFormat}`,
      );
      await navigator.clipboard.writeText(lines.join('\n\n'));
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
          {t('adAudienceSegmentBuilder.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adAudienceSegmentBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudienceSegmentBuilder.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adAudienceSegmentBuilder.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adAudienceSegmentBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudienceSegmentBuilder.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aasbProduct" className="block text-sm font-medium mb-1">
              {t('adAudienceSegmentBuilder.productOrBrand')}
            </label>
            <textarea
              id="aasbProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aasbAudience" className="block text-sm font-medium mb-1">
              {t('adAudienceSegmentBuilder.primaryAudience')}
            </label>
            <textarea
              id="aasbAudience"
              value={primaryAudience}
              onChange={(e) => setPrimaryAudience(e.target.value)}
              placeholder="e.g., Health-conscious women aged 25-40 interested in clean beauty"
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adAudienceSegmentBuilder.platform')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatform(undefined)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  platform === undefined
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

          <div>
            <label htmlFor="aasbCount" className="block text-sm font-medium mb-1">
              {t('adAudienceSegmentBuilder.segmentCount')}
            </label>
            <input
              id="aasbCount"
              type="number"
              value={segmentCount}
              onChange={(e) => setSegmentCount(Number(e.target.value))}
              min={2}
              max={6}
              className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !primaryAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adAudienceSegmentBuilder.generating') : `${t('adAudienceSegmentBuilder.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adAudienceSegmentBuilder.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adAudienceSegmentBuilder.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adAudienceSegmentBuilder.dryRunNotice')}
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
                {copied ? t('adAudienceSegmentBuilder.copied') : t('adAudienceSegmentBuilder.copy')}
              </button>
            </div>

            {/* Segment cards */}
            <div className="space-y-3">
              {result.segments.map((seg: AudienceSegment, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Target className="w-4 h-4 text-brand-accent flex-shrink-0" />
                    <span className="text-sm font-medium">{seg.segmentName}</span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[seg.priority] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {seg.priority}
                    </span>
                  </div>

                  {/* Demographics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">{t('adAudienceSegmentBuilder.ageRange')}:</span> {seg.demographics.ageRange}
                    </div>
                    <div className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">{t('adAudienceSegmentBuilder.gender')}:</span> {seg.demographics.gender}
                    </div>
                    <div className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">{t('adAudienceSegmentBuilder.location')}:</span> {seg.demographics.location}
                    </div>
                    <div className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">{t('adAudienceSegmentBuilder.income')}:</span> {seg.demographics.income}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <p className="text-xs font-medium text-fg mb-1">{t('adAudienceSegmentBuilder.interests')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {seg.interests.map((interest, j) => (
                        <span key={j} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Behaviors */}
                  <div>
                    <p className="text-xs font-medium text-fg mb-1">{t('adAudienceSegmentBuilder.behaviors')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {seg.behaviors.map((behavior, j) => (
                        <span key={j} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                          {behavior}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Platform targeting */}
                  <div>
                    <p className="text-xs font-medium text-fg mb-1">{t('adAudienceSegmentBuilder.platformTargeting')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {seg.platformTargeting.map((pt, j) => (
                        <span key={j} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-brand-accent/10 text-brand-accent border-brand-accent/30">
                          {pt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Reach + format */}
                  <div className="flex items-center gap-4 flex-wrap text-xs text-fg-muted border-t border-border pt-2">
                    <span><span className="font-medium text-fg">{t('adAudienceSegmentBuilder.estimatedReach')}:</span> {seg.estimatedReach}</span>
                    <span><span className="font-medium text-fg">{t('adAudienceSegmentBuilder.recommendedAdFormat')}:</span> {seg.recommendedAdFormat}</span>
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
