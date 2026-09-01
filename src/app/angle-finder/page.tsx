'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Compass,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Brain,
  Lightbulb,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AngleFinderResult,
  CreativeAngle,
} from '@/lib/creative/angle-finder';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  all: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function scoreColor(s: number): string {
  if (s >= 75) return 'text-success';
  if (s >= 60) return 'text-brand-accent';
  if (s >= 40) return 'text-warning';
  return 'text-danger';
}

export default function AngleFinderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AngleFinderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const find = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/angle-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          targetAudience: targetAudience || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('angleFinder.error'));
      setResult(data.result as AngleFinderResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, targetAudience, t]);

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
          {t('angleFinder.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="w-6 h-6" /> {t('angleFinder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('angleFinder.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('angleFinder.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="w-6 h-6" /> {t('angleFinder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('angleFinder.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="afProduct" className="block text-sm font-medium mb-1">
              {t('angleFinder.productOrBrand')}
            </label>
            <textarea
              id="afProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('angleFinder.platform')}</label>
            <div className="flex flex-wrap gap-2">
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
            <label htmlFor="afAudience" className="block text-sm font-medium mb-1">
              {t('angleFinder.targetAudience')}
            </label>
            <input
              id="afAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., women 25-40 interested in clean beauty (optional)"
              maxLength={1000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={find}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('angleFinder.finding') : `${t('angleFinder.find')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('angleFinder.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('angleFinder.finding')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('angleFinder.dryRunNotice')}
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
                {copied ? t('angleFinder.copied') : t('angleFinder.copy')}
              </button>
            </div>

            {/* Angles */}
            <div className="space-y-3">
              {result.angles.map((angle: CreativeAngle, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg-card p-4"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs text-fg-muted mt-0.5">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{angle.name}</span>
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">
                          <Brain className="w-3 h-3" /> {angle.psychologicalTrigger}
                        </span>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${scoreColor(angle.uniquenessScore)}`}>{angle.uniquenessScore}</span>
                  </div>

                  <p className="text-sm text-fg-muted mb-3">{angle.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-brand-accent" />
                      <span className="text-fg-muted">{t('angleFinder.exampleHeadline')}:</span>
                      <span className="font-medium">{angle.exampleHeadline}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[angle.bestForPlatform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      <Target className="w-3 h-3" /> {angle.bestForPlatform}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-fg-muted">{t('angleFinder.uniquenessScore')}:</span>
                      <span className={scoreColor(angle.uniquenessScore)}>{angle.uniquenessScore}/100</span>
                    </span>
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
