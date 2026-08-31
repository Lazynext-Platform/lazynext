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
  Award,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  VoiceConsistencyResult,
  VoiceDimension,
  VoiceViolation,
  DimensionStatus,
  ViolationSeverity,
} from '@/lib/creative/brand-voice-consistency-checker';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const STATUS_COLORS: Record<DimensionStatus, string> = {
  pass: 'bg-success/20 text-success border-success/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  fail: 'bg-danger/20 text-danger border-danger/30',
};

const SEVERITY_COLORS: Record<ViolationSeverity, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-success',
  A: 'text-success',
  B: 'text-brand-accent',
  C: 'text-warning',
  D: 'text-danger',
  F: 'text-danger',
};

export default function BrandVoiceConsistencyCheckerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandVoiceDescription, setBrandVoiceDescription] = useState('');
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VoiceConsistencyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const check = useCallback(async () => {
    if (!content.trim() || !brandName.trim() || !brandVoiceDescription.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/brand-voice-consistency-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          brandName,
          brandVoiceDescription,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('brandVoiceConsistencyChecker.error'));
      setResult(data.result as VoiceConsistencyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, brandName, brandVoiceDescription, platform, t]);

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
          {t('brandVoiceConsistencyChecker.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> {t('brandVoiceConsistencyChecker.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandVoiceConsistencyChecker.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('brandVoiceConsistencyChecker.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> {t('brandVoiceConsistencyChecker.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandVoiceConsistencyChecker.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="bvccContent" className="block text-sm font-medium mb-1">
              {t('brandVoiceConsistencyChecker.content')}
            </label>
            <textarea
              id="bvccContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., HEY FAM! Check out our AMAZING new product LOL you will LOVE it!!!"
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="bvccBrand" className="block text-sm font-medium mb-1">
              {t('brandVoiceConsistencyChecker.brandName')}
            </label>
            <input
              id="bvccBrand"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g., Lumina Skincare"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="bvccVoice" className="block text-sm font-medium mb-1">
              {t('brandVoiceConsistencyChecker.brandVoiceDescription')}
            </label>
            <textarea
              id="bvccVoice"
              value={brandVoiceDescription}
              onChange={(e) => setBrandVoiceDescription(e.target.value)}
              placeholder="e.g., Professional, warm, and science-backed. Uses clear, accessible language. Avoids slang and excessive punctuation."
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('brandVoiceConsistencyChecker.platform')}</label>
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
            onClick={check}
            disabled={loading || !content.trim() || !brandName.trim() || !brandVoiceDescription.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('brandVoiceConsistencyChecker.checking') : `${t('brandVoiceConsistencyChecker.check')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('brandVoiceConsistencyChecker.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('brandVoiceConsistencyChecker.checking')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('brandVoiceConsistencyChecker.dryRunNotice')}
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
                {copied ? t('brandVoiceConsistencyChecker.copied') : t('brandVoiceConsistencyChecker.copy')}
              </button>
            </div>

            {/* Overall score + grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-xs text-fg-muted mb-1">{t('brandVoiceConsistencyChecker.overallConsistency')}</div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{result.check.overallConsistency}</span>
                  <span className="text-sm text-fg-muted">/ 100</span>
                </div>
                <div className="w-full bg-bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="bg-brand-accent rounded-full h-2 transition-all"
                    style={{ width: `${result.check.overallConsistency}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4 flex flex-col items-center justify-center">
                <div className="text-xs text-fg-muted mb-1">{t('brandVoiceConsistencyChecker.grade')}</div>
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  <span className={`text-3xl font-bold ${GRADE_COLORS[result.check.grade] || 'text-fg'}`}>
                    {result.check.grade}
                  </span>
                </div>
              </div>
            </div>

            {/* Alignment metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('brandVoiceConsistencyChecker.brandAlignment')}</div>
                <span className="text-lg font-bold">{result.check.brandAlignment}/10</span>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('brandVoiceConsistencyChecker.toneMatch')}</div>
                <span className="text-lg font-bold">{result.check.toneMatch}/10</span>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('brandVoiceConsistencyChecker.vocabularyAlignment')}</div>
                <span className="text-lg font-bold">{result.check.vocabularyAlignment}/10</span>
              </div>
            </div>

            {/* Voice dimensions */}
            {result.check.voiceDimensions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-3">{t('brandVoiceConsistencyChecker.voiceDimensions')}</div>
                <div className="space-y-2">
                  {result.check.voiceDimensions.map((dim: VoiceDimension, i: number) => (
                    <div key={i} className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium w-24 flex-shrink-0">{dim.dimension}</span>
                      <div className="flex-1 min-w-20 bg-bg-secondary rounded-full h-2">
                        <div
                          className={`rounded-full h-2 transition-all ${
                            dim.status === 'pass' ? 'bg-success' : dim.status === 'warning' ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right">{dim.score}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[dim.status] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {dim.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Violations */}
            {result.check.violations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-3">{t('brandVoiceConsistencyChecker.violations')}</div>
                <div className="space-y-2">
                  {result.check.violations.map((violation: VoiceViolation, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-bg-secondary px-3 py-2">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium">{violation.type}</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[violation.severity] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                          {violation.severity}
                        </span>
                      </div>
                      {violation.excerpt && (
                        <div className="text-xs text-fg-muted mb-1">
                          <span className="text-fg-muted">{t('brandVoiceConsistencyChecker.excerpt')}:</span>{' '}
                          <span className="italic">&ldquo;{violation.excerpt}&rdquo;</span>
                        </div>
                      )}
                      {violation.suggestion && (
                        <div className="text-xs">
                          <span className="text-fg-muted">{t('brandVoiceConsistencyChecker.suggestion')}:</span>{' '}
                          <span className="text-brand-accent">{violation.suggestion}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corrected content */}
            {result.check.correctedContent && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('brandVoiceConsistencyChecker.correctedContent')}</div>
                <p className="text-sm">{result.check.correctedContent}</p>
              </div>
            )}

            {/* Recommendations */}
            {result.check.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('brandVoiceConsistencyChecker.recommendations')}</div>
                <ul className="space-y-1">
                  {result.check.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" /> {rec}
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
