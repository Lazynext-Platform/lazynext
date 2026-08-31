'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Waves,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Clock,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  TensionReleaseDesignerResult,
  TensionReleaseCycle,
} from '@/lib/creative/ad-creative-tension-release-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const CYCLE_TYPE_COLORS: Record<string, string> = {
  slow_build_sudden_release: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  rapid_escalation_catharsis: 'bg-danger/20 text-danger border-danger/30',
  wave_pattern: 'bg-success/20 text-success border-success/30',
  spiral_escalation: 'bg-warning/20 text-warning border-warning/30',
  plateau_break: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  rhythmic_pulse: 'bg-success/20 text-success border-success/30',
  tension_plateau_release: 'bg-warning/20 text-warning border-warning/30',
  crescendo_finale: 'bg-danger/20 text-danger border-danger/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function scoreBar(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function AdCreativeTensionReleaseDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TensionReleaseDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-tension-release-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeTensionReleaseDesigner.error'));
      setResult(data.result as TensionReleaseDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, targetAudience, platform, t]);

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
          {t('adCreativeTensionReleaseDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Waves className="w-6 h-6" /> {t('adCreativeTensionReleaseDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeTensionReleaseDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeTensionReleaseDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Waves className="w-6 h-6" /> {t('adCreativeTensionReleaseDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeTensionReleaseDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="actrdProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeTensionReleaseDesigner.productOrBrand')}
            </label>
            <input
              id="actrdProduct"
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
            <label htmlFor="actrdContent" className="block text-sm font-medium mb-1">
              {t('adCreativeTensionReleaseDesigner.content')}
            </label>
            <textarea
              id="actrdContent"
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
            <label htmlFor="actrdAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeTensionReleaseDesigner.targetAudience')}
            </label>
            <input
              id="actrdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeTensionReleaseDesigner.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !content.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeTensionReleaseDesigner.generating') : `${t('adCreativeTensionReleaseDesigner.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeTensionReleaseDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeTensionReleaseDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeTensionReleaseDesigner.dryRunNotice')}
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
                {copied ? t('adCreativeTensionReleaseDesigner.copied') : t('adCreativeTensionReleaseDesigner.copy')}
              </button>
            </div>

            {/* Cycles */}
            {result.strategy.cycles.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('adCreativeTensionReleaseDesigner.cycles')}</p>
                {result.strategy.cycles.map((cycle: TensionReleaseCycle, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${CYCLE_TYPE_COLORS[cycle.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {cycle.type.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                        <Clock className="w-3 h-3" /> {cycle.timing}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('adCreativeTensionReleaseDesigner.tensionBuild')}</p>
                        <p className="text-sm text-fg">{cycle.tensionBuild}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('adCreativeTensionReleaseDesigner.releaseMoment')}</p>
                        <p className="text-sm text-fg">{cycle.releaseMoment}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {t('adCreativeTensionReleaseDesigner.emotionalRelief')}
                        </p>
                        <p className="text-sm text-fg">{cycle.emotionalRelief}</p>
                      </div>
                    </div>

                    {/* Catharsis score bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {t('adCreativeTensionReleaseDesigner.catharsisScore')}
                        </span>
                        <span className={`text-sm font-bold ${scoreColor(cycle.catharsisScore)}`}>{cycle.catharsisScore}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(cycle.catharsisScore)}`}
                          style={{ width: `${cycle.catharsisScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Viewer satisfaction bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('adCreativeTensionReleaseDesigner.viewerSatisfaction')}</span>
                        <span className={`text-sm font-bold ${scoreColor(cycle.viewerSatisfaction)}`}>{cycle.viewerSatisfaction}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(cycle.viewerSatisfaction)}`}
                          style={{ width: `${cycle.viewerSatisfaction}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeTensionReleaseDesigner.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.strategy.recommendations.map((rec, i) => (
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
