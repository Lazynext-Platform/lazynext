'use client';

import { useState, useCallback } from 'react';
import { FileText, Loader2, AlertCircle, Sparkles, Clapperboard, Film, CheckCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface ProductRead {
  name?: string;
  category?: string;
  audience?: string;
  keyBenefits?: string[];
  positioning?: string;
}

interface Angle {
  name?: string;
  emotionalTrigger?: string;
  hook?: string;
  valueProposition?: string;
  cta?: string;
}

interface Scene {
  sceneNumber?: number;
  duration?: string;
  visualDescription?: string;
  cameraAngle?: string;
  onScreenText?: string;
  voiceover?: string;
  transitionTo?: string;
}

interface Script {
  angleName?: string;
  platform?: string;
  durationSec?: number;
  scenes?: Scene[];
}

interface ProductBriefResult {
  productRead?: ProductRead;
  angles?: Angle[];
  scripts?: Script[];
  storyboard?: Scene[];
  generationPrompt?: string;
  complianceNotes?: string[];
}

const CREDIT_COST = 5;

export function ProductBriefStudio() {
  const { t } = useI18n();
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [durationSeconds, setDurationSeconds] = useState('30');
  const [price, setPrice] = useState('');
  const [benefits, setBenefits] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [proofPoints, setProofPoints] = useState('');
  const [offer, setOffer] = useState('');
  const [tone, setTone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProductBriefResult | null>(null);

  const generate = useCallback(async () => {
    if (!productName.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const res = await fetch('/api/creative/product-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productUrl: productUrl || undefined,
          category: category || undefined,
          audience: audience || undefined,
          platform,
          durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
          price: price || undefined,
          benefits: splitList(benefits),
          painPoints: splitList(painPoints),
          proofPoints: splitList(proofPoints),
          offer: offer || undefined,
          tone: tone || undefined,
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
  }, [productName, productUrl, category, audience, platform, durationSeconds, price, benefits, painPoints, proofPoints, offer, tone]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5" /> {t('productBrief.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('productBrief.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="pbProductName" className="block text-sm font-medium mb-1">{t('productBrief.productName')}</label>
          <input id="pbProductName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t('productBrief.phProductName')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label htmlFor="pbProductUrl" className="block text-sm font-medium mb-1">{t('productBrief.productUrl')}</label>
          <input id="pbProductUrl" type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder={t('productBrief.phProductUrl')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="pbCategory" className="block text-sm font-medium mb-1">{t('productBrief.category')}</label>
            <input id="pbCategory" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('productBrief.phCategory')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="pbAudience" className="block text-sm font-medium mb-1">{t('productBrief.audience')}</label>
            <input id="pbAudience" type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={t('productBrief.phAudience')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="pbPlatform" className="block text-sm font-medium mb-1">{t('productBrief.platform')}</label>
            <select id="pbPlatform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          <div>
            <label htmlFor="pbDuration" className="block text-sm font-medium mb-1">{t('productBrief.duration')}</label>
            <input id="pbDuration" type="number" value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="pbPrice" className="block text-sm font-medium mb-1">{t('productBrief.price')}</label>
            <input id="pbPrice" type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('productBrief.phPrice')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <div>
          <label htmlFor="pbBenefits" className="block text-sm font-medium mb-1">{t('productBrief.benefits')}</label>
          <input id="pbBenefits" type="text" value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder={t('productBrief.phBenefits')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label htmlFor="pbPainPoints" className="block text-sm font-medium mb-1">{t('productBrief.painPoints')}</label>
          <input id="pbPainPoints" type="text" value={painPoints} onChange={(e) => setPainPoints(e.target.value)} placeholder={t('productBrief.phPainPoints')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label htmlFor="pbProofPoints" className="block text-sm font-medium mb-1">{t('productBrief.proofPoints')}</label>
          <input id="pbProofPoints" type="text" value={proofPoints} onChange={(e) => setProofPoints(e.target.value)} placeholder={t('productBrief.phProofPoints')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="pbOffer" className="block text-sm font-medium mb-1">{t('productBrief.offer')}</label>
            <input id="pbOffer" type="text" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={t('productBrief.phOffer')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="pbTone" className="block text-sm font-medium mb-1">{t('productBrief.tone')}</label>
            <input id="pbTone" type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder={t('productBrief.phTone')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <button onClick={generate} disabled={loading || !productName.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? t('productBrief.generating') : `${t('productBrief.generate')} (${CREDIT_COST} ${t('productBrief.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {result.productRead && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><FileText className="w-4 h-4" /> {t('productBrief.productRead')}</h3>
              <div className="text-sm space-y-1">
                {result.productRead.name && <p><span className="font-medium">Name:</span> {result.productRead.name}</p>}
                {result.productRead.category && <p><span className="font-medium">Category:</span> {result.productRead.category}</p>}
                {result.productRead.audience && <p><span className="font-medium">Audience:</span> {result.productRead.audience}</p>}
                {result.productRead.keyBenefits && result.productRead.keyBenefits.length > 0 && <p><span className="font-medium">Key Benefits:</span> {result.productRead.keyBenefits.join(', ')}</p>}
                {result.productRead.positioning && <p><span className="font-medium">Positioning:</span> {result.productRead.positioning}</p>}
              </div>
            </div>
          )}

          {result.angles && result.angles.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4" /> {t('productBrief.angles')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {result.angles.map((a, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    {a.name && <p className="text-sm font-medium">{a.name}</p>}
                    {a.emotionalTrigger && <p className="text-xs text-fg-muted mt-1">Trigger: {a.emotionalTrigger}</p>}
                    {a.hook && <p className="text-xs mt-1"><span className="font-medium">Hook:</span> {a.hook}</p>}
                    {a.valueProposition && <p className="text-xs mt-1"><span className="font-medium">Value:</span> {a.valueProposition}</p>}
                    {a.cta && <p className="text-xs mt-1 text-brand-accent"><span className="font-medium">CTA:</span> {a.cta}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.scripts && result.scripts.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Clapperboard className="w-4 h-4" /> {t('productBrief.scripts')}</h3>
              <div className="space-y-3">
                {result.scripts.map((s, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {s.angleName && <span className="text-sm font-medium">{s.angleName}</span>}
                      {s.platform && <span className="text-xs text-fg-muted">{s.platform}</span>}
                      {s.durationSec != null && <span className="text-xs text-fg-muted">{s.durationSec}s</span>}
                    </div>
                    {s.scenes && s.scenes.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr>
                            <th className="text-left py-1">#</th><th className="text-left py-1">Visual</th><th className="text-left py-1">Camera</th><th className="text-left py-1">On-screen</th><th className="text-left py-1">Voiceover</th>
                          </tr></thead>
                          <tbody>
                            {s.scenes.map((sc, j) => (
                              <tr key={j} className="border-t border-border">
                                <td className="py-1">{sc.sceneNumber ?? j + 1}</td>
                                <td className="py-1">{sc.visualDescription}</td>
                                <td className="py-1">{sc.cameraAngle}</td>
                                <td className="py-1">{sc.onScreenText}</td>
                                <td className="py-1">{sc.voiceover}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.storyboard && result.storyboard.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Film className="w-4 h-4" /> {t('productBrief.storyboard')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr>
                    <th className="text-left py-1">Scene</th><th className="text-left py-1">Duration</th><th className="text-left py-1">Visual</th><th className="text-left py-1">Camera</th><th className="text-left py-1">On-screen</th><th className="text-left py-1">Voiceover</th><th className="text-left py-1">Transition</th>
                  </tr></thead>
                  <tbody>
                    {result.storyboard.map((sc, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1">{sc.sceneNumber ?? i + 1}</td>
                        <td className="py-1">{sc.duration}</td>
                        <td className="py-1">{sc.visualDescription}</td>
                        <td className="py-1">{sc.cameraAngle}</td>
                        <td className="py-1">{sc.onScreenText}</td>
                        <td className="py-1">{sc.voiceover}</td>
                        <td className="py-1">{sc.transitionTo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.generationPrompt && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('productBrief.generationPrompt')}</h3>
              <pre className="text-xs bg-bg-secondary rounded-lg p-3 overflow-x-auto whitespace-pre-wrap"><code>{result.generationPrompt}</code></pre>
            </div>
          )}

          {result.complianceNotes && result.complianceNotes.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><CheckCircle className="w-4 h-4" /> {t('productBrief.complianceNotes')}</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {result.complianceNotes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
