'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Globe,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Languages,
  Palette,
  ShieldAlert,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  LocalizationAdapterResult,
  IdiomAdaptation,
  Market,
} from '@/lib/creative/ad-localization-adapter';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const MARKETS: Market[] = ['us', 'uk', 'eu', 'cn', 'jp', 'kr', 'in', 'br', 'sea', 'mena', 'latam'];

export default function AdLocalizationAdapterPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [sourceMarket, setSourceMarket] = useState<Market>('us');
  const [targetMarket, setTargetMarket] = useState<Market>('jp');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LocalizationAdapterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-localization-adapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          sourceMarket,
          targetMarket,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adLocalizationAdapter.error'));
      setResult(data.result as LocalizationAdapterResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, sourceMarket, targetMarket, platform, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const lines: string[] = [];
      lines.push(`Localized Content: ${result.localization.localizedContent}`);
      lines.push('');
      lines.push('Cultural Notes:');
      for (const note of result.localization.culturalNotes) {
        lines.push(`  - ${note}`);
      }
      lines.push('');
      lines.push('Idiom Adaptations:');
      for (const idiom of result.localization.idiomAdaptations) {
        lines.push(`  ${idiom.original} → ${idiom.localized} (${idiom.reason})`);
      }
      lines.push('');
      lines.push('Color/Symbol Considerations:');
      for (const c of result.localization.colorSymbolConsiderations) {
        lines.push(`  - ${c}`);
      }
      lines.push('');
      lines.push('Compliance Flags:');
      for (const flag of result.localization.complianceFlags) {
        lines.push(`  - ${flag}`);
      }
      lines.push('');
      lines.push(`Tone Adjustment: ${result.localization.toneAdjustment}`);
      lines.push(`Market-Specific CTA: ${result.localization.marketSpecificCTA}`);
      lines.push('');
      lines.push('Recommendations:');
      for (const rec of result.localization.recommendations) {
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
          {t('adLocalizationAdapter.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" /> {t('adLocalizationAdapter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adLocalizationAdapter.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adLocalizationAdapter.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" /> {t('adLocalizationAdapter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adLocalizationAdapter.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="alaContent" className="block text-sm font-medium mb-1">
              {t('adLocalizationAdapter.content')}
            </label>
            <textarea
              id="alaContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Check out our amazing new product — it's a game changer! Buy now and save 20%!"
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="alaProduct" className="block text-sm font-medium mb-1">
              {t('adLocalizationAdapter.productOrBrand')}
            </label>
            <input
              id="alaProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., GlowUp skincare"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="alaSourceMarket" className="block text-sm font-medium mb-1">
                {t('adLocalizationAdapter.sourceMarket')}
              </label>
              <select
                id="alaSourceMarket"
                value={sourceMarket}
                onChange={(e) => setSourceMarket(e.target.value as Market)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="alaTargetMarket" className="block text-sm font-medium mb-1">
                {t('adLocalizationAdapter.targetMarket')}
              </label>
              <select
                id="alaTargetMarket"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value as Market)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adLocalizationAdapter.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adLocalizationAdapter.generating') : `${t('adLocalizationAdapter.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adLocalizationAdapter.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adLocalizationAdapter.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adLocalizationAdapter.dryRunNotice')}
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
                {copied ? t('adLocalizationAdapter.copied') : t('adLocalizationAdapter.copy')}
              </button>
            </div>

            {/* Localized content */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-xs font-medium text-fg-muted mb-1 flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" /> {t('adLocalizationAdapter.localizedContent')}
              </p>
              <p className="text-sm whitespace-pre-wrap">{result.localization.localizedContent}</p>
            </div>

            {/* Tone adjustment & market-specific CTA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> {t('adLocalizationAdapter.toneAdjustment')}
                </p>
                <p className="text-sm">{result.localization.toneAdjustment}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-1 flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5" /> {t('adLocalizationAdapter.marketSpecificCTA')}
                </p>
                <p className="text-sm font-medium">{result.localization.marketSpecificCTA}</p>
              </div>
            </div>

            {/* Cultural notes */}
            {result.localization.culturalNotes.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-2 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {t('adLocalizationAdapter.culturalNotes')}
                </p>
                <ul className="space-y-1.5">
                  {result.localization.culturalNotes.map((note: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Idiom adaptations */}
            {result.localization.idiomAdaptations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-2 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" /> {t('adLocalizationAdapter.idiomAdaptations')}
                </p>
                <div className="space-y-2">
                  {result.localization.idiomAdaptations.map((idiom: IdiomAdaptation, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-bg-secondary px-3 py-2 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="font-medium">{idiom.original}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-fg-muted" />
                        <span className="font-medium text-brand-accent">{idiom.localized}</span>
                      </div>
                      <p className="text-xs text-fg-muted">{idiom.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Color/symbol considerations */}
            {result.localization.colorSymbolConsiderations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-2 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" /> {t('adLocalizationAdapter.colorSymbolConsiderations')}
                </p>
                <ul className="space-y-1.5">
                  {result.localization.colorSymbolConsiderations.map((c: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compliance flags */}
            {result.localization.complianceFlags.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                <p className="text-xs font-medium text-warning mb-2 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> {t('adLocalizationAdapter.complianceFlags')}
                </p>
                <ul className="space-y-1.5">
                  {result.localization.complianceFlags.map((flag: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.localization.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted mb-2">{t('adLocalizationAdapter.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.localization.recommendations.map((rec: string, i: number) => (
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
