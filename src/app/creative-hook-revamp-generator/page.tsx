'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Zap,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  HookRevampResult,
  HookRevamp,
  RevampStyle,
} from '@/lib/creative/creative-hook-revamp-generator';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const REVAMP_STYLES: RevampStyle[] = ['bolder', 'shorter', 'question', 'story', 'data-driven', 'contrarian'];

const TRIGGER_COLORS: Record<string, string> = {
  curiosity: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  surprise: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  fear: 'bg-danger/20 text-danger border-danger/30',
  aspiration: 'bg-success/20 text-success border-success/30',
  urgency: 'bg-warning/20 text-warning border-warning/30',
  belonging: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pride: 'bg-warning/20 text-warning border-warning/30',
};

export default function CreativeHookRevampGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [originalHook, setOriginalHook] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [revampStyle, setRevampStyle] = useState<RevampStyle | undefined>(undefined);
  const [count, setCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HookRevampResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!originalHook.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-hook-revamp-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalHook,
          productOrBrand,
          platform: platform || undefined,
          revampStyle: revampStyle || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeHookRevampGenerator.error'));
      setResult(data.result as HookRevampResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [originalHook, productOrBrand, platform, revampStyle, count, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const lines = result.revamps.map(
        (r) =>
          `${r.revampedHook}\n  Angle: ${r.angle}\n  Trigger: ${r.emotionalTrigger}\n  Lift: ${r.predictedLift}\n  Reasoning: ${r.reasoning}`,
      );
      await navigator.clipboard.writeText(lines.join('\n\n'));
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
          {t('creativeHookRevampGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeHookRevampGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeHookRevampGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeHookRevampGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('creativeHookRevampGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeHookRevampGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="chrgHook" className="block text-sm font-medium mb-1">
              {t('creativeHookRevampGenerator.originalHook')}
            </label>
            <textarea
              id="chrgHook"
              value={originalHook}
              onChange={(e) => setOriginalHook(e.target.value)}
              placeholder="e.g., This skincare product will change your life"
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="chrgProduct" className="block text-sm font-medium mb-1">
              {t('creativeHookRevampGenerator.productOrBrand')}
            </label>
            <textarea
              id="chrgProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeHookRevampGenerator.platform')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatform(undefined)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  platform === undefined
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

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeHookRevampGenerator.revampStyle')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRevampStyle(undefined)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  revampStyle === undefined
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                any
              </button>
              {REVAMP_STYLES.map((rs) => (
                <button
                  key={rs}
                  type="button"
                  onClick={() => setRevampStyle(rs)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    revampStyle === rs
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {rs}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="chrgCount" className="block text-sm font-medium mb-1">
              {t('creativeHookRevampGenerator.count')}
            </label>
            <input
              id="chrgCount"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={3}
              max={8}
              className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !originalHook.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeHookRevampGenerator.generating') : `${t('creativeHookRevampGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeHookRevampGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeHookRevampGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeHookRevampGenerator.dryRunNotice')}
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
                {copied ? t('creativeHookRevampGenerator.copied') : t('creativeHookRevampGenerator.copy')}
              </button>
            </div>

            {/* Revamp cards */}
            <div className="space-y-3">
              {result.revamps.map((r: HookRevamp, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                  <p className="text-sm font-medium">{r.revampedHook}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                      {r.angle}
                    </span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TRIGGER_COLORS[r.emotionalTrigger] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {r.emotionalTrigger}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <TrendingUp className="w-3 h-3" /> {r.predictedLift}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium text-fg">{t('creativeHookRevampGenerator.formatChange')}:</span> {r.formatChange}
                  </p>
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium text-fg">{t('creativeHookRevampGenerator.reasoning')}:</span> {r.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
