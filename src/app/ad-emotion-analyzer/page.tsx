'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Heart,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  EmotionAnalyzerResult,
  EmotionAnalysis,
} from '@/lib/creative/ad-emotion-analyzer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-fg-muted">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ImpactBar({ value }: { value: number }) {
  const { t } = useI18n();
  const pct = value;
  const color = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-fg-muted">{t('adEmotionAnalyzer.overallEmotionalImpact')}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <div className="h-3 rounded-full bg-bg-secondary overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdEmotionAnalyzerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [adContent, setAdContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EmotionAnalyzerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!adContent.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-emotion-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adContent,
          productOrBrand,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adEmotionAnalyzer.error'));
      setResult(data.result as EmotionAnalyzerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [adContent, productOrBrand, platform, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const a: EmotionAnalysis = result.analysis;
      const lines = [
        `Overall Emotional Impact: ${a.overallEmotionalImpact}/100`,
        `Dominant Emotions: ${a.dominantEmotions.join(', ')}`,
        `Audience Resonance: ${a.audienceResonance}/10 | Authenticity: ${a.authenticity}/10`,
        '',
        `Emotional Journey: ${a.emotionalJourney}`,
        '',
        'Emotion Scores:',
        ...Object.entries(a.emotionScores).map(([k, v]) => `  ${k}: ${v}/100`),
        '',
        'Recommendations:',
        ...a.recommendations.map((r) => `  - ${r}`),
      ];
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
          {t('adEmotionAnalyzer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6" /> {t('adEmotionAnalyzer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adEmotionAnalyzer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adEmotionAnalyzer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6" /> {t('adEmotionAnalyzer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adEmotionAnalyzer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aeaContent" className="block text-sm font-medium mb-1">
              {t('adEmotionAnalyzer.adContent')}
            </label>
            <textarea
              id="aeaContent"
              value={adContent}
              onChange={(e) => setAdContent(e.target.value)}
              placeholder="e.g., When I first tried this serum, I was skeptical. But after two weeks, my skin was glowing. Here's why it changed my routine forever..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aeaProduct" className="block text-sm font-medium mb-1">
              {t('adEmotionAnalyzer.productOrBrand')}
            </label>
            <textarea
              id="aeaProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adEmotionAnalyzer.platform')}</label>
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

          <button
            onClick={generate}
            disabled={loading || !adContent.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adEmotionAnalyzer.analyzing') : `${t('adEmotionAnalyzer.analyze')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adEmotionAnalyzer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adEmotionAnalyzer.analyzing')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adEmotionAnalyzer.dryRunNotice')}
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
                {copied ? t('adEmotionAnalyzer.copied') : t('adEmotionAnalyzer.copy')}
              </button>
            </div>

            {/* Overall impact + dominant emotions */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
              <ImpactBar value={result.analysis.overallEmotionalImpact} />

              <div>
                <p className="text-xs text-fg-muted mb-2">{t('adEmotionAnalyzer.dominantEmotions')}</p>
                <div className="flex flex-wrap gap-2">
                  {result.analysis.dominantEmotions.map((emo, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border bg-brand-accent/10 text-brand-accent border-brand-accent/30 px-2.5 py-1 text-xs font-medium"
                    >
                      <Heart className="w-3 h-3" /> {emo}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-fg-muted mb-1">{t('adEmotionAnalyzer.emotionalJourney')}</p>
                <p className="text-sm text-fg">{result.analysis.emotionalJourney}</p>
              </div>
            </div>

            {/* Emotion scores */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adEmotionAnalyzer.emotionScores')}
              </h2>
              {Object.entries(result.analysis.emotionScores).map(([emo, score]) => (
                <ScoreBar key={emo} label={emo} value={score} max={100} />
              ))}
            </div>

            {/* Resonance + Authenticity */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <ScoreBar label={t('adEmotionAnalyzer.audienceResonance')} value={result.analysis.audienceResonance} />
              <ScoreBar label={t('adEmotionAnalyzer.authenticity')} value={result.analysis.authenticity} />
            </div>

            {/* Recommendations */}
            {result.analysis.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('adEmotionAnalyzer.recommendations')}
                </h2>
                <ul className="space-y-1">
                  {result.analysis.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                      <span className="text-brand-accent flex-shrink-0 mt-0.5">→</span> {r}
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
