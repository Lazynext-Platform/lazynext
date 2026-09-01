'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Heart,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  EmpathyBridgeDesignerResult,
  EmpathyBridge,
} from '@/lib/creative/creative-ad-empathy-bridge-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const BRIDGE_TYPE_COLORS: Record<string, string> = {
  shared_experience: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  pain_point_mirror: 'bg-danger/20 text-danger border-danger/30',
  aspiration_link: 'bg-success/20 text-success border-success/30',
  value_alignment: 'bg-warning/20 text-warning border-warning/30',
  lifestyle_reflection: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  emotional_memory: 'bg-success/20 text-success border-success/30',
  identity_connection: 'bg-warning/20 text-warning border-warning/30',
  transformation_witness: 'bg-danger/20 text-danger border-danger/30',
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

export default function CreativeAdEmpathyBridgeDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EmpathyBridgeDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-empathy-bridge-designer', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdEmpathyBridgeDesigner.error'));
      setResult(data.result as EmpathyBridgeDesignerResult);
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
          {t('creativeAdEmpathyBridgeDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6" /> {t('creativeAdEmpathyBridgeDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdEmpathyBridgeDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdEmpathyBridgeDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6" /> {t('creativeAdEmpathyBridgeDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdEmpathyBridgeDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="caebdProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdEmpathyBridgeDesigner.productOrBrand')}
            </label>
            <input
              id="caebdProduct"
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
            <label htmlFor="caebdContent" className="block text-sm font-medium mb-1">
              {t('creativeAdEmpathyBridgeDesigner.content')}
            </label>
            <textarea
              id="caebdContent"
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
            <label htmlFor="caebdAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdEmpathyBridgeDesigner.targetAudience')}
            </label>
            <input
              id="caebdAudience"
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
            <label className="block text-sm font-medium mb-2">{t('creativeAdEmpathyBridgeDesigner.platform')}</label>
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
            {loading ? t('creativeAdEmpathyBridgeDesigner.generating') : `${t('creativeAdEmpathyBridgeDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdEmpathyBridgeDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdEmpathyBridgeDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdEmpathyBridgeDesigner.dryRunNotice')}
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
                {copied ? t('creativeAdEmpathyBridgeDesigner.copied') : t('creativeAdEmpathyBridgeDesigner.copy')}
              </button>
            </div>

            {/* Bridges */}
            {result.strategy.bridges.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('creativeAdEmpathyBridgeDesigner.bridges')}</p>
                {result.strategy.bridges.map((bridge: EmpathyBridge, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${BRIDGE_TYPE_COLORS[bridge.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {bridge.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {t('creativeAdEmpathyBridgeDesigner.viewerPerspective')}
                        </p>
                        <p className="text-sm text-fg">{bridge.viewerPerspective}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdEmpathyBridgeDesigner.brandPerspective')}</p>
                        <p className="text-sm text-fg">{bridge.brandPerspective}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {t('creativeAdEmpathyBridgeDesigner.connectionPoint')}
                        </p>
                        <p className="text-sm text-fg">{bridge.connectionPoint}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdEmpathyBridgeDesigner.bridgeStrategy')}</p>
                        <p className="text-sm text-fg">{bridge.bridgeStrategy}</p>
                      </div>
                    </div>

                    {/* Empathy strength bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {t('creativeAdEmpathyBridgeDesigner.empathyStrength')}
                        </span>
                        <span className={`text-sm font-bold ${scoreColor(bridge.empathyStrength)}`}>{bridge.empathyStrength}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(bridge.empathyStrength)}`}
                          style={{ width: `${bridge.empathyStrength}%` }}
                        />
                      </div>
                    </div>

                    {/* Emotional resonance bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('creativeAdEmpathyBridgeDesigner.emotionalResonance')}</span>
                        <span className={`text-sm font-bold ${scoreColor(bridge.emotionalResonance)}`}>{bridge.emotionalResonance}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(bridge.emotionalResonance)}`}
                          style={{ width: `${bridge.emotionalResonance}%` }}
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
                <p className="text-sm font-medium mb-2">{t('creativeAdEmpathyBridgeDesigner.recommendations')}</p>
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
