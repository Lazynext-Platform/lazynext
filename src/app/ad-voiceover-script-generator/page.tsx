'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Mic,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdVoiceoverScriptGeneratorResult,
  VoiceoverSegment,
} from '@/lib/creative/ad-voiceover-script-generator';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const TONES = ['friendly', 'professional', 'energetic', 'calm', 'authoritative', 'conversational'] as const;

export default function AdVoiceoverScriptGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [tone, setTone] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdVoiceoverScriptGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-voiceover-script-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          tone: tone || undefined,
          duration,
          targetAudience: targetAudience || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adVoiceoverScriptGenerator.error'));
      setResult(data.result as AdVoiceoverScriptGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, tone, duration, targetAudience, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = `${result.script.title}\n\n${result.script.fullScript}\n\n` +
        result.script.segments
          .map(
            (s) =>
              `[Segment ${s.segmentNumber}] (${s.timing}s)\n${s.text}\nDirection: ${s.direction}\nEmphasis: ${s.emphasis.join(', ')}\nPause after: ${s.pauseAfter}s`,
          )
          .join('\n\n');
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
          {t('adVoiceoverScriptGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> {t('adVoiceoverScriptGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adVoiceoverScriptGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adVoiceoverScriptGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> {t('adVoiceoverScriptGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adVoiceoverScriptGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="avsProduct" className="block text-sm font-medium mb-1">
              {t('adVoiceoverScriptGenerator.productOrBrand')}
            </label>
            <textarea
              id="avsProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adVoiceoverScriptGenerator.platform')}</label>
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
            <label className="block text-sm font-medium mb-2">{t('adVoiceoverScriptGenerator.tone')}</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((tn) => (
                <button
                  key={tn}
                  type="button"
                  onClick={() => setTone(tone === tn ? '' : tn)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    tone === tn
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {tn}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="avsDuration" className="block text-sm font-medium mb-1">
                {t('adVoiceoverScriptGenerator.duration')}
              </label>
              <input
                id="avsDuration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={10}
                max={120}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="avsAudience" className="block text-sm font-medium mb-1">
                {t('adVoiceoverScriptGenerator.targetAudience')}
              </label>
              <input
                id="avsAudience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., millennial skincare enthusiasts"
                maxLength={1000}
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
            {loading ? t('adVoiceoverScriptGenerator.generating') : `${t('adVoiceoverScriptGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adVoiceoverScriptGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adVoiceoverScriptGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adVoiceoverScriptGenerator.dryRunNotice')}
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
                {copied ? t('adVoiceoverScriptGenerator.copied') : t('adVoiceoverScriptGenerator.copy')}
              </button>
            </div>

            {/* Script header */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <h2 className="text-lg font-semibold">{result.script.title}</h2>
              <div className="flex flex-wrap gap-3 text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {result.script.totalDuration}s
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {result.script.wordsPerMinute} WPM
                </span>
              </div>
              <p className="text-sm text-fg-muted">{result.script.toneNotes}</p>
            </div>

            {/* Full script */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-sm leading-relaxed">{result.script.fullScript}</p>
            </div>

            {/* Segment breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('adVoiceoverScriptGenerator.segments')}</h3>
              {result.script.segments.map((seg: VoiceoverSegment, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-medium text-brand-accent">
                      {t('adVoiceoverScriptGenerator.segment')} {seg.segmentNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                      <Clock className="w-3 h-3" /> {seg.timing}s
                      {seg.pauseAfter > 0 && <span className="ml-1">+ {seg.pauseAfter}s pause</span>}
                    </span>
                  </div>
                  <p className="text-sm">{seg.text}</p>
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium text-fg">{t('adVoiceoverScriptGenerator.direction')}:</span> {seg.direction}
                  </p>
                  {seg.emphasis.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {seg.emphasis.map((em, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2 py-0.5 text-xs text-brand-accent"
                        >
                          {em}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
