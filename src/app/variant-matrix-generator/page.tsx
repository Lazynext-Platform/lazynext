'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Grid3x3, Loader2, AlertCircle, Sparkles, Copy, Check } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  MatrixVariant,
  MatrixDimension,
} from '@/lib/creative/variant-matrix-generator';

const CREDIT_COST = 5;

const DIMENSIONS: MatrixDimension[] = ['hook', 'angle', 'format', 'platform'];
const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'];

const DIMENSION_COLORS: Record<MatrixDimension, string> = {
  hook: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  angle: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  format: 'bg-success/20 text-success border-success/30',
  platform: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 70) return 'text-brand-accent';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function VariantMatrixGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [selectedDimensions, setSelectedDimensions] = useState<MatrixDimension[]>([
    'hook',
    'angle',
    'format',
    'platform',
  ]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'tiktok',
    'instagram',
  ]);
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [variants, setVariants] = useState<MatrixVariant[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleDimension = (d: MatrixDimension) => {
    setSelectedDimensions((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/creative/variant-matrix-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          dimensions: selectedDimensions.length ? selectedDimensions : undefined,
          platforms: selectedPlatforms.length ? selectedPlatforms : undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('variantMatrixGenerator.error'));
      const newVariants = data.result.variants as MatrixVariant[];
      setVariants(newVariants);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, selectedDimensions, selectedPlatforms, count, t]);

  const copyVariant = async (v: MatrixVariant) => {
    const text = [
      `Hook: ${v.hook}`,
      `Angle: ${v.angle}`,
      `Format: ${v.format}`,
      `Platform: ${v.platform}`,
      `Predicted score: ${v.predictedScore}`,
      `Rationale: ${v.rationale}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm">
          {t('common.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3x3 className="w-6 h-6" /> {t('variantMatrixGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('variantMatrixGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm">
        {t('common.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3x3 className="w-6 h-6" /> {t('variantMatrixGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('variantMatrixGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="vmgProduct" className="block text-sm font-medium mb-1">
              {t('variantMatrixGenerator.productContext')}
            </label>
            <input
              id="vmgProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phAcmeHeadphones')}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('variantMatrixGenerator.dimensions')}
            </label>
            <div className="flex flex-wrap gap-2">
              {DIMENSIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDimension(d)}
                  disabled={loading}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedDimensions.includes(d)
                      ? DIMENSION_COLORS[d]
                      : 'border-border bg-bg-card text-fg-muted hover:text-fg'
                  }`}
                >
                  {t(`variantMatrixGenerator.dim_${d}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('variantMatrixGenerator.platform')}
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  disabled={loading}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedPlatforms.includes(p)
                      ? 'border-brand-accent bg-brand-accent/20 text-brand-accent'
                      : 'border-border bg-bg-card text-fg-muted hover:text-fg'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="vmgCount" className="block text-sm font-medium mb-1">
              {t('variantMatrixGenerator.count')}
            </label>
            <input
              id="vmgCount"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className="w-24 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading
              ? t('variantMatrixGenerator.generating')
              : `${t('variantMatrixGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('variantMatrixGenerator.generating')}
          </div>
        )}

        {!loading && variants.length === 0 && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('variantMatrixGenerator.noVariants')}
          </div>
        )}

        {variants.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">{t('variantMatrixGenerator.title')}</caption>
                <thead className="bg-bg/50 text-fg-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">{t('variantMatrixGenerator.colHook')}</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">{t('variantMatrixGenerator.colAngle')}</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">{t('variantMatrixGenerator.colFormat')}</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">{t('variantMatrixGenerator.colPlatform')}</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">{t('variantMatrixGenerator.colScore')}</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">{t('variantMatrixGenerator.colRationale')}</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      <span className="sr-only">{t('common.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="px-3 py-2 align-top">{v.hook}</td>
                      <td className="px-3 py-2 align-top">{v.angle}</td>
                      <td className="px-3 py-2 align-top">{v.format}</td>
                      <td className="px-3 py-2 align-top">{v.platform}</td>
                      <td className={`px-3 py-2 align-top font-bold ${scoreColor(v.predictedScore)}`}>
                        {v.predictedScore}
                      </td>
                      <td className="px-3 py-2 align-top text-fg-muted">{v.rationale}</td>
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => copyVariant(v)}
                          className="text-fg-muted hover:text-fg transition flex items-center gap-1 text-xs"
                          aria-label={t('variantMatrixGenerator.copy')}
                        >
                          {copiedId === v.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === v.id
                            ? t('variantMatrixGenerator.copied')
                            : t('variantMatrixGenerator.copy')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
