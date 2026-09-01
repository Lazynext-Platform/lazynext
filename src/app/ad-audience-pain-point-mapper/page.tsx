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
  Zap,
  MessageSquare,
  ListOrdered,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  PainPointMapperResult,
  PainPoint,
  CreativeAngle,
  MessagingRecommendation,
  PainSeverity,
} from '@/lib/creative/ad-audience-pain-point-mapper';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const SEVERITY_COLORS: Record<PainSeverity, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
  critical: 'bg-danger/30 text-danger border-danger/40',
};

function effectivenessColor(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

function effectivenessTextColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function AdAudiencePainPointMapperPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PainPointMapperResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-audience-pain-point-mapper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adAudiencePainPointMapper.error'));
      setResult(data.result as PainPointMapperResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, platform, t]);

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
          {t('adAudiencePainPointMapper.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" /> {t('adAudiencePainPointMapper.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudiencePainPointMapper.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adAudiencePainPointMapper.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" /> {t('adAudiencePainPointMapper.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudiencePainPointMapper.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="appmProduct" className="block text-sm font-medium mb-1">
              {t('adAudiencePainPointMapper.productOrBrand')}
            </label>
            <input
              id="appmProduct"
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
            <label htmlFor="appmAudience" className="block text-sm font-medium mb-1">
              {t('adAudiencePainPointMapper.targetAudience')}
            </label>
            <input
              id="appmAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Busy professional women aged 25-40 concerned about skin aging"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adAudiencePainPointMapper.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adAudiencePainPointMapper.generating') : `${t('adAudiencePainPointMapper.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adAudiencePainPointMapper.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adAudiencePainPointMapper.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adAudiencePainPointMapper.dryRunNotice')}
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
                {copied ? t('adAudiencePainPointMapper.copied') : t('adAudiencePainPointMapper.copy')}
              </button>
            </div>

            {/* Pain points */}
            {result.mapping.painPoints.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" /> {t('adAudiencePainPointMapper.painPoints')}
                </p>
                {result.mapping.painPoints.map((pp: PainPoint, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium text-fg">{pp.pain}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[pp.severity] || SEVERITY_COLORS.medium}`}>
                        {pp.severity}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-fg-muted">{t('adAudiencePainPointMapper.frequency') || 'Frequency'}</p>
                        <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden mt-1">
                          <div className="h-full rounded-full bg-brand-accent" style={{ width: `${pp.frequency}%` }} />
                        </div>
                        <p className="text-xs text-fg-muted mt-0.5">{pp.frequency}/100</p>
                      </div>
                      <div>
                        <p className="text-xs text-fg-muted">{t('adAudiencePainPointMapper.emotionalImpact') || 'Emotional impact'}</p>
                        <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden mt-1">
                          <div className="h-full rounded-full bg-danger" style={{ width: `${pp.emotionalImpact}%` }} />
                        </div>
                        <p className="text-xs text-fg-muted mt-0.5">{pp.emotionalImpact}/100</p>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{pp.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Creative angles */}
            {result.mapping.creativeAngles.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent" /> {t('adAudiencePainPointMapper.creativeAngles')}
                </p>
                {result.mapping.creativeAngles.map((ca: CreativeAngle, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium text-fg">{ca.angle}</span>
                      <span className={`text-sm font-bold ${effectivenessTextColor(ca.effectiveness)}`}>{ca.effectiveness}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${effectivenessColor(ca.effectiveness)}`}
                        style={{ width: `${ca.effectiveness}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium text-brand-accent">{t('adAudiencePainPointMapper.addresses') || 'Addresses'}:</span> {ca.addressesPain}
                    </p>
                    <p className="text-xs text-fg-muted">{ca.approach}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Messaging recommendations */}
            {result.mapping.messagingRecommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-accent" /> {t('adAudiencePainPointMapper.messagingRecommendations')}
                </p>
                {result.mapping.messagingRecommendations.map((mr: MessagingRecommendation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{mr.pain}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/10 text-brand-accent border-brand-accent/30">{mr.tone}</span>
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{mr.channel}</span>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{mr.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Prioritization */}
            {result.mapping.prioritization && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-brand-accent" /> {t('adAudiencePainPointMapper.prioritization')}
                </p>
                <p className="text-sm text-fg-muted">{result.mapping.prioritization}</p>
              </div>
            )}

            {/* Recommendations */}
            {result.mapping.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adAudiencePainPointMapper.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.mapping.recommendations.map((rec, i) => (
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
