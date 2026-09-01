'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Palette,
  Loader2,
  AlertCircle,
  Sparkles,
  Type,
  Image as ImageIcon,
  Heart,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { MoodBoardGeneratorResult } from '@/lib/creative/mood-board-generator';

const CREDIT_COST = 4;

export default function MoodBoardGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [styleKeywords, setStyleKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MoodBoardGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/creative/mood-board-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand: productOrBrand.trim(),
          styleKeywords: styleKeywords.trim()
            ? styleKeywords.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
          targetAudience: targetAudience.trim() || undefined,
          platform: platform.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('moodBoardGenerator.noResults'));
      setResult(data.result as MoodBoardGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, styleKeywords, targetAudience, platform, t]);

  const copyMoodBoard = useCallback(() => {
    if (!result) return;
    const mb = result.moodBoard;
    const lines: string[] = [
      `Creative Mood Board — ${productOrBrand}`,
      '',
      'COLOR PALETTE:',
      `- Primary: ${mb.colorPalette.primary}`,
      `- Secondary: ${mb.colorPalette.secondary}`,
      `- Accent: ${mb.colorPalette.accent}`,
      `- Background: ${mb.colorPalette.background}`,
      `- Text: ${mb.colorPalette.text}`,
      `- Palette: ${mb.colorPalette.colors.join(', ')}`,
      '',
      'TYPOGRAPHY:',
      `- Heading: ${mb.typography.headingFont} — ${mb.typography.headingStyle}`,
      `- Body: ${mb.typography.bodyFont} — ${mb.typography.bodyStyle}`,
      '',
      'IMAGERY THEMES:',
      ...mb.imageryThemes.map((it, i) => `${i + 1}. ${it.theme}\n   ${it.description}\n   Keywords: ${it.keywords.join(', ')}\n   References: ${it.referenceStyles.join(', ')}`),
      '',
      'OVERALL STYLE:',
      mb.overallStyle,
      '',
      'EMOTIONAL TONE:',
      mb.emotionalTone,
      '',
      'BRAND PERSONALITY:',
      mb.brandPersonality.join(', '),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [result, productOrBrand]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm">
          {t('common.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6" /> {t('moodBoardGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('moodBoardGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm">
        {t('common.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6" /> {t('moodBoardGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('moodBoardGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="mbgProduct" className="block text-sm font-medium mb-1">
              {t('moodBoardGenerator.productOrBrand')}
            </label>
            <textarea
              id="mbgProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., Eco-friendly reusable water bottle for fitness enthusiasts"
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="mbgKeywords" className="block text-sm font-medium mb-1">
                {t('moodBoardGenerator.styleKeywords')}
              </label>
              <input
                id="mbgKeywords"
                type="text"
                value={styleKeywords}
                onChange={(e) => setStyleKeywords(e.target.value)}
                placeholder="e.g., minimal, bold, playful"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="mbgAudience" className="block text-sm font-medium mb-1">
                {t('moodBoardGenerator.targetAudience')}
              </label>
              <input
                id="mbgAudience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., urban millennials"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="mbgPlatform" className="block text-sm font-medium mb-1">
                {t('moodBoardGenerator.platform')}
              </label>
              <input
                id="mbgPlatform"
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g., instagram, tiktok"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
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
            {loading
              ? t('moodBoardGenerator.generating')
              : `${t('moodBoardGenerator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('moodBoardGenerator.generating')}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('moodBoardGenerator.subtitle')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">
                {result.dryRun ? t('moodBoardGenerator.template') : 'AI-generated'}
              </span>
              <button
                onClick={copyMoodBoard}
                className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium hover:bg-hover flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('moodBoardGenerator.copied') : t('moodBoardGenerator.copy')}
              </button>
            </div>

            {/* Color Palette */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4" /> {t('moodBoardGenerator.colorPalette')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.moodBoard.colorPalette.colors.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-14 h-14 rounded-lg border border-border"
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                    <span className="text-xs text-fg-muted font-mono">{c}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-fg-muted">
                <div>Primary: <span className="font-mono">{result.moodBoard.colorPalette.primary}</span></div>
                <div>Secondary: <span className="font-mono">{result.moodBoard.colorPalette.secondary}</span></div>
                <div>Accent: <span className="font-mono">{result.moodBoard.colorPalette.accent}</span></div>
                <div>Background: <span className="font-mono">{result.moodBoard.colorPalette.background}</span></div>
                <div>Text: <span className="font-mono">{result.moodBoard.colorPalette.text}</span></div>
              </div>
            </div>

            {/* Typography */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <Type className="w-4 h-4" /> {t('moodBoardGenerator.typography')}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">{result.moodBoard.typography.headingFont}</div>
                  <p className="text-xs text-fg-muted">{result.moodBoard.typography.headingStyle}</p>
                  <p
                    className="mt-1 text-xl font-bold"
                    style={{ fontFamily: result.moodBoard.typography.headingFont }}
                  >
                    {productOrBrand || 'Your Brand Headline'}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium">{result.moodBoard.typography.bodyFont}</div>
                  <p className="text-xs text-fg-muted">{result.moodBoard.typography.bodyStyle}</p>
                  <p
                    className="mt-1 text-sm"
                    style={{ fontFamily: result.moodBoard.typography.bodyFont }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              </div>
            </div>

            {/* Imagery Themes */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4" /> {t('moodBoardGenerator.imageryThemes')}
              </h3>
              <div className="space-y-3">
                {result.moodBoard.imageryThemes.map((it, i) => (
                  <div key={i} className="border-l-2 border-border pl-3">
                    <div className="text-sm font-medium">{it.theme}</div>
                    <p className="text-xs text-fg-muted mt-0.5">{it.description}</p>
                    {it.keywords.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {it.keywords.map((k, ki) => (
                          <span key={ki} className="rounded bg-bg/50 px-1.5 py-0.5 text-xs text-fg-muted">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    {it.referenceStyles.length > 0 && (
                      <p className="mt-1 text-xs text-fg-muted">
                        <span className="font-medium">References:</span> {it.referenceStyles.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Style */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" /> {t('moodBoardGenerator.overallStyle')}
              </h3>
              <p className="text-sm text-fg-muted">{result.moodBoard.overallStyle}</p>
            </div>

            {/* Emotional Tone */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4" /> {t('moodBoardGenerator.emotionalTone')}
              </h3>
              <p className="text-sm text-fg-muted">{result.moodBoard.emotionalTone}</p>
            </div>

            {/* Brand Personality */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4" /> {t('moodBoardGenerator.brandPersonality')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.moodBoard.brandPersonality.map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-3 py-1 text-xs font-medium text-brand-accent"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
