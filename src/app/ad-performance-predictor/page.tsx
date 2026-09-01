'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  Sparkles,
  Gauge,
  Target,
  Copy,
  Clock,
  Users,
  Zap,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  PerformancePrediction,
  PerformanceMetric,
  PerformanceFactor,
  ConfidenceLevel,
  FactorImpact,
} from '@/lib/creative/ad-performance-predictor';

const CREDIT_COST = 5;

const PLATFORMS = [
  'tiktok',
  'instagram',
  'youtube',
  'facebook',
  'x',
  'linkedin',
  'snapchat',
  'pinterest',
  'google',
  'reddit',
];

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-success/20 text-success border-success/30',
  A: 'bg-success/20 text-success border-success/30',
  B: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  C: 'bg-warning/20 text-warning border-warning/30',
  D: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  F: 'bg-danger/20 text-danger border-danger/30',
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-danger/20 text-danger border-danger/30',
};

const IMPACT_COLORS: Record<FactorImpact, string> = {
  positive: 'bg-success/20 text-success border-success/30',
  negative: 'bg-danger/20 text-danger border-danger/30',
  neutral: 'bg-bg-tertiary/20 text-fg-muted border-border',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 65) return 'text-brand-accent';
  if (score >= 45) return 'text-warning';
  return 'text-danger';
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-success' : value >= 65 ? 'bg-brand-accent' : value >= 45 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="h-2 w-full rounded-full bg-bg-secondary overflow-hidden">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function AdPerformancePredictorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [briefOrConcept, setBriefOrConcept] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [targetAudience, setTargetAudience] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PerformancePrediction | null>(null);
  const [copied, setCopied] = useState(false);

  const predict = useCallback(async () => {
    if (!briefOrConcept.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-performance-predictor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefOrConcept,
          platform,
          targetAudience: targetAudience.trim() || undefined,
          productCategory: productCategory.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adPerformancePredictor.error'));
      setResult(data.result.prediction as PerformancePrediction);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [briefOrConcept, platform, targetAudience, productCategory, t]);

  const copyToClipboard = useCallback(() => {
    if (!result) return;
    const lines: string[] = [
      `Ad Performance Prediction`,
      `Overall Score: ${result.overallScore} (${result.grade})`,
      `Predicted CTR: ${result.predictedCTR}`,
      `Predicted Engagement: ${result.predictedEngagement}`,
      `Conversion Likelihood: ${result.conversionLikelihood}`,
      `Virality Score: ${result.viralityScore}/100`,
      `Best Posting Time: ${result.bestPostingTime}`,
      `Estimated Reach: ${result.estimatedReach}`,
      '',
      'Strengths:',
      ...result.strengths.map((s) => `- ${s}`),
      '',
      'Risks:',
      ...result.risks.map((r) => `- ${r}`),
      '',
      'Recommendations:',
      ...result.recommendations.map((r) => `- ${r}`),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <main id="main-content" className="mx-auto max-w-5xl px-4 py-16 text-center" tabIndex={-1}>
          <TrendingUp className="mx-auto mb-4 h-10 w-10 text-brand-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">Ad Performance Predictor</h1>
          <p className="text-sm text-fg-faint mb-6">{t('adPerformancePredictor.signInPrompt')}</p>
        </main>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6" tabIndex={-1}>
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> Ad Performance Predictor
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adPerformancePredictor.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="appBrief" className="block text-sm font-medium mb-1">
              {t('adPerformancePredictor.briefOrConcept')}
            </label>
            <textarea
              id="appBrief"
              value={briefOrConcept}
              onChange={(e) => setBriefOrConcept(e.target.value)}
              placeholder="Paste your creative brief or ad concept here... (e.g., 'A 15-second TikTok showing a remote worker struggling with noise, then discovering our noise-cancelling headphones with a bold hook in the first 3 seconds')"
              rows={6}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="appPlatform" className="block text-sm font-medium mb-1">
                {t('adPerformancePredictor.platform')}
              </label>
              <select
                id="appPlatform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="appCategory" className="block text-sm font-medium mb-1">
                {t('adPerformancePredictor.productCategory')}
              </label>
              <input
                id="appCategory"
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="e.g., Electronics, Beauty, SaaS"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="appAudience" className="block text-sm font-medium mb-1">
              {t('adPerformancePredictor.targetAudience')}
            </label>
            <input
              id="appAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Remote workers aged 25-40 in the US"
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={predict}
            disabled={loading || !briefOrConcept.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading
              ? t('adPerformancePredictor.predicting')
              : `${t('adPerformancePredictor.predict')} (${CREDIT_COST} credits)`}
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

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adPerformancePredictor.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adPerformancePredictor.predicting')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Overall score */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Gauge className="w-4 h-4" /> {t('adPerformancePredictor.overallScore')}
                </h3>
                <button
                  onClick={copyToClipboard}
                  className="rounded-lg border border-border bg-bg-secondary px-3 py-1 text-xs font-medium hover:opacity-80 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? t('adPerformancePredictor.copied') : t('adPerformancePredictor.copy')}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${scoreColor(result.overallScore)}`}>
                  {result.overallScore}
                </div>
                <div className="space-y-1">
                  <span
                    className={`inline-block text-sm font-medium px-2 py-0.5 rounded-full border ${GRADE_COLORS[result.grade] || GRADE_COLORS.F}`}
                  >
                    {t('adPerformancePredictor.grade')}: {result.grade}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {t('adPerformancePredictor.viralityScore')}: {result.viralityScore}/100
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={result.overallScore} />
              </div>
            </div>

            {/* Key predictions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm font-medium">{t('adPerformancePredictor.predictedCTR')}</span>
                </div>
                <p className="text-lg font-semibold">{result.predictedCTR}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm font-medium">{t('adPerformancePredictor.predictedEngagement')}</span>
                </div>
                <p className="text-lg font-semibold">{result.predictedEngagement}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm font-medium">{t('adPerformancePredictor.conversionLikelihood')}</span>
                </div>
                <p className="text-lg font-semibold">{result.conversionLikelihood}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm font-medium">{t('adPerformancePredictor.viralityScore')}</span>
                </div>
                <p className="text-lg font-semibold">{result.viralityScore}/100</p>
              </div>
            </div>

            {/* Posting time & reach */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-brand-accent flex-shrink-0" />
                <div>
                  <p className="text-xs text-fg-muted">{t('adPerformancePredictor.bestPostingTime')}</p>
                  <p className="text-sm font-medium">{result.bestPostingTime}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-brand-accent flex-shrink-0" />
                <div>
                  <p className="text-xs text-fg-muted">{t('adPerformancePredictor.estimatedReach')}</p>
                  <p className="text-sm font-medium">{result.estimatedReach}</p>
                </div>
              </div>
            </div>

            {/* Metrics table */}
            {result.metrics && result.metrics.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <Gauge className="w-4 h-4" /> {t('adPerformancePredictor.metrics')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-fg-muted border-b border-border">
                        <th className="pb-2 pr-3 font-medium">Metric</th>
                        <th className="pb-2 pr-3 font-medium">Predicted</th>
                        <th className="pb-2 pr-3 font-medium">Score</th>
                        <th className="pb-2 pr-3 font-medium">Confidence</th>
                        <th className="pb-2 pr-3 font-medium">Benchmark</th>
                        <th className="pb-2 font-medium">Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.metrics.map((m: PerformanceMetric, i: number) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 font-medium">{m.name}</td>
                          <td className="py-2 pr-3">{m.predictedValue}</td>
                          <td className={`py-2 pr-3 ${scoreColor(m.score)}`}>{m.score}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CONFIDENCE_COLORS[m.confidence]}`}
                            >
                              {m.confidence}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-fg-muted">{m.benchmark}</td>
                          <td className="py-2 text-fg-muted">{m.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Factors analysis */}
            {result.factors && result.factors.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <Gauge className="w-4 h-4" /> {t('adPerformancePredictor.factors')}
                </h3>
                <div className="space-y-3">
                  {result.factors.map((f: PerformanceFactor, i: number) => (
                    <div key={i} className="border-l-2 border-border pl-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium">{f.factor}</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[f.impact]}`}
                        >
                          {f.impact}
                        </span>
                        <span className="text-xs text-fg-muted">weight: {f.weight}</span>
                      </div>
                      <p className="text-xs text-fg-muted">{f.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Risks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.strengths && result.strengths.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-4 h-4 text-success" /> {t('adPerformancePredictor.strengths')}
                  </h3>
                  <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.risks && result.risks.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium flex items-center gap-2 mb-3">
                    <ThumbsDown className="w-4 h-4 text-danger" /> {t('adPerformancePredictor.risks')}
                  </h3>
                  <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                    {result.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" /> {t('adPerformancePredictor.recommendations')}
                </h3>
                <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                  {result.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
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
