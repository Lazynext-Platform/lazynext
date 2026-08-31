'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  TrendingUp,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Rocket,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SocialMomentumDesignerResult,
  SocialMomentum,
} from '@/lib/creative/ad-creative-social-momentum-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const MOMENTUM_TYPE_COLORS: Record<string, string> = {
  viral_cascade: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  community_growth: 'bg-success/20 text-success border-success/30',
  trend_adoption: 'bg-warning/20 text-warning border-warning/30',
  influencer_wave: 'bg-danger/20 text-danger border-danger/30',
  user_generated_wave: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  milestone_celebration: 'bg-success/20 text-success border-success/30',
  movement_building: 'bg-warning/20 text-warning border-warning/30',
  collective_action: 'bg-danger/20 text-danger border-danger/30',
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

export default function AdCreativeSocialMomentumDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SocialMomentumDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-social-momentum-designer', {
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
      if (!res.ok) throw new Error(data.error || t('adCreativeSocialMomentumDesigner.error'));
      setResult(data.result as SocialMomentumDesignerResult);
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
          {t('adCreativeSocialMomentumDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adCreativeSocialMomentumDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSocialMomentumDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeSocialMomentumDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adCreativeSocialMomentumDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSocialMomentumDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acsmdProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeSocialMomentumDesigner.productOrBrand')}
            </label>
            <input
              id="acsmdProduct"
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
            <label htmlFor="acsmdContent" className="block text-sm font-medium mb-1">
              {t('adCreativeSocialMomentumDesigner.content')}
            </label>
            <textarea
              id="acsmdContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Join 50,000+ women who transformed their skin with our vitamin C serum..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acsmdAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeSocialMomentumDesigner.targetAudience')}
            </label>
            <input
              id="acsmdAudience"
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
            <label className="block text-sm font-medium mb-2">{t('adCreativeSocialMomentumDesigner.platform')}</label>
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
            {loading ? t('adCreativeSocialMomentumDesigner.generating') : `${t('adCreativeSocialMomentumDesigner.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeSocialMomentumDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeSocialMomentumDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeSocialMomentumDesigner.dryRunNotice')}
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
                {copied ? t('adCreativeSocialMomentumDesigner.copied') : t('adCreativeSocialMomentumDesigner.copy')}
              </button>
            </div>

            {/* Momentum builders */}
            {result.strategy.momentum.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('adCreativeSocialMomentumDesigner.momentum')}</p>
                {result.strategy.momentum.map((m: SocialMomentum, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${MOMENTUM_TYPE_COLORS[m.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {m.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {t('adCreativeSocialMomentumDesigner.socialSignal')}
                        </p>
                        <p className="text-sm text-fg">{m.socialSignal}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {t('adCreativeSocialMomentumDesigner.communityEvidence')}
                        </p>
                        <p className="text-sm text-fg">{m.communityEvidence}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Rocket className="w-3 h-3" /> {t('adCreativeSocialMomentumDesigner.bandwagonElement')}
                        </p>
                        <p className="text-sm text-fg">{m.bandwagonElement}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('adCreativeSocialMomentumDesigner.momentumPathway')}</p>
                        <p className="text-sm text-fg">{m.momentumPathway}</p>
                      </div>
                    </div>

                    {/* Momentum velocity bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('adCreativeSocialMomentumDesigner.momentumVelocity')}</span>
                        <span className={`text-sm font-bold ${scoreColor(m.momentumVelocity)}`}>{m.momentumVelocity}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(m.momentumVelocity)}`}
                          style={{ width: `${m.momentumVelocity}%` }}
                        />
                      </div>
                    </div>

                    {/* Social proof strength bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('adCreativeSocialMomentumDesigner.socialProofStrength')}</span>
                        <span className={`text-sm font-bold ${scoreColor(m.socialProofStrength)}`}>{m.socialProofStrength}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(m.socialProofStrength)}`}
                          style={{ width: `${m.socialProofStrength}%` }}
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
                <p className="text-sm font-medium mb-2">{t('adCreativeSocialMomentumDesigner.recommendations')}</p>
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
