'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FileSpreadsheet, Loader2, AlertCircle, Sparkles, Users, Zap, Anchor, Eye, Palette, Share2, ShieldCheck, Copy, Check } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { BriefTemplateBuilderResult, Industry } from '@/lib/creative/brief-template-builder';

const CREDIT_COST = 4;

const INDUSTRIES: { value: Industry; labelKey: string }[] = [
  { value: 'beauty', labelKey: 'briefTemplateBuilder.beauty' },
  { value: 'tech', labelKey: 'briefTemplateBuilder.tech' },
  { value: 'food', labelKey: 'briefTemplateBuilder.food' },
  { value: 'fashion', labelKey: 'briefTemplateBuilder.fashion' },
  { value: 'fitness', labelKey: 'briefTemplateBuilder.fitness' },
  { value: 'home', labelKey: 'briefTemplateBuilder.home' },
  { value: 'finance', labelKey: 'briefTemplateBuilder.finance' },
  { value: 'travel', labelKey: 'briefTemplateBuilder.travel' },
];

export default function BriefTemplateBuilderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [industry, setIndustry] = useState<Industry>('beauty');
  const [productCategory, setProductCategory] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [brandColors, setBrandColors] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BriefTemplateBuilderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productCategory.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const brandKit = {
        brandName: brandName.trim() || undefined,
        tone: brandTone.trim() ? brandTone.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        colors: brandColors.trim() ? brandColors.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      const res = await fetch('/api/creative/brief-template-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry,
          productCategory: productCategory.trim(),
          brandKit,
          productUrl: productUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('briefTemplateBuilder.noResults'));
      setResult(data.result as BriefTemplateBuilderResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [industry, productCategory, brandName, brandTone, brandColors, productUrl, t]);

  const copyTemplate = useCallback(() => {
    if (!result) return;
    const tpl = result.template;
    const lines: string[] = [
      `Creative Brief Template — ${result.industry}`,
      '',
      'TARGET AUDIENCE:',
      tpl.targetAudience,
      '',
      'VALUE PROPOSITIONS:',
      ...tpl.valueProps.map((v, i) => `${i + 1}. ${v}`),
      '',
      'HOOKS:',
      ...tpl.hooks.map((h, i) => `${i + 1}. ${h}`),
      '',
      'ANGLES:',
      ...tpl.angles.map((a, i) => `${i + 1}. ${a}`),
      '',
      'VISUAL DIRECTION:',
      ...tpl.visualDirection.map((v, i) => `${i + 1}. ${v}`),
      '',
      'PLATFORM RECOMMENDATIONS:',
      ...tpl.platformRecommendations.map((p) => `- ${p.platform} (${p.format}): ${p.recommendation}`),
      '',
      'COMPLIANCE NOTES:',
      ...tpl.complianceNotes.map((c, i) => `${i + 1}. ${c}`),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6" /> {t('briefTemplateBuilder.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('briefTemplateBuilder.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6" /> {t('briefTemplateBuilder.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('briefTemplateBuilder.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="btbIndustry" className="block text-sm font-medium mb-1">{t('briefTemplateBuilder.industry')}</label>
              <select id="btbIndustry" value={industry} onChange={(e) => setIndustry(e.target.value as Industry)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
                {INDUSTRIES.map((ind) => <option key={ind.value} value={ind.value}>{t(ind.labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="btbCategory" className="block text-sm font-medium mb-1">{t('briefTemplateBuilder.productCategory')}</label>
              <input id="btbCategory" type="text" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} placeholder="e.g., skincare serum, wireless earbuds" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">{t('briefTemplateBuilder.brandKit')}</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="btbBrandName" className="block text-sm font-medium mb-1">{t('briefTemplateBuilder.brandName')}</label>
                <input id="btbBrandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={t('common.phAcme')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="btbTone" className="block text-sm font-medium mb-1">{t('briefTemplateBuilder.brandTone')}</label>
                <input id="btbTone" type="text" value={brandTone} onChange={(e) => setBrandTone(e.target.value)} placeholder="e.g., playful, professional" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="btbColors" className="block text-sm font-medium mb-1">{t('briefTemplateBuilder.brandColors')}</label>
                <input id="btbColors" type="text" value={brandColors} onChange={(e) => setBrandColors(e.target.value)} placeholder="e.g., #FF0000, #00B2FC" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="btbUrl" className="block text-sm font-medium mb-1">{t('briefTemplateBuilder.productUrl')}</label>
            <input id="btbUrl" type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder={t('briefTemplateBuilder.urlPlaceholder')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>

          <button onClick={generate} disabled={loading || !productCategory.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('briefTemplateBuilder.generating') : `${t('briefTemplateBuilder.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('briefTemplateBuilder.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('briefTemplateBuilder.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{result.dryRun ? t('briefTemplateBuilder.presets') : t('briefTemplateBuilder.aiGenerated')}</span>
              <button onClick={copyTemplate} className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium hover:bg-hover flex items-center gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('briefTemplateBuilder.copied') : t('briefTemplateBuilder.copy')}
              </button>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2"><Users className="w-4 h-4" /> {t('briefTemplateBuilder.targetAudience')}</h3>
              <p className="text-sm text-fg-muted">{result.template.targetAudience}</p>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Zap className="w-4 h-4" /> {t('briefTemplateBuilder.valueProps')}</h3>
              <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                {result.template.valueProps.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Anchor className="w-4 h-4" /> {t('briefTemplateBuilder.hooks')}</h3>
              <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                {result.template.hooks.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Eye className="w-4 h-4" /> {t('briefTemplateBuilder.angles')}</h3>
              <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                {result.template.angles.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Palette className="w-4 h-4" /> {t('briefTemplateBuilder.visualDirection')}</h3>
              <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                {result.template.visualDirection.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Share2 className="w-4 h-4" /> {t('briefTemplateBuilder.platformRecommendations')}</h3>
              <div className="space-y-2">
                {result.template.platformRecommendations.map((p, i) => (
                  <div key={i} className="border-l-2 border-border pl-3">
                    <div className="text-sm font-medium">{p.platform} <span className="text-fg-muted">({p.format})</span></div>
                    <p className="text-xs text-fg-muted">{p.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4" /> {t('briefTemplateBuilder.complianceNotes')}</h3>
              <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                {result.template.complianceNotes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
