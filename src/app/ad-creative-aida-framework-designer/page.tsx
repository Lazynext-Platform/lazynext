'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  Heart,
  Flame,
  MousePointerClick,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AIDAFrameworkDesignerResult,
  AIDAStage,
} from '@/lib/creative/ad-creative-aida-framework-designer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const STAGE_META: { key: keyof AIDAFrameworkDesignerResult['framework']; labelKey: string; icon: typeof Eye; color: string }[] = [
  { key: 'attention', labelKey: 'aidaFrameworkDesigner.attentionCopy', icon: Eye, color: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30' },
  { key: 'interest', labelKey: 'aidaFrameworkDesigner.interestCopy', icon: Heart, color: 'bg-success/20 text-success border-success/30' },
  { key: 'desire', labelKey: 'aidaFrameworkDesigner.desireCopy', icon: Flame, color: 'bg-warning/20 text-warning border-warning/30' },
  { key: 'action', labelKey: 'aidaFrameworkDesigner.actionCopy', icon: MousePointerClick, color: 'bg-danger/20 text-danger border-danger/30' },
];

export default function AdCreativeAIDAFrameworkDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AIDAFrameworkDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-aida-framework-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('aidaFrameworkDesigner.error'));
      setResult(data.result as AIDAFrameworkDesignerResult);
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
          {t('aidaFrameworkDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('aidaFrameworkDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('aidaFrameworkDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('aidaFrameworkDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('aidaFrameworkDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('aidaFrameworkDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acafdProduct" className="block text-sm font-medium mb-1">
              {t('aidaFrameworkDesigner.productOrBrand')}
            </label>
            <input
              id="acafdProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('aidaFrameworkDesigner.productOrBrandPh')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acafdAudience" className="block text-sm font-medium mb-1">
              {t('aidaFrameworkDesigner.targetAudience')}
            </label>
            <input
              id="acafdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t('aidaFrameworkDesigner.targetAudiencePh')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('aidaFrameworkDesigner.platform')}</label>
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
                {t('aidaFrameworkDesigner.anyPlatform')}
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
            {loading ? t('aidaFrameworkDesigner.generating') : `${t('aidaFrameworkDesigner.generate')} (${CREDIT_COST})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('aidaFrameworkDesigner.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('aidaFrameworkDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('aidaFrameworkDesigner.dryRunNotice')}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('aidaFrameworkDesigner.copied') : t('aidaFrameworkDesigner.copy')}
              </button>
            </div>

            {STAGE_META.map(({ key, labelKey, icon: Icon, color }) => {
              const stage: AIDAStage = result.framework[key];
              return (
                <div key={key} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
                      <Icon className="w-3 h-3" /> {t(labelKey)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('aidaFrameworkDesigner.copy')}</p>
                      <p className="text-sm text-fg">{stage.copy}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('aidaFrameworkDesigner.attentionHook')}</p>
                      <p className="text-sm text-fg">{stage.hook}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('aidaFrameworkDesigner.actionTrigger')}</p>
                      <p className="text-sm text-fg">{stage.cta}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
