'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  ThumbsUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ConceptValidatorResult,
  ConceptValidation,
  ConceptIssue,
  IssueSeverity,
} from '@/lib/creative/creative-concept-validator';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-success/20 text-success border-success/30',
};

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-success',
  A: 'text-success',
  'A-': 'text-success',
  'B+': 'text-brand-accent',
  B: 'text-brand-accent',
  'B-': 'text-brand-accent',
  'C+': 'text-warning',
  C: 'text-warning',
  'C-': 'text-warning',
  'D+': 'text-warning',
  D: 'text-danger',
  'D-': 'text-danger',
  F: 'text-danger',
};

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

export default function CreativeConceptValidatorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [concept, setConcept] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ConceptValidatorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!concept.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-concept-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept,
          productOrBrand,
          platform: platform || undefined,
          targetAudience: targetAudience || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeConceptValidator.error'));
      setResult(data.result as ConceptValidatorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [concept, productOrBrand, platform, targetAudience, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const v: ConceptValidation = result.validation;
      const lines = [
        `Overall Score: ${v.overallScore}/100 (Grade: ${v.grade})`,
        `Platform Fit: ${v.platformFit}/10 | Brand Safety: ${v.brandSafety}/10 | Engagement: ${v.engagementPotential}/10 | Clarity: ${v.clarity}/10 | Originality: ${v.originality}/10`,
        '',
        `Verdict: ${v.verdict}`,
        '',
        'Issues:',
        ...v.issues.map((i) => `  [${i.severity}] ${i.description} → ${i.suggestion}`),
        '',
        'Strengths:',
        ...v.strengths.map((s) => `  - ${s}`),
        '',
        'Recommendations:',
        ...v.recommendations.map((r) => `  - ${r}`),
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
          {t('creativeConceptValidator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> {t('creativeConceptValidator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeConceptValidator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeConceptValidator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> {t('creativeConceptValidator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeConceptValidator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ccvConcept" className="block text-sm font-medium mb-1">
              {t('creativeConceptValidator.concept')}
            </label>
            <textarea
              id="ccvConcept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g., A 15-second TikTok video showing a before-and-after transformation using our vitamin C serum, with a curiosity hook and UGC-style authenticity"
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="ccvProduct" className="block text-sm font-medium mb-1">
              {t('creativeConceptValidator.productOrBrand')}
            </label>
            <textarea
              id="ccvProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('creativeConceptValidator.platform')}</label>
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

            <div>
              <label htmlFor="ccvAudience" className="block text-sm font-medium mb-1">
                {t('creativeConceptValidator.targetAudience')}
              </label>
              <input
                id="ccvAudience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Health-conscious women aged 25-40"
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !concept.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeConceptValidator.validating') : `${t('creativeConceptValidator.validate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeConceptValidator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeConceptValidator.validating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeConceptValidator.dryRunNotice')}
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
                {copied ? t('creativeConceptValidator.copied') : t('creativeConceptValidator.copy')}
              </button>
            </div>

            {/* Overall score + grade */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-fg-muted">{t('creativeConceptValidator.overallScore')}</p>
                  <p className="text-3xl font-bold">{result.validation.overallScore}<span className="text-sm text-fg-muted">/100</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-fg-muted">{t('creativeConceptValidator.grade')}</p>
                  <p className={`text-3xl font-bold ${GRADE_COLORS[result.validation.grade] || 'text-fg'}`}>{result.validation.grade}</p>
                </div>
              </div>
              <p className="text-sm text-fg-muted mt-2">{result.validation.verdict}</p>
            </div>

            {/* Score bars */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <ScoreBar label={t('creativeConceptValidator.platformFit')} value={result.validation.platformFit} />
              <ScoreBar label={t('creativeConceptValidator.brandSafety')} value={result.validation.brandSafety} />
              <ScoreBar label={t('creativeConceptValidator.engagementPotential')} value={result.validation.engagementPotential} />
              <ScoreBar label={t('creativeConceptValidator.clarity')} value={result.validation.clarity} />
              <ScoreBar label={t('creativeConceptValidator.originality')} value={result.validation.originality} />
            </div>

            {/* Issues */}
            {result.validation.issues.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> {t('creativeConceptValidator.issues')}
                </h2>
                {result.validation.issues.map((issue: ConceptIssue, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[issue.severity]}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-xs text-fg">{issue.description}</p>
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">{t('creativeConceptValidator.suggestion')}:</span> {issue.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths */}
            {result.validation.strengths.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-success" /> {t('creativeConceptValidator.strengths')}
                </h2>
                <ul className="space-y-1">
                  {result.validation.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.validation.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeConceptValidator.recommendations')}
                </h2>
                <ul className="space-y-1">
                  {result.validation.recommendations.map((r, i) => (
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
