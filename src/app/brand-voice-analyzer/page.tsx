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
  ThumbsUp,
  ThumbsDown,
  Award,
  Tag,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  BrandVoiceAnalyzerResult,
  VoiceProfile,
  BrandTone,
} from '@/lib/creative/brand-voice-analyzer';

const CREDIT_COST = 4;

const TONE_COLORS: Record<BrandTone, string> = {
  formal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  casual: 'bg-success/20 text-success border-success/30',
  playful: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  authoritative: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

function scoreColor(s: number): string {
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-brand-accent';
  if (s >= 40) return 'text-warning';
  return 'text-danger';
}

export default function BrandVoiceAnalyzerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [brandName, setBrandName] = useState('');
  const [sampleContent, setSampleContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BrandVoiceAnalyzerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const analyze = useCallback(async () => {
    if (!brandName.trim() || sampleContent.trim().length < 100) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/brand-voice-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          sampleContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('brandVoiceAnalyzer.error'));
      setResult(data.result as BrandVoiceAnalyzerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [brandName, sampleContent, t]);

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

  const charCount = sampleContent.length;
  const minMet = charCount >= 100;

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('brandVoiceAnalyzer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> {t('brandVoiceAnalyzer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandVoiceAnalyzer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('brandVoiceAnalyzer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> {t('brandVoiceAnalyzer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandVoiceAnalyzer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="bvBrand" className="block text-sm font-medium mb-1">
              {t('brandVoiceAnalyzer.brandName')}
            </label>
            <input
              id="bvBrand"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g., Glow & Co."
              maxLength={200}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="bvSample" className="block text-sm font-medium mb-1">
              {t('brandVoiceAnalyzer.sampleContent')}
            </label>
            <textarea
              id="bvSample"
              value={sampleContent}
              onChange={(e) => setSampleContent(e.target.value)}
              placeholder="Paste 100+ characters of your brand's content — website copy, ad captions, social posts, emails…"
              rows={8}
              maxLength={10000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
            <div className={`mt-1 text-xs ${minMet ? 'text-success' : 'text-fg-muted'}`}>
              {charCount} / 100 {minMet ? '✓' : `(${t('brandVoiceAnalyzer.minChars')})`}
            </div>
          </div>

          <button
            onClick={analyze}
            disabled={loading || !brandName.trim() || !minMet}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('brandVoiceAnalyzer.analyzing') : `${t('brandVoiceAnalyzer.analyze')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('brandVoiceAnalyzer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('brandVoiceAnalyzer.analyzing')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('brandVoiceAnalyzer.dryRunNotice')}
              </div>
            )}

            {(() => {
              const vp: VoiceProfile = result.voiceProfile;
              return (
                <>
                  {/* Tone + score header */}
                  <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Award className="w-5 h-5 text-brand-accent" />
                      <h2 className="font-medium">{result.brandName}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TONE_COLORS[vp.tone] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {vp.tone}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className="text-xs text-fg-muted">{t('brandVoiceAnalyzer.consistencyScore')}:</span>
                        <span className={`text-lg font-bold ${scoreColor(vp.consistencyScore)}`}>{vp.consistencyScore}</span>
                        <span className={`text-sm font-bold ${scoreColor(vp.consistencyScore)}`}>{vp.grade}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-fg-muted">{t('brandVoiceAnalyzer.vocabularyLevel')}:</span>{' '}
                        <span className="font-medium">{vp.vocabularyLevel}</span>
                      </div>
                      <div>
                        <span className="text-fg-muted">{t('brandVoiceAnalyzer.sentenceStructure')}:</span>{' '}
                        <span className="font-medium">{vp.sentenceStructure}</span>
                      </div>
                    </div>

                    {vp.personalityTraits.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-fg-muted mb-1 flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" /> {t('brandVoiceAnalyzer.personalityTraits')}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {vp.personalityTraits.map((trait, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full border border-border bg-bg-secondary">
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Copy button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t('brandVoiceAnalyzer.copied') : t('brandVoiceAnalyzer.copy')}
                    </button>
                  </div>

                  {/* Do / Don't lists */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                      <div className="text-sm font-medium mb-2 flex items-center gap-1.5 text-success">
                        <ThumbsUp className="w-4 h-4" /> {t('brandVoiceAnalyzer.doList')}
                      </div>
                      <ul className="text-xs space-y-1.5 pl-5 list-disc text-fg-muted">
                        {vp.doList.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                      <div className="text-sm font-medium mb-2 flex items-center gap-1.5 text-danger">
                        <ThumbsDown className="w-4 h-4" /> {t('brandVoiceAnalyzer.dontList')}
                      </div>
                      <ul className="text-xs space-y-1.5 pl-5 list-disc text-fg-muted">
                        {vp.dontList.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
