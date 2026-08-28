'use client';

import { useState, useCallback } from 'react';
import { Repeat, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { RepurposeResult } from '@/lib/creative/repurposing';

const TARGET_FORMATS = [
  'short_form_video', 'image_carousel', 'single_image', 'story_set',
  'social_post', 'email_creative', 'display_ad', 'vertical_video',
  'horizontal_video', 'square_video',
];

export function RepurposingEngine() {
  const { t } = useI18n();
  const [sourceContent, setSourceContent] = useState('');
  const [sourceFormat, setSourceFormat] = useState('video');
  const [targetFormats, setTargetFormats] = useState<string[]>(['short_form_video', 'image_carousel']);
  const [brandContext, setBrandContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RepurposeResult | null>(null);

  const toggleTarget = (fmt: string) => {
    setTargetFormats((p) => p.includes(fmt) ? p.filter((f) => f !== fmt) : [...p, fmt]);
  };

  const analyze = useCallback(async () => {
    if (!sourceContent.trim()) { setError(t('repurposing.contentRequired')); return; }
    if (targetFormats.length === 0) { setError(t('repurposing.targetsRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/repurposing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceContent, sourceFormat, targetFormats, brandContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sourceContent, sourceFormat, targetFormats, brandContext, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Repeat className="w-5 h-5" /> {t('repurposing.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('repurposing.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="rp-content" className="block text-sm font-medium mb-1">{t('repurposing.sourceContent')}</label>
          <textarea id="rp-content" value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} rows={6} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('repurposing.sourceContent')} />
        </div>
        <div>
          <label htmlFor="rp-source" className="block text-sm font-medium mb-1">{t('repurposing.sourceFormat')}</label>
          <select id="rp-source" value={sourceFormat} onChange={(e) => setSourceFormat(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('repurposing.sourceFormat')}>
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="script">Script</option>
            <option value="carousel">Carousel</option>
            <option value="story">Story</option>
            <option value="long_form_video">Long-form Video</option>
          </select>
        </div>
        <div>
          <span className="block text-sm font-medium mb-1">{t('repurposing.targetFormats')}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TARGET_FORMATS.map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={targetFormats.includes(fmt)} onChange={() => toggleTarget(fmt)} disabled={loading} className="rounded" aria-label={fmt.replace(/_/g, ' ')} />
                <span className="capitalize">{fmt.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="rp-brand" className="block text-sm font-medium mb-1">{t('repurposing.brandContext')}</label>
          <textarea id="rp-brand" value={brandContext} onChange={(e) => setBrandContext(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('repurposing.brandContext')} />
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('repurposing.analyze')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
        {loading ? t('repurposing.analyzing') : t('repurposing.analyze')} <span className="text-xs opacity-75">({t('repurposing.credits')}: 6)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          <div className="rounded-lg border border-border bg-bg-secondary p-3">
            <p className="text-sm text-fg-muted">{t('repurposing.totalVariants')}: <span className="font-bold text-fg-primary">{result.totalVariants}</span></p>
          </div>

          {result.plans.map((plan, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold capitalize">{plan.targetFormat.replace(/_/g, ' ')}</span>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{plan.strategy.replace(/_/g, ' ')}</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{plan.platform}</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5">{plan.qualityRetention}% {t('repurposing.retention')}</span>
                </div>
              </div>
              {plan.segments.map((seg, j) => (
                <div key={j} className="text-sm border-l-2 border-border pl-3">
                  <p className="font-medium">{seg.title}</p>
                  <p className="text-fg-muted">{seg.content.slice(0, 200)}</p>
                  <p className="text-xs text-fg-muted mt-1">Hook: {seg.hook} | CTA: {seg.cta}</p>
                </div>
              ))}
              {plan.adaptations.length > 0 && <p className="text-xs text-fg-muted">Adaptations: {plan.adaptations.join(', ')}</p>}
            </div>
          ))}

          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('repurposing.insights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.insights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('repurposing.recommendations')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.recommendations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
