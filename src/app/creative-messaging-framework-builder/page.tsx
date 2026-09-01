'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Layers,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  MessageSquare,
  ShieldCheck,
  Mic,
  Lightbulb,
  Quote,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  FrameworkBuilderResult,
  MessagingPillar,
  CoreMessage,
  SupportingPoint,
  ProofPoint,
  ToneGuideline,
} from '@/lib/creative/creative-messaging-framework-builder';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function priorityColor(priority: number): string {
  if (priority >= 8) return 'bg-danger/20 text-danger border-danger/30';
  if (priority >= 6) return 'bg-warning/20 text-warning border-warning/30';
  return 'bg-success/20 text-success border-success/30';
}

export default function CreativeMessagingFrameworkBuilderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FrameworkBuilderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !valueProposition.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-messaging-framework-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          valueProposition,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeMessagingFrameworkBuilder.error'));
      setResult(data.result as FrameworkBuilderResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, valueProposition, targetAudience, platform, t]);

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
          {t('creativeMessagingFrameworkBuilder.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeMessagingFrameworkBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeMessagingFrameworkBuilder.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeMessagingFrameworkBuilder.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeMessagingFrameworkBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeMessagingFrameworkBuilder.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cmfbProduct" className="block text-sm font-medium mb-1">
              {t('creativeMessagingFrameworkBuilder.productOrBrand')}
            </label>
            <input
              id="cmfbProduct"
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
            <label htmlFor="cmfbValueProp" className="block text-sm font-medium mb-1">
              {t('creativeMessagingFrameworkBuilder.valueProposition')}
            </label>
            <textarea
              id="cmfbValueProp"
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              placeholder="e.g., Brightens dull skin in just 7 days with clinically-proven vitamin C — risk-free trial available."
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cmfbAudience" className="block text-sm font-medium mb-1">
              {t('creativeMessagingFrameworkBuilder.targetAudience')}
            </label>
            <input
              id="cmfbAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 concerned about dull skin and early signs of aging"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeMessagingFrameworkBuilder.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !valueProposition.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeMessagingFrameworkBuilder.generating') : `${t('creativeMessagingFrameworkBuilder.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeMessagingFrameworkBuilder.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeMessagingFrameworkBuilder.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeMessagingFrameworkBuilder.dryRunNotice')}
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
                {copied ? t('creativeMessagingFrameworkBuilder.copied') : t('creativeMessagingFrameworkBuilder.copy')}
              </button>
            </div>

            {/* Elevator pitch */}
            {result.framework.elevatorPitch && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Quote className="w-4 h-4 text-brand-accent" /> {t('creativeMessagingFrameworkBuilder.elevatorPitch')}
                </p>
                <p className="text-sm text-fg italic">{result.framework.elevatorPitch}</p>
              </div>
            )}

            {/* Messaging pillars */}
            {result.framework.pillars.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-accent" /> {t('creativeMessagingFrameworkBuilder.pillars')}
                </p>
                {result.framework.pillars.map((p: MessagingPillar, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{p.pillar}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${priorityColor(p.priority)}`}>
                        {t('creativeMessagingFrameworkBuilder.priority') || 'priority'} {p.priority}/10
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">{p.description}</p>
                    <p className="text-xs text-fg"><span className="font-medium">{t('creativeMessagingFrameworkBuilder.keyMessage')}:</span> {p.keyMessage}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Core messages */}
            {result.framework.coreMessages.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-accent" /> {t('creativeMessagingFrameworkBuilder.coreMessages')}
                </p>
                {result.framework.coreMessages.map((m: CoreMessage, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg-muted">{m.channel}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${priorityColor(m.priority)}`}>
                        {t('creativeMessagingFrameworkBuilder.priority') || 'priority'} {m.priority}/10
                      </span>
                    </div>
                    <p className="text-sm text-fg">{m.message}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium">{t('creativeMessagingFrameworkBuilder.audience')}:</span> {m.audience}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Supporting points */}
            {result.framework.supportingPoints.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeMessagingFrameworkBuilder.supportingPoints')}
                </p>
                {result.framework.supportingPoints.map((s: SupportingPoint, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <p className="text-sm text-fg">{s.point}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium">{t('creativeMessagingFrameworkBuilder.supports')}:</span> {s.supportsMessage}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium">{t('creativeMessagingFrameworkBuilder.evidence')}:</span> {s.evidence}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Proof points */}
            {result.framework.proofPoints.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-accent" /> {t('creativeMessagingFrameworkBuilder.proofPoints')}
                </p>
                {result.framework.proofPoints.map((p: ProofPoint, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{p.claim}</span>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{p.type}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{p.proof}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tone guidelines */}
            {result.framework.toneGuidelines.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Mic className="w-4 h-4 text-brand-accent" /> {t('creativeMessagingFrameworkBuilder.toneGuidelines')}
                </p>
                {result.framework.toneGuidelines.map((g: ToneGuideline, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <p className="text-sm font-medium">{g.attribute}</p>
                    <p className="text-xs text-fg-muted">{g.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <p className="text-xs text-success"><span className="font-medium">{t('creativeMessagingFrameworkBuilder.do')}:</span> {g.do}</p>
                      <p className="text-xs text-danger"><span className="font-medium">{t('creativeMessagingFrameworkBuilder.dont')}:</span> {g.dont}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.framework.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeMessagingFrameworkBuilder.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.framework.recommendations.map((rec, i) => (
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
