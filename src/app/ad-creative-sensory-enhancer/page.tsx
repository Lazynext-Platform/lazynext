'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Eye,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SensoryEnhancerResult,
  SensoryAddition,
  SenseEnhancement,
  AdditionImpact,
} from '@/lib/creative/ad-creative-sensory-enhancer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const SENSES = ['visual', 'auditory', 'tactile', 'olfactory', 'gustatory'] as const;

const IMPACT_COLORS: Record<AdditionImpact, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function AdCreativeSensoryEnhancerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetSense, setTargetSense] = useState<string>('visual');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SensoryEnhancerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-sensory-enhancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          targetSense,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeSensoryEnhancer.error'));
      setResult(data.result as SensoryEnhancerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, targetSense, platform, t]);

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
          {t('adCreativeSensoryEnhancer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6" /> {t('adCreativeSensoryEnhancer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSensoryEnhancer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeSensoryEnhancer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6" /> {t('adCreativeSensoryEnhancer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSensoryEnhancer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acseContent" className="block text-sm font-medium mb-1">
              {t('adCreativeSensoryEnhancer.content')}
            </label>
            <textarea
              id="acseContent"
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
            <label htmlFor="acseProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeSensoryEnhancer.productOrBrand')}
            </label>
            <input
              id="acseProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adCreativeSensoryEnhancer.targetSense')}</label>
            <div className="flex flex-wrap gap-2">
              {SENSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetSense(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    targetSense === s
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeSensoryEnhancer.platform')}</label>
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
            {loading ? t('adCreativeSensoryEnhancer.generating') : `${t('adCreativeSensoryEnhancer.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeSensoryEnhancer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeSensoryEnhancer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeSensoryEnhancer.dryRunNotice')}
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
                {copied ? t('adCreativeSensoryEnhancer.copied') : t('adCreativeSensoryEnhancer.copy')}
              </button>
            </div>

            {/* Enhanced content */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-sm font-medium mb-2">{t('adCreativeSensoryEnhancer.enhancedContent')}</p>
              <p className="text-sm text-fg whitespace-pre-wrap">{result.analysis.enhancedContent}</p>
            </div>

            {/* Sensory score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('adCreativeSensoryEnhancer.sensoryScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.analysis.sensoryScore)}`}>
                    {result.analysis.sensoryScore}<span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${result.analysis.sensoryScore >= 75 ? 'bg-success' : result.analysis.sensoryScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                  style={{ width: `${result.analysis.sensoryScore}%` }}
                />
              </div>
            </div>

            {/* Sensory additions */}
            {result.analysis.additions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('adCreativeSensoryEnhancer.additions')}</p>
                {result.analysis.additions.map((add: SensoryAddition, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{add.sense}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[add.impact] || IMPACT_COLORS.medium}`}>{add.impact}</span>
                    </div>
                    <p className="text-sm text-fg">&ldquo;{add.text}&rdquo;</p>
                    <p className="text-xs text-fg-muted">{add.position}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sense enhancements before/after */}
            {result.analysis.enhancements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('adCreativeSensoryEnhancer.enhancements')}</p>
                {result.analysis.enhancements.map((enh: SenseEnhancement, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <span className="text-xs font-medium text-fg">{enh.sense}</span>
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-fg-muted mb-1">before</p>
                        <p className="text-xs text-fg-muted line-through">{enh.before}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-brand-accent flex-shrink-0 mt-5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-fg-muted mb-1">after</p>
                        <p className="text-xs text-fg">{enh.after}</p>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{enh.improvement}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.analysis.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeSensoryEnhancer.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.analysis.recommendations.map((rec, i) => (
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
