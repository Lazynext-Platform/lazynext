'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Fish,
  BookOpen,
  Tag,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  HookStoryOfferDesignerResult,
} from '@/lib/creative/ad-creative-hook-story-offer-designer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const TYPE_COLORS: Record<string, string> = {
  question: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  bold_claim: 'bg-danger/20 text-danger border-danger/30',
  pattern_interrupt: 'bg-warning/20 text-warning border-warning/30',
  curiosity_gap: 'bg-success/20 text-success border-success/30',
  shocking_stat: 'bg-danger/20 text-danger border-danger/30',
  relatable_pain: 'bg-warning/20 text-warning border-warning/30',
  transformation: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  social_proof: 'bg-success/20 text-success border-success/30',
  problem_agitation: 'bg-danger/20 text-danger border-danger/30',
  personal_journey: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  before_after: 'bg-success/20 text-success border-success/30',
  discovery: 'bg-warning/20 text-warning border-warning/30',
  testimony: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  myth_busting: 'bg-danger/20 text-danger border-danger/30',
  discount: 'bg-success/20 text-success border-success/30',
  bundle: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  free_trial: 'bg-success/20 text-success border-success/30',
  limited_time: 'bg-warning/20 text-warning border-warning/30',
  bonus: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  guarantee: 'bg-success/20 text-success border-success/30',
  exclusive_access: 'bg-danger/20 text-danger border-danger/30',
};

export default function AdCreativeHookStoryOfferDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HookStoryOfferDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-hook-story-offer-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('hookStoryOfferDesigner.error'));
      setResult(data.result as HookStoryOfferDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, platform, t]);

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
          {t('hookStoryOfferDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('hookStoryOfferDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('hookStoryOfferDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('hookStoryOfferDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('hookStoryOfferDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('hookStoryOfferDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="achsodProduct" className="block text-sm font-medium mb-1">
              {t('hookStoryOfferDesigner.productOrBrand')}
            </label>
            <input
              id="achsodProduct"
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
            <label htmlFor="achsodAudience" className="block text-sm font-medium mb-1">
              {t('hookStoryOfferDesigner.targetAudience')}
            </label>
            <input
              id="achsodAudience"
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
            <label className="block text-sm font-medium mb-2">{t('hookStoryOfferDesigner.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('hookStoryOfferDesigner.generating') : `${t('hookStoryOfferDesigner.generate')} (${CREDIT_COST})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('hookStoryOfferDesigner.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('hookStoryOfferDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('hookStoryOfferDesigner.dryRunNotice')}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('hookStoryOfferDesigner.copied') : t('hookStoryOfferDesigner.copy')}
              </button>
            </div>

            {/* Hook */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Fish className="w-4 h-4 text-brand-accent" />
                <span className="text-sm font-medium">{t('hookStoryOfferDesigner.hook')}</span>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[result.framework.hook.hookType] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                  {result.framework.hook.hookType.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-fg">{result.framework.hook.copy}</p>
            </div>

            {/* Story */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-success" />
                <span className="text-sm font-medium">{t('hookStoryOfferDesigner.story')}</span>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[result.framework.story.storyArc] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                  {result.framework.story.storyArc.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-fg">{result.framework.story.copy}</p>
            </div>

            {/* Offer */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">{t('hookStoryOfferDesigner.offer')}</span>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[result.framework.offer.offerType] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                  {result.framework.offer.offerType.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-fg">{result.framework.offer.copy}</p>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">{t('hookStoryOfferDesigner.closingCta')}</p>
                <p className="text-sm text-fg">{result.framework.offer.cta}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
