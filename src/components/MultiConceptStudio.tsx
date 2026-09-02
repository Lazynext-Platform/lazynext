'use client';

import { useState, useCallback } from 'react';
import { Lightbulb, Loader2, AlertCircle, Sparkles, Star, GitBranch, Search } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface Concept {
  trigger?: string;
  triggerName?: string;
  hook?: string;
  angle?: string;
  scriptOutline?: string;
  visualDirection?: string;
  cta?: string;
  estimatedDuration?: number;
}

interface BrandResearch {
  name?: string;
  values?: string[];
  tone?: string;
  positioning?: string;
}

interface ForkOption {
  label?: string;
  description?: string;
}

interface MultiConceptResult {
  concepts?: Concept[];
  brandResearch?: BrandResearch;
  recommendedIndex?: number;
  recommendedReason?: string;
  forkOptions?: ForkOption[];
}

const CREDIT_COST = 6;

const TRIGGER_COLORS: Record<string, string> = {
  fear: 'bg-danger/20 text-danger border-danger/30',
  aspiration: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  humor: 'bg-warning/20 text-warning border-warning/30',
  urgency: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  curiosity: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  social_proof: 'bg-success/20 text-success border-success/30',
};

function triggerBadgeClass(trigger?: string): string {
  if (!trigger) return 'bg-bg-secondary text-fg-muted border-border';
  const key = trigger.toLowerCase().replace(/\s+/g, '_');
  return TRIGGER_COLORS[key] || 'bg-bg-secondary text-fg-muted border-border';
}

export function MultiConceptStudio() {
  const { t } = useI18n();
  const [productOrBrand, setProductOrBrand] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [durationSeconds, setDurationSeconds] = useState('30');
  const [brandName, setBrandName] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MultiConceptResult | null>(null);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const res = await fetch('/api/creative/multi-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          productUrl: productUrl || undefined,
          audience: audience || undefined,
          platform,
          durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
          brandInfo: {
            name: brandName || undefined,
            values: splitList(brandValues),
            tone: brandTone || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, productUrl, audience, platform, durationSeconds, brandName, brandValues, brandTone]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="w-5 h-5" /> {t('multiConcept.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('multiConcept.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="mcProductOrBrand" className="block text-sm font-medium mb-1">{t('multiConcept.productOrBrand')}</label>
          <input id="mcProductOrBrand" type="text" value={productOrBrand} onChange={(e) => setProductOrBrand(e.target.value)} placeholder={t('multiConcept.phProductOrBrand')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label htmlFor="mcProductUrl" className="block text-sm font-medium mb-1">{t('multiConcept.productUrl')}</label>
          <input id="mcProductUrl" type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder={t('multiConcept.phProductUrl')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="mcAudience" className="block text-sm font-medium mb-1">{t('multiConcept.audience')}</label>
            <input id="mcAudience" type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={t('multiConcept.phAudience')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="mcPlatform" className="block text-sm font-medium mb-1">{t('multiConcept.platform')}</label>
            <select id="mcPlatform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          <div>
            <label htmlFor="mcDuration" className="block text-sm font-medium mb-1">{t('multiConcept.duration')}</label>
            <input id="mcDuration" type="number" value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="mcBrandName" className="block text-sm font-medium mb-1">{t('multiConcept.brandName')}</label>
            <input id="mcBrandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={t('multiConcept.phBrandName')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="mcBrandValues" className="block text-sm font-medium mb-1">{t('multiConcept.brandValues')}</label>
            <input id="mcBrandValues" type="text" value={brandValues} onChange={(e) => setBrandValues(e.target.value)} placeholder={t('multiConcept.phBrandValues')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="mcBrandTone" className="block text-sm font-medium mb-1">{t('multiConcept.brandTone')}</label>
            <input id="mcBrandTone" type="text" value={brandTone} onChange={(e) => setBrandTone(e.target.value)} placeholder={t('multiConcept.phBrandTone')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <button onClick={generate} disabled={loading || !productOrBrand.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? t('multiConcept.generating') : `${t('multiConcept.generate')} (${CREDIT_COST} ${t('multiConcept.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {result.brandResearch && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Search className="w-4 h-4" /> {t('multiConcept.brandResearch')}</h3>
              <div className="text-sm space-y-1">
                {result.brandResearch.name && <p><span className="font-medium">Name:</span> {result.brandResearch.name}</p>}
                {result.brandResearch.values && result.brandResearch.values.length > 0 && <p><span className="font-medium">Values:</span> {result.brandResearch.values.join(', ')}</p>}
                {result.brandResearch.tone && <p><span className="font-medium">Tone:</span> {result.brandResearch.tone}</p>}
                {result.brandResearch.positioning && <p><span className="font-medium">Positioning:</span> {result.brandResearch.positioning}</p>}
              </div>
            </div>
          )}

          {result.concepts && result.concepts.length > 0 && (
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4" /> {t('multiConcept.concepts')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.concepts.map((c, i) => {
                  const isRecommended = result.recommendedIndex === i;
                  return (
                    <div key={i} className={`rounded-lg border p-4 ${isRecommended ? 'border-brand-accent bg-brand-accent/5' : 'border-border bg-bg-card'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${triggerBadgeClass(c.trigger || c.triggerName)}`}>{c.triggerName || c.trigger || 'concept'}</span>
                        {isRecommended && <span className="text-xs text-brand-accent flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {t('multiConcept.recommended')}</span>}
                      </div>
                      {c.hook && <p className="text-sm font-bold">{c.hook}</p>}
                      {c.angle && <p className="text-xs text-fg-muted mt-1"><span className="font-medium">Angle:</span> {c.angle}</p>}
                      {c.scriptOutline && <p className="text-xs mt-1"><span className="font-medium">Script:</span> {c.scriptOutline}</p>}
                      {c.visualDirection && <p className="text-xs mt-1"><span className="font-medium">Visual:</span> {c.visualDirection}</p>}
                      {c.cta && <p className="text-xs mt-1 text-brand-accent"><span className="font-medium">CTA:</span> {c.cta}</p>}
                      {c.estimatedDuration != null && <p className="text-xs text-fg-muted mt-1">~{c.estimatedDuration}s</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.recommendedReason && (
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-brand-accent" /> {t('multiConcept.recommended')}</h3>
              <p className="text-sm">{result.recommendedReason}</p>
            </div>
          )}

          {result.forkOptions && result.forkOptions.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><GitBranch className="w-4 h-4" /> {t('multiConcept.forkOptions')}</h3>
              <div className="space-y-2">
                {result.forkOptions.map((f, i) => (
                  <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
                    {f.label && <p className="text-sm font-medium">{f.label}</p>}
                    {f.description && <p className="text-xs text-fg-muted">{f.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
