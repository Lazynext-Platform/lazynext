'use client';

import { useState, useCallback } from 'react';
import { Package, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { CreatorKitResult } from '@/lib/creative/creator-kits';

export function CreatorKits() {
  const { t } = useI18n();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [campaignGoal, setCampaignGoal] = useState('awareness');
  const [targetAudience, setTargetAudience] = useState('');
  const [keySellingPoints, setKeySellingPoints] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreatorKitResult | null>(null);

  const generate = useCallback(async () => {
    if (!productName.trim() || !productDescription.trim()) {
      setError(t('creatorKits.fieldsRequired'));
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/creator-kits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, productDescription, platform, campaignGoal, targetAudience, keySellingPoints, brandGuidelines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productName, productDescription, platform, campaignGoal, targetAudience, keySellingPoints, brandGuidelines, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="w-5 h-5" /> {t('creatorKits.builderTitle')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('creatorKits.builderSubtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="ck-name" className="block text-sm font-medium mb-1">{t('creatorKits.productName')}</label>
          <input id="ck-name" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t('creatorKits.productNamePlaceholder')} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('creatorKits.productName')} />
        </div>
        <div>
          <label htmlFor="ck-desc" className="block text-sm font-medium mb-1">{t('creatorKits.productDescription')}</label>
          <textarea id="ck-desc" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={4} placeholder={t('creatorKits.productDescriptionPlaceholder')} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('creatorKits.productDescription')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ck-platform" className="block text-sm font-medium mb-1">{t('creatorKits.platform')}</label>
            <select id="ck-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('creatorKits.platform')}>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="snapchat">Snapchat</option>
              <option value="twitter">Twitter/X</option>
            </select>
          </div>
          <div>
            <label htmlFor="ck-goal" className="block text-sm font-medium mb-1">{t('creatorKits.campaignGoal')}</label>
            <select id="ck-goal" value={campaignGoal} onChange={(e) => setCampaignGoal(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('creatorKits.campaignGoal')}>
              <option value="awareness">Awareness</option>
              <option value="consideration">Consideration</option>
              <option value="conversion">Conversion</option>
              <option value="engagement">Engagement</option>
              <option value="retention">Retention</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ck-audience" className="block text-sm font-medium mb-1">{t('creatorKits.targetAudience')}</label>
          <input id="ck-audience" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('creatorKits.targetAudience')} />
        </div>
        <div>
          <label htmlFor="ck-points" className="block text-sm font-medium mb-1">{t('creatorKits.keySellingPoints')}</label>
          <textarea id="ck-points" value={keySellingPoints} onChange={(e) => setKeySellingPoints(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('creatorKits.keySellingPoints')} />
        </div>
        <div>
          <label htmlFor="ck-brand" className="block text-sm font-medium mb-1">{t('creatorKits.brandGuidelines')}</label>
          <textarea id="ck-brand" value={brandGuidelines} onChange={(e) => setBrandGuidelines(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('creatorKits.brandGuidelines')} />
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={generate} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('creatorKits.generate')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
        {loading ? t('creatorKits.generating') : t('creatorKits.generate')} <span className="text-xs opacity-75">({t('creatorKits.credits')}: 6)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          {/* Kit metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('creatorKits.platform')}</p><p className="text-sm font-bold capitalize">{result.kit.platform}</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('creatorKits.campaignGoal')}</p><p className="text-sm font-bold capitalize">{result.kit.campaignGoal}</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('creatorKits.estimatedReach')}</p><p className="text-xs font-bold">{result.estimatedReach}</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('creatorKits.estimatedEngagement')}</p><p className="text-sm font-bold">{result.estimatedEngagement}</p></div>
          </div>

          {/* Brief */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-1">
            <h3 className="text-sm font-semibold">{result.kit.kitName}</h3>
            <p className="text-sm text-fg-muted">{result.kit.brief.overview}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.objective')}:</span> {result.kit.brief.objective}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.keyMessage')}:</span> {result.kit.brief.keyMessage}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.toneStyle')}:</span> {result.kit.brief.toneStyle}</p>
          </div>

          {/* Talking points */}
          {result.kit.talkingPoints.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('creatorKits.talkingPoints')}</h3>
              <ol className="space-y-2 text-sm text-fg-muted">
                {result.kit.talkingPoints.map((tp, i) => (
                  <li key={i} className="border-l-2 border-border pl-3">
                    <span className="font-medium text-fg">#{tp.priority}: {tp.point}</span>
                    <p className="text-xs mt-0.5">{tp.elaboration}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Product info */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-1">
            <h3 className="text-sm font-semibold">{t('creatorKits.productInfo')}</h3>
            {result.kit.productInfo.keyFeatures.length > 0 && (
              <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.keyFeatures')}:</span> {result.kit.productInfo.keyFeatures.join(', ')}</p>
            )}
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.usageInstructions')}:</span> {result.kit.productInfo.usageInstructions}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.pricingContext')}:</span> {result.kit.productInfo.pricingContext}</p>
          </div>

          {/* Dos and Don'ts */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('creatorKits.dosAndDonts')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium text-success mb-1">{t('creatorKits.dos')}</p>
                <ul className="space-y-1 text-fg-muted">{result.kit.dosAndDonts.dos.map((d, i) => <li key={i}>✓ {d}</li>)}</ul>
              </div>
              <div>
                <p className="font-medium text-danger mb-1">{t('creatorKits.donts')}</p>
                <ul className="space-y-1 text-fg-muted">{result.kit.dosAndDonts.donts.map((d, i) => <li key={i}>✗ {d}</li>)}</ul>
              </div>
            </div>
          </div>

          {/* Delivery specs */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('creatorKits.deliverySpecs')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-fg-muted">
              <div><span className="font-medium">{t('creatorKits.videoLength')}:</span> {result.kit.deliverySpecs.videoLength}</div>
              <div><span className="font-medium">{t('creatorKits.format')}:</span> {result.kit.deliverySpecs.format}</div>
              <div><span className="font-medium">{t('creatorKits.resolution')}:</span> {result.kit.deliverySpecs.resolution}</div>
              <div><span className="font-medium">{t('creatorKits.fileFormat')}:</span> {result.kit.deliverySpecs.fileFormat}</div>
              <div><span className="font-medium">{t('creatorKits.deadline')}:</span> {result.kit.deliverySpecs.deadline}</div>
              <div><span className="font-medium">{t('creatorKits.submissionMethod')}:</span> {result.kit.deliverySpecs.submissionMethod}</div>
            </div>
          </div>

          {/* Hooks & CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.kit.hookSuggestions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-secondary p-4">
                <h3 className="text-sm font-semibold mb-2">{t('creatorKits.hookSuggestions')}</h3>
                <ul className="space-y-1 text-sm text-fg-muted">{result.kit.hookSuggestions.map((h, i) => <li key={i}>• {h}</li>)}</ul>
              </div>
            )}
            {result.kit.ctaOptions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-secondary p-4">
                <h3 className="text-sm font-semibold mb-2">{t('creatorKits.ctaOptions')}</h3>
                <ul className="space-y-1 text-sm text-fg-muted">{result.kit.ctaOptions.map((c, i) => <li key={i}>• {c}</li>)}</ul>
              </div>
            )}
          </div>

          {/* Visual guidelines */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-1">
            <h3 className="text-sm font-semibold">{t('creatorKits.visualGuidelines')}</h3>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.setting')}:</span> {result.kit.visualGuidelines.setting}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.lighting')}:</span> {result.kit.visualGuidelines.lighting}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.wardrobe')}:</span> {result.kit.visualGuidelines.wardrobe}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.background')}:</span> {result.kit.visualGuidelines.background}</p>
            {result.kit.visualGuidelines.props.length > 0 && (
              <p className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.props')}:</span> {result.kit.visualGuidelines.props.join(', ')}</p>
            )}
          </div>

          {/* Compliance notes */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
            <h3 className="text-sm font-semibold">{t('creatorKits.complianceNotes')}</h3>
            <div className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.disclosureRequirements')}:</span><ul className="list-disc pl-4">{result.kit.complianceNotes.disclosureRequirements.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
            <div className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.restrictedClaims')}:</span><ul className="list-disc pl-4">{result.kit.complianceNotes.restrictedClaims.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
            <div className="text-xs text-fg-muted"><span className="font-medium">{t('creatorKits.platformSpecificRules')}:</span><ul className="list-disc pl-4">{result.kit.complianceNotes.platformSpecificRules.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
          </div>

          {/* Creator tips */}
          {result.creatorTips.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('creatorKits.creatorTips')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.creatorTips.map((tip, i) => <li key={i}>• {tip}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
