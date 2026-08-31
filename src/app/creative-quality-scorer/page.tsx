'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Gauge,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  QualityScorerResult,
  QualityDimension,
  QualityIssue,
  QualityGrade,
  IssueSeverity,
} from '@/lib/creative/creative-quality-scorer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const CONTENT_TYPES = ['video-script', 'image-ad', 'carousel', 'story', 'text-ad'] as const;

const GRADE_COLORS: Record<QualityGrade, string> = {
  'A+': 'bg-success/20 text-success border-success/30',
  A: 'bg-success/20 text-success border-success/30',
  B: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  C: 'bg-warning/20 text-warning border-warning/30',
  D: 'bg-danger/20 text-danger border-danger/30',
  F: 'bg-danger/20 text-danger border-danger/30',
};

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
  critical: 'bg-danger/30 text-danger border-danger/40',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function CreativeQualityScorerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [contentType, setContentType] = useState<string>('text-ad');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<QualityScorerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-quality-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          contentType,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeQualityScorer.error'));
      setResult(data.result as QualityScorerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, contentType, platform, t]);

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
          {t('creativeQualityScorer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6" /> {t('creativeQualityScorer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeQualityScorer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeQualityScorer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6" /> {t('creativeQualityScorer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeQualityScorer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cqsContent" className="block text-sm font-medium mb-1">
              {t('creativeQualityScorer.content')}
            </label>
            <textarea
              id="cqsContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Tired of dull skin? Our vitamin C serum brightens in just 7 days..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cqsProduct" className="block text-sm font-medium mb-1">
              {t('creativeQualityScorer.productOrBrand')}
            </label>
            <input
              id="cqsProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeQualityScorer.contentType')}</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setContentType(ct)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    contentType === ct
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeQualityScorer.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeQualityScorer.generating') : `${t('creativeQualityScorer.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeQualityScorer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeQualityScorer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeQualityScorer.dryRunNotice')}
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
                {copied ? t('creativeQualityScorer.copied') : t('creativeQualityScorer.copy')}
              </button>
            </div>

            {/* Overall score + grade */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-brand-accent" />
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('creativeQualityScorer.overallScore')}</p>
                    <p className={`text-3xl font-bold ${scoreColor(result.scoring.overallScore)}`}>{result.scoring.overallScore}<span className="text-sm text-fg-muted">/100</span></p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-fg-muted mb-1">{t('creativeQualityScorer.grade')}</p>
                  <span className={`inline-flex items-center text-2xl font-bold px-4 py-1 rounded-lg border ${GRADE_COLORS[result.scoring.grade] || GRADE_COLORS.C}`}>
                    {result.scoring.grade}
                  </span>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            {result.scoring.dimensions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeQualityScorer.dimensions')}</p>
                {result.scoring.dimensions.map((d: QualityDimension, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{d.dimension.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${scoreColor(d.score)}`}>{d.score}/100</span>
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">{d.status}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.score >= 75 ? 'bg-success' : d.score >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{d.notes}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Issues */}
            {result.scoring.issues.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> {t('creativeQualityScorer.issues')}
                </p>
                {result.scoring.issues.map((issue: QualityIssue, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{issue.type.replace(/_/g, ' ')}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.medium}`}>{issue.severity}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{issue.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-success">{t('creativeQualityScorer.fix')}:</span> {issue.fix}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths + Improvement suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.scoring.strengths.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <p className="text-sm font-medium mb-2">{t('creativeQualityScorer.strengths')}</p>
                  <ul className="space-y-1.5">
                    {result.scoring.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.scoring.improvementSuggestions.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <p className="text-sm font-medium mb-2">{t('creativeQualityScorer.improvementSuggestions')}</p>
                  <ul className="space-y-1.5">
                    {result.scoring.improvementSuggestions.map((s, i) => (
                      <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-brand-accent flex-shrink-0 mt-0.5" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {result.scoring.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeQualityScorer.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.scoring.recommendations.map((rec, i) => (
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
