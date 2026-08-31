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
  Heart,
  Users,
  Film,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  BrandStoryArchitectResult,
  StoryAct,
  StoryBeat,
  CharacterRole,
  StoryType,
} from '@/lib/creative/brand-story-architect';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const STORY_TYPES: StoryType[] = [
  'hero-journey',
  'before-after',
  'problem-solution',
  'transformation',
  'legacy',
  'rebellion',
];

export default function BrandStoryArchitectPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [brandName, setBrandName] = useState('');
  const [productOrService, setProductOrService] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [storyType, setStoryType] = useState<StoryType | ''>('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BrandStoryArchitectResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!brandName.trim() || !productOrService.trim() || !brandValues.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/brand-story-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          productOrService,
          brandValues,
          storyType: storyType || undefined,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('brandStoryArchitect.error'));
      setResult(data.result as BrandStoryArchitectResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [brandName, productOrService, brandValues, storyType, platform, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const lines: string[] = [];
      lines.push(`Core Message: ${result.story.coreMessage}`);
      lines.push(`Brand Positioning: ${result.story.brandPositioning}`);
      lines.push(`Emotional Core: ${result.story.emotionalCore}`);
      lines.push('');
      lines.push('Story Arc:');
      lines.push(`  Conflict: ${result.story.arc.conflict}`);
      lines.push(`  Resolution: ${result.story.arc.resolution}`);
      lines.push('');
      for (const act of result.story.arc.acts) {
        lines.push(`Act: ${act.name} (${act.emotionalTone})`);
        lines.push(`  Summary: ${act.summary}`);
        lines.push(`  Key Beats: ${act.keyBeats.join('; ')}`);
        lines.push('');
      }
      lines.push('Character Roles:');
      for (const role of result.story.arc.characterRoles) {
        lines.push(`  ${role.role}: ${role.description}`);
      }
      lines.push('');
      lines.push('Story Beats:');
      for (const beat of result.story.storyBeats) {
        lines.push(`  ${beat.beat}: ${beat.description}`);
        lines.push(`    Ad Application: ${beat.adApplication}`);
      }
      lines.push('');
      lines.push('Recommendations:');
      for (const rec of result.story.recommendations) {
        lines.push(`  - ${rec}`);
      }
      await navigator.clipboard.writeText(lines.join('\n'));
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
          {t('brandStoryArchitect.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> {t('brandStoryArchitect.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandStoryArchitect.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('brandStoryArchitect.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> {t('brandStoryArchitect.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandStoryArchitect.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bsaBrandName" className="block text-sm font-medium mb-1">
                {t('brandStoryArchitect.brandName')}
              </label>
              <input
                id="bsaBrandName"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., GlowUp"
                maxLength={2000}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="bsaValues" className="block text-sm font-medium mb-1">
                {t('brandStoryArchitect.brandValues')}
              </label>
              <input
                id="bsaValues"
                type="text"
                value={brandValues}
                onChange={(e) => setBrandValues(e.target.value)}
                placeholder="e.g., authenticity, empowerment, sustainability"
                maxLength={500}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bsaProduct" className="block text-sm font-medium mb-1">
              {t('brandStoryArchitect.productOrService')}
            </label>
            <textarea
              id="bsaProduct"
              value={productOrService}
              onChange={(e) => setProductOrService(e.target.value)}
              placeholder="e.g., A skincare app that uses AI to personalize routines"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('brandStoryArchitect.storyType')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStoryType('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  storyType === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                auto
              </button>
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

          <div>
            <label className="block text-sm font-medium mb-2">{t('brandStoryArchitect.platform')}</label>
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
            disabled={loading || !brandName.trim() || !productOrService.trim() || !brandValues.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('brandStoryArchitect.generating') : `${t('brandStoryArchitect.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('brandStoryArchitect.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('brandStoryArchitect.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('brandStoryArchitect.dryRunNotice')}
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
                {copied ? t('brandStoryArchitect.copied') : t('brandStoryArchitect.copy')}
              </button>
            </div>

            {/* Core message, positioning, emotional core */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('brandStoryArchitect.coreMessage')}</p>
                  <p className="text-sm mt-0.5">{result.story.coreMessage}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('brandStoryArchitect.brandPositioning')}</p>
                  <p className="text-sm mt-0.5">{result.story.brandPositioning}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('brandStoryArchitect.emotionalCore')}</p>
                  <p className="text-sm mt-0.5">{result.story.emotionalCore}</p>
                </div>
              </div>
            </div>

            {/* Story arc — acts */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Film className="w-4 h-4" /> {t('brandStoryArchitect.storyArc')}
              </h2>
              {result.story.arc.acts.map((act: StoryAct, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold">
                      {i + 1}
                    </span>
                    <h3 className="text-sm font-bold">{act.name}</h3>
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30 ml-auto">
                      {act.emotionalTone}
                    </span>
                  </div>
                  <p className="text-sm">{act.summary}</p>
                  {act.keyBeats.length > 0 && (
                    <ul className="space-y-1">
                      {act.keyBeats.map((beat: string, j: number) => (
                        <li key={j} className="text-sm flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                          <span>{beat}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Conflict & resolution */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <div>
                <p className="text-xs font-medium text-fg-muted">{t('brandStoryArchitect.conflict')}</p>
                <p className="text-sm mt-0.5">{result.story.arc.conflict}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted">{t('brandStoryArchitect.resolution')}</p>
                <p className="text-sm mt-0.5">{result.story.arc.resolution}</p>
              </div>
            </div>

            {/* Character roles */}
            {result.story.arc.characterRoles.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h2 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" /> {t('brandStoryArchitect.characterRoles')}
                </h2>
                <div className="space-y-2">
                  {result.story.arc.characterRoles.map((role: CharacterRole, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30 flex-shrink-0">
                        {role.role}
                      </span>
                      <p className="text-sm">{role.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story beats */}
            {result.story.storyBeats.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h2 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Film className="w-4 h-4" /> {t('brandStoryArchitect.storyBeats')}
                </h2>
                <div className="space-y-2">
                  {result.story.storyBeats.map((beat: StoryBeat, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-bg-secondary px-3 py-2 space-y-1">
                      <p className="text-sm font-medium">{beat.beat}</p>
                      <p className="text-sm text-fg-muted">{beat.description}</p>
                      <p className="text-xs text-brand-accent">{t('brandStoryArchitect.adApplication')}: {beat.adApplication}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.story.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-2">{t('brandStoryArchitect.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.story.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
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
