'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Gift,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Compass,
  Heart,
  RefreshCw,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ViewerRewardDesignerResult,
  RewardElement,
  DiscoveryMoment,
  SatisfactionTrigger,
  RewatchIncentive,
} from '@/lib/creative/ad-creative-viewer-reward-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const REWARD_TYPE_COLORS: Record<string, string> = {
  easter_egg: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  hidden_detail: 'bg-success/20 text-success border-success/30',
  callback_payoff: 'bg-warning/20 text-warning border-warning/30',
  pattern_completion: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  mystery_reveal: 'bg-danger/20 text-danger border-danger/30',
  emotional_payoff: 'bg-success/20 text-success border-success/30',
  insight_moment: 'bg-warning/20 text-warning border-warning/30',
  humor_reward: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

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

export default function AdCreativeViewerRewardDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ViewerRewardDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-viewer-reward-designer', {
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
      if (!res.ok) throw new Error(data.error || t('adCreativeViewerRewardDesigner.error'));
      setResult(data.result as ViewerRewardDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, targetAudience, platform, t]);

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
          {t('adCreativeViewerRewardDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6" /> {t('adCreativeViewerRewardDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeViewerRewardDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeViewerRewardDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6" /> {t('adCreativeViewerRewardDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeViewerRewardDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="avrdProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeViewerRewardDesigner.productOrBrand')}
            </label>
            <input
              id="avrdProduct"
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
            <label htmlFor="avrdContent" className="block text-sm font-medium mb-1">
              {t('adCreativeViewerRewardDesigner.content')}
            </label>
            <textarea
              id="avrdContent"
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
            <label htmlFor="avrdAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeViewerRewardDesigner.targetAudience')}
            </label>
            <input
              id="avrdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t('common.phAudience')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeViewerRewardDesigner.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeViewerRewardDesigner.generating') : `${t('adCreativeViewerRewardDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeViewerRewardDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeViewerRewardDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeViewerRewardDesigner.dryRunNotice')}
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
                {copied ? t('adCreativeViewerRewardDesigner.copied') : t('adCreativeViewerRewardDesigner.copy')}
              </button>
            </div>

            {/* Reward score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('adCreativeViewerRewardDesigner.rewardScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.design.rewardScore)}`}>
                    {result.design.rewardScore}<span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor(result.design.rewardScore)}`}
                  style={{ width: `${result.design.rewardScore}%` }}
                />
              </div>
            </div>

            {/* Reward elements */}
            {result.design.rewards.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4 text-brand-accent" /> {t('adCreativeViewerRewardDesigner.rewards')}
                </p>
                {result.design.rewards.map((r: RewardElement, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${REWARD_TYPE_COLORS[r.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {r.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-sm font-bold ${scoreColor(r.satisfactionLevel)}`}>{r.satisfactionLevel}/100</span>
                    </div>
                    <p className="text-xs text-fg">{r.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeViewerRewardDesigner.viewerAction')}:</span> {r.viewerAction}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('common.resultLabels.emotionalPayoff')}:</span> {r.payoff}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('common.resultLabels.timing')}:</span> {r.timing}</p>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(r.satisfactionLevel)}`}
                        style={{ width: `${r.satisfactionLevel}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discovery moments */}
            {result.design.discoveries.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Compass className="w-4 h-4 text-brand-accent" /> {t('adCreativeViewerRewardDesigner.discoveries')}
                </p>
                {result.design.discoveries.map((d: DiscoveryMoment, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{d.what}</span>
                      <span className={`text-sm font-bold ${scoreColor(d.discoveryJoy)}`}>{d.discoveryJoy}/100</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeViewerRewardDesigner.when')}:</span> {d.when}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeViewerRewardDesigner.howRevealed')}:</span> {d.howRevealed}</p>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(d.discoveryJoy)}`}
                        style={{ width: `${d.discoveryJoy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Satisfaction triggers */}
            {result.design.triggers.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-brand-accent" /> {t('adCreativeViewerRewardDesigner.triggers')}
                </p>
                {result.design.triggers.map((tr: SatisfactionTrigger, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{tr.trigger}</span>
                      <span className={`text-sm font-bold ${scoreColor(tr.intensity)}`}>{tr.intensity}/100</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeViewerRewardDesigner.emotion')}:</span> {tr.emotion}</p>
                    <p className="text-xs text-fg-muted">{tr.viewerResponse}</p>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(tr.intensity)}`}
                        style={{ width: `${tr.intensity}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rewatch incentives */}
            {result.design.rewatchIncentives.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-brand-accent" /> {t('adCreativeViewerRewardDesigner.rewatchIncentives')}
                </p>
                {result.design.rewatchIncentives.map((rw: RewatchIncentive, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{rw.incentive}</span>
                      <span className={`text-sm font-bold ${scoreColor(rw.rewatchValue)}`}>{rw.rewatchValue}/100</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeViewerRewardDesigner.method')}:</span> {rw.method}</p>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(rw.rewatchValue)}`}
                        style={{ width: `${rw.rewatchValue}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.design.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeViewerRewardDesigner.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.design.recommendations.map((rec, i) => (
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
