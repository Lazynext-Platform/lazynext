'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Repeat,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  FileText,
  Lightbulb,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  FormatConverterResult,
  FormatConversion,
  AdFormat,
} from '@/lib/creative/creative-format-converter';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const FORMATS: AdFormat[] = ['long-form', 'short-form', 'image-ad', 'video-script', 'carousel', 'story'];

export default function CreativeFormatConverterPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [sourceFormat, setSourceFormat] = useState<AdFormat>('long-form');
  const [targetFormat, setTargetFormat] = useState<AdFormat>('short-form');
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FormatConverterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-format-converter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          sourceFormat,
          targetFormat,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeFormatConverter.error'));
      setResult(data.result as FormatConverterResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, sourceFormat, targetFormat, platform, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const c: FormatConversion = result.conversion;
      const lines = [
        `Converted Content (${sourceFormat} → ${targetFormat}):`,
        c.convertedContent,
        '',
        `Estimated Duration: ${c.estimatedDuration}`,
        `Character Count: ${c.characterCount}`,
        '',
        'Format Notes:',
        ...c.formatNotes.map((n) => `  - ${n}`),
        '',
        'Adaptations:',
        ...c.adaptations.map((a) => `  - ${a}`),
        '',
        ...(c.platformOptimizations.length > 0
          ? ['Platform Optimizations:', ...c.platformOptimizations.map((p) => `  - ${p}`)]
          : []),
      ];
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result, sourceFormat, targetFormat]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('creativeFormatConverter.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" /> {t('creativeFormatConverter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeFormatConverter.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeFormatConverter.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" /> {t('creativeFormatConverter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeFormatConverter.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cfcContent" className="block text-sm font-medium mb-1">
              {t('creativeFormatConverter.content')}
            </label>
            <textarea
              id="cfcContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Our vitamin C serum brightens skin in just two weeks. Formulated with 20% L-ascorbic acid, it reduces dark spots and evens skin tone..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cfcProduct" className="block text-sm font-medium mb-1">
              {t('creativeFormatConverter.productOrBrand')}
            </label>
            <textarea
              id="cfcProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('creativeFormatConverter.sourceFormat')}</label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSourceFormat(f)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      sourceFormat === f
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('creativeFormatConverter.targetFormat')}</label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTargetFormat(f)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      targetFormat === f
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeFormatConverter.platform')}</label>
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

          <button
            onClick={generate}
            disabled={loading || !content.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeFormatConverter.converting') : `${t('creativeFormatConverter.convert')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeFormatConverter.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeFormatConverter.converting')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeFormatConverter.dryRunNotice')}
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
                {copied ? t('creativeFormatConverter.copied') : t('creativeFormatConverter.copy')}
              </button>
            </div>

            {/* Converted content */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-accent" /> {t('creativeFormatConverter.convertedContent')}
              </h2>
              <div className="flex items-center gap-3 flex-wrap text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {result.conversion.estimatedDuration}
                </span>
                <span>{result.conversion.characterCount} chars</span>
                <span className="text-brand-accent">{sourceFormat} → {targetFormat}</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-fg bg-bg-secondary rounded-lg p-3 overflow-x-auto">
{result.conversion.convertedContent}
              </pre>
            </div>

            {/* Format notes */}
            {result.conversion.formatNotes.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeFormatConverter.formatNotes')}
                </h2>
                <ul className="space-y-1">
                  {result.conversion.formatNotes.map((n, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                      <span className="text-brand-accent flex-shrink-0 mt-0.5">→</span> {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Adaptations */}
            {result.conversion.adaptations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-brand-accent" /> {t('creativeFormatConverter.adaptations')}
                </h2>
                <ul className="space-y-1">
                  {result.conversion.adaptations.map((a, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Platform optimizations */}
            {result.conversion.platformOptimizations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-accent" /> {t('creativeFormatConverter.platformOptimizations')}
                </h2>
                <ul className="space-y-1">
                  {result.conversion.platformOptimizations.map((p, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                      <span className="text-brand-accent flex-shrink-0 mt-0.5">→</span> {p}
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
