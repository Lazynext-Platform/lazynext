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
  BadgeCheck,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SocialProofArchitectResult,
  SocialProofElement,
  ProofStrategy,
  ExpectedImpact,
} from '@/lib/creative/ad-creative-social-proof-architect';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const IMPACT_COLORS: Record<ExpectedImpact, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function credibilityColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function AdCreativeSocialProofArchitectPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SocialProofArchitectResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim() || !content.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-social-proof-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          content,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeSocialProofArchitect.error'));
      setResult(data.result as SocialProofArchitectResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, content, platform, t]);

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
          {t('adCreativeSocialProofArchitect.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> {t('adCreativeSocialProofArchitect.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSocialProofArchitect.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeSocialProofArchitect.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> {t('adCreativeSocialProofArchitect.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSocialProofArchitect.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acspaProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeSocialProofArchitect.productOrBrand')}
            </label>
            <input
              id="acspaProduct"
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
            <label htmlFor="acspaAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeSocialProofArchitect.targetAudience')}
            </label>
            <input
              id="acspaAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in anti-aging skincare"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acspaContent" className="block text-sm font-medium mb-1">
              {t('adCreativeSocialProofArchitect.content')}
            </label>
            <textarea
              id="acspaContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Promote our new vitamin C serum with a focus on brightening results and trust-building..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeSocialProofArchitect.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim() || !content.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeSocialProofArchitect.generating') : `${t('adCreativeSocialProofArchitect.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeSocialProofArchitect.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeSocialProofArchitect.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeSocialProofArchitect.dryRunNotice')}
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
                {copied ? t('adCreativeSocialProofArchitect.copied') : t('adCreativeSocialProofArchitect.copy')}
              </button>
            </div>

            {/* Social proof elements */}
            {result.architecture.elements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-brand-accent" /> {t('adCreativeSocialProofArchitect.elements')}
                </p>
                {result.architecture.elements.map((el: SocialProofElement, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                        {el.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-fg-muted">{t('adCreativeSocialProofArchitect.credibilityScore')}</span>
                        <span className={`text-sm font-bold ${credibilityColor(el.credibilityScore)}`}>{el.credibilityScore}/100</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${el.credibilityScore >= 75 ? 'bg-success' : el.credibilityScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${el.credibilityScore}%` }}
                      />
                    </div>
                    <p className="text-sm text-fg">{el.content}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeSocialProofArchitect.placement')}:</span> {el.placement}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeSocialProofArchitect.authenticityNote')}:</span> {el.authenticityNote}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Strategies */}
            {result.architecture.strategies.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-accent" /> {t('adCreativeSocialProofArchitect.strategies')}
                </p>
                {result.architecture.strategies.map((s: ProofStrategy, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{s.strategy}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[s.expectedImpact] || IMPACT_COLORS.medium}`}>
                        {t('adCreativeSocialProofArchitect.expectedImpact')}: {s.expectedImpact}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeSocialProofArchitect.type')}:</span> {s.proofType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-fg-muted">{s.implementation}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeSocialProofArchitect.integration')}:</span> {s.integration}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.architecture.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-warning" /> {t('adCreativeSocialProofArchitect.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.architecture.recommendations.map((rec, i) => (
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
