'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  GitBranch,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Clock,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CreativeSequencerResult,
  SequenceStage,
  CampaignGoal,
} from '@/lib/creative/ad-creative-sequencer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const GOALS: CampaignGoal[] = ['awareness', 'engagement', 'conversions', 'traffic', 'app_installs'];

export default function AdCreativeSequencerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>('awareness');
  const [creativeCount, setCreativeCount] = useState<number>(4);
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreativeSequencerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-sequencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          campaignGoal,
          creativeCount,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeSequencer.error'));
      setResult(data.result as CreativeSequencerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, campaignGoal, creativeCount, platform, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const lines: string[] = [];
      lines.push(`Narrative Arc: ${result.sequence.narrativeArc}`);
      lines.push(`Total Duration: ${result.sequence.totalDuration} days`);
      lines.push('');
      for (const stage of result.sequence.stages) {
        lines.push(`Stage ${stage.order}: ${stage.name}`);
        lines.push(`  Purpose: ${stage.purpose}`);
        lines.push(`  Brief: ${stage.creativeBrief}`);
        lines.push(`  Duration: ${stage.durationDays} days`);
        lines.push(`  Expected Impact: ${stage.expectedImpact}`);
        lines.push(`  Transition: ${stage.transitionToNext}`);
        lines.push('');
      }
      lines.push(`Touchpoint Strategy: ${result.sequence.touchpointStrategy}`);
      lines.push('Recommendations:');
      for (const rec of result.sequence.recommendations) {
        lines.push(`  - ${rec}`);
      }
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
          {t('adCreativeSequencer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6" /> {t('adCreativeSequencer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSequencer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeSequencer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6" /> {t('adCreativeSequencer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSequencer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acsProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeSequencer.productOrBrand')}
            </label>
            <textarea
              id="acsProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adCreativeSequencer.campaignGoal')}</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setCampaignGoal(g)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    campaignGoal === g
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="acsCount" className="block text-sm font-medium mb-1">
                {t('adCreativeSequencer.creativeCount')}
              </label>
              <input
                id="acsCount"
                type="number"
                value={creativeCount}
                onChange={(e) => setCreativeCount(Number(e.target.value))}
                min={2}
                max={8}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('adCreativeSequencer.platform')}</label>
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
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeSequencer.generating') : `${t('adCreativeSequencer.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeSequencer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeSequencer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeSequencer.dryRunNotice')}
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
                {copied ? t('adCreativeSequencer.copied') : t('adCreativeSequencer.copy')}
              </button>
            </div>

            {/* Narrative arc + total duration summary */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('adCreativeSequencer.narrativeArc')}</p>
                  <p className="text-sm mt-1">{result.sequence.narrativeArc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <p className="text-sm">
                  <span className="text-fg-muted">{t('adCreativeSequencer.totalDuration')}: </span>
                  <span className="font-medium">{result.sequence.totalDuration} {t('adCreativeSequencer.days')}</span>
                </p>
              </div>
            </div>

            {/* Stages */}
            <div className="space-y-3">
              {result.sequence.stages.map((stage: SequenceStage, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold">
                      {stage.order}
                    </span>
                    <h2 className="text-sm font-bold">{stage.name}</h2>
                    <span className="inline-flex items-center gap-1 text-xs text-fg-muted ml-auto">
                      <Clock className="w-3 h-3" /> {stage.durationDays} {t('adCreativeSequencer.days')}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('adCreativeSequencer.purpose')}</p>
                    <p className="text-sm mt-0.5">{stage.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('adCreativeSequencer.creativeBrief')}</p>
                    <p className="text-sm mt-0.5">{stage.creativeBrief}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('adCreativeSequencer.expectedImpact')}</p>
                    <p className="text-sm mt-0.5">{stage.expectedImpact}</p>
                  </div>
                  {stage.transitionToNext && (
                    <div className="flex items-start gap-2 pt-1 border-t border-border">
                      <ArrowRight className="w-3.5 h-3.5 text-fg-muted flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-fg-muted">{stage.transitionToNext}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Touchpoint strategy */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-xs font-medium text-fg-muted mb-1">{t('adCreativeSequencer.touchpointStrategy')}</p>
              <p className="text-sm">{result.sequence.touchpointStrategy}</p>
            </div>

            {/* Recommendations */}
            {result.sequence.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-2">{t('adCreativeSequencer.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.sequence.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
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
