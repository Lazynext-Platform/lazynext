'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  BookOpen,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Film,
  MessageSquare,
  Heart,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdStoryGeneratorResult,
  StoryAct,
  StoryType,
} from '@/lib/creative/ad-story-generator';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const STORY_TYPES: StoryType[] = ['transformation', 'journey', 'conflict', 'resolution', 'aspiration'];

export default function AdStoryGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [storyType, setStoryType] = useState<StoryType>('transformation');
  const [targetAudience, setTargetAudience] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdStoryGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-story-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          storyType,
          targetAudience: targetAudience || undefined,
          duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adStoryGenerator.error'));
      setResult(data.result as AdStoryGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, storyType, targetAudience, duration, t]);

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
          {t('adStoryGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> {t('adStoryGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adStoryGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adStoryGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> {t('adStoryGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adStoryGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="asgProduct" className="block text-sm font-medium mb-1">
              {t('adStoryGenerator.productOrBrand')}
            </label>
            <textarea
              id="asgProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adStoryGenerator.platform')}</label>
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
            <label className="block text-sm font-medium mb-2">{t('adStoryGenerator.storyType')}</label>
            <div className="flex flex-wrap gap-2">
              {STORY_TYPES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStoryType(st)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    storyType === st
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="asgAudience" className="block text-sm font-medium mb-1">
                {t('adStoryGenerator.targetAudience')}
              </label>
              <input
                id="asgAudience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., women 25-40 interested in clean beauty (optional)"
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="asgDuration" className="block text-sm font-medium mb-1">
                {t('adStoryGenerator.duration')}
              </label>
              <input
                id="asgDuration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={15}
                max={90}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adStoryGenerator.generating') : `${t('adStoryGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adStoryGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adStoryGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adStoryGenerator.dryRunNotice')}
              </div>
            )}

            {/* Story header */}
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <h2 className="font-medium text-lg mb-1">{result.story.title}</h2>
              <p className="text-sm text-fg-muted italic">{result.story.logline}</p>
            </div>

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('adStoryGenerator.copied') : t('adStoryGenerator.copy')}
              </button>
            </div>

            {/* Acts */}
            <div className="space-y-3">
              {result.story.acts.map((act: StoryAct, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                      {t('adStoryGenerator.act')} {act.actNumber}
                    </span>
                    <span className="font-medium">{act.title}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-fg-muted">
                      <Clock className="w-3 h-3" /> {act.duration}s
                    </span>
                  </div>

                  <p className="text-sm text-fg-muted mb-3">{act.description}</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-1.5">
                      <Film className="w-3.5 h-3.5 text-fg-muted flex-shrink-0 mt-0.5" />
                      <span className="text-fg-muted">{t('adStoryGenerator.visualNotes')}:</span>
                      <span className="font-medium">{act.visualNotes}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-fg-muted flex-shrink-0 mt-0.5" />
                      <span className="text-fg-muted">{t('adStoryGenerator.voiceover')}:</span>
                      <span className="font-medium italic">&ldquo;{act.voiceover}&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-fg-muted flex-shrink-0 mt-0.5" />
                      <span className="text-fg-muted">{t('adStoryGenerator.emotionBeat')}:</span>
                      <span className="font-medium">{act.emotionBeat}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Story summary */}
            <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2 text-sm">
              <div>
                <span className="text-fg-muted">{t('adStoryGenerator.emotionalArc')}:</span>{' '}
                <span className="font-medium">{result.story.emotionalArc}</span>
              </div>
              <div>
                <span className="text-fg-muted">{t('adStoryGenerator.keyMessage')}:</span>{' '}
                <span className="font-medium">{result.story.keyMessage}</span>
              </div>
              <div>
                <span className="text-fg-muted">{t('adStoryGenerator.ctaIntegration')}:</span>{' '}
                <span className="font-medium">{result.story.ctaIntegration}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
