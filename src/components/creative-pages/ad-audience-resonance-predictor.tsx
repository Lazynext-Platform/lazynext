'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Target,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Heart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AudienceResonanceResult,
  AudienceSegment,
  EmotionalTrigger,
  ResonanceFactor,
} from '@/lib/creative/ad-audience-resonance-predictor';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function barColor(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function AdAudienceResonancePredictorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [audienceSegments, setAudienceSegments] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AudienceResonanceResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !audienceSegments.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-audience-resonance-predictor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          audienceSegments,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adAudienceResonancePredictor.error'));
      setResult(data.result as AudienceResonanceResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, audienceSegments, platform, t]);

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
          {t('adAudienceResonancePredictor.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" /> {t('adAudienceResonancePredictor.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudienceResonancePredictor.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adAudienceResonancePredictor.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" /> {t('adAudienceResonancePredictor.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudienceResonancePredictor.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aarpContent" className="block text-sm font-medium mb-1">
              {t('adAudienceResonancePredictor.content')}
            </label>
            <textarea
              id="aarpContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('common.phMessage')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aarpProduct" className="block text-sm font-medium mb-1">
              {t('adAudienceResonancePredictor.productOrBrand')}
            </label>
            <input
              id="aarpProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aarpSegments" className="block text-sm font-medium mb-1">
              {t('adAudienceResonancePredictor.audienceSegments')}
            </label>
            <input
              id="aarpSegments"
              type="text"
              value={audienceSegments}
              onChange={(e) => setAudienceSegments(e.target.value)}
              placeholder={t('adAudienceResonancePredictor.audiencePh')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
            <p className="text-xs text-fg-muted mt-1">{t('adAudienceResonancePredictor.commaSeparated')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adAudienceResonancePredictor.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim() || !audienceSegments.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adAudienceResonancePredictor.generating') : `${t('adAudienceResonancePredictor.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adAudienceResonancePredictor.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adAudienceResonancePredictor.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adAudienceResonancePredictor.dryRunNotice')}
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
                {copied ? t('adAudienceResonancePredictor.copied') : t('adAudienceResonancePredictor.copy')}
              </button>
            </div>

            {/* Segment scores */}
            {result.resonance.segmentScores.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-accent" /> {t('adAudienceResonancePredictor.segmentScores')}
                </p>
                {result.resonance.segmentScores.map((s: AudienceSegment, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{s.segment}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${scoreColor(s.score)}`}>{s.score}/100</span>
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">{s.fit}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(s.score)}`}
                        style={{ width: `${s.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{s.notes}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Emotional triggers */}
            {result.resonance.emotionalTriggers.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-danger" /> {t('adAudienceResonancePredictor.emotionalTriggers')}
                </p>
                {result.resonance.emotionalTriggers.map((tr: EmotionalTrigger, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{tr.trigger}</span>
                      <span className={`text-sm font-bold ${scoreColor(tr.effectiveness)}`}>{tr.effectiveness}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(tr.effectiveness)}`}
                        style={{ width: `${tr.effectiveness}%` }}
                      />
                    </div>
                    {tr.segments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tr.segments.map((seg, j) => (
                          <span key={j} className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">
                            {seg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Resonance factors */}
            {result.resonance.resonanceFactors.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adAudienceResonancePredictor.resonanceFactors')}
                </p>
                {result.resonance.resonanceFactors.map((f: ResonanceFactor, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{f.factor.replace(/_/g, ' ')}</span>
                      <span className={`text-sm font-bold ${scoreColor(f.impact)}`}>{f.impact}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(f.impact)}`}
                        style={{ width: `${f.impact}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{f.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Audience fit */}
            {result.resonance.audienceFit && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adAudienceResonancePredictor.audienceFit')}</p>
                <p className="text-sm text-fg-muted">{result.resonance.audienceFit}</p>
              </div>
            )}

            {/* Recommendations */}
            {result.resonance.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adAudienceResonancePredictor.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.resonance.recommendations.map((rec, i) => (
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
