'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Loader2, AlertCircle, Sparkles, Microscope, Lightbulb, Wand2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface Hook {
  text?: string;
  type?: string;
  timing?: string;
}

interface Evidence {
  hooks?: Hook[];
  angles?: string[];
  pacing?: string;
  visualStyle?: string;
  emotionalBeats?: string[];
  ctaStructure?: string;
}

interface Analysis {
  whatWorks?: string[];
  whatDoesnt?: string[];
  whyItWorks?: string;
  targetAudienceFit?: string;
  platformOptimization?: string;
  performancePredictors?: string[];
}

interface RemixBrief {
  concept?: string;
  hookStrategy?: string;
  angleStrategy?: string;
  visualDirection?: string;
  pacingGuidance?: string;
  ctaStrategy?: string;
  differentiationNotes?: string;
  generationPrompt?: string;
}

interface ReferenceRemixResult {
  evidence?: Evidence;
  analysis?: Analysis;
  remixBrief?: RemixBrief;
}

const CREDIT_COST = 4;

export function ReferenceRemixStudio() {
  const { t } = useI18n();
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceType, setReferenceType] = useState('video');
  const [targetProduct, setTargetProduct] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [preserveElements, setPreserveElements] = useState('');
  const [changeElements, setChangeElements] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReferenceRemixResult | null>(null);

  const analyze = useCallback(async () => {
    if (!referenceUrl.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const res = await fetch('/api/creative/reference-remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceUrl,
          referenceType,
          targetProduct: targetProduct || undefined,
          targetAudience: targetAudience || undefined,
          platform,
          preserveElements: splitList(preserveElements),
          changeElements: splitList(changeElements),
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
  }, [referenceUrl, referenceType, targetProduct, targetAudience, platform, preserveElements, changeElements]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><RefreshCw className="w-5 h-5" /> {t('referenceRemix.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('referenceRemix.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="rrReferenceUrl" className="block text-sm font-medium mb-1">{t('referenceRemix.referenceUrl')}</label>
          <input id="rrReferenceUrl" type="url" value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder={t('referenceRemix.phReferenceUrl')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label htmlFor="rrReferenceType" className="block text-sm font-medium mb-1">{t('referenceRemix.referenceType')}</label>
          <select id="rrReferenceType" value={referenceType} onChange={(e) => setReferenceType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="ad_copy">Ad Copy</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="rrTargetProduct" className="block text-sm font-medium mb-1">{t('referenceRemix.targetProduct')}</label>
            <input id="rrTargetProduct" type="text" value={targetProduct} onChange={(e) => setTargetProduct(e.target.value)} placeholder={t('referenceRemix.phTargetProduct')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="rrTargetAudience" className="block text-sm font-medium mb-1">{t('referenceRemix.targetAudience')}</label>
            <input id="rrTargetAudience" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder={t('referenceRemix.phTargetAudience')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <div>
          <label htmlFor="rrPlatform" className="block text-sm font-medium mb-1">{t('referenceRemix.platform')}</label>
          <select id="rrPlatform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>

        <div>
          <label htmlFor="rrPreserveElements" className="block text-sm font-medium mb-1">{t('referenceRemix.preserveElements')}</label>
          <input id="rrPreserveElements" type="text" value={preserveElements} onChange={(e) => setPreserveElements(e.target.value)} placeholder={t('referenceRemix.phPreserveElements')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label htmlFor="rrChangeElements" className="block text-sm font-medium mb-1">{t('referenceRemix.changeElements')}</label>
          <input id="rrChangeElements" type="text" value={changeElements} onChange={(e) => setChangeElements(e.target.value)} placeholder={t('referenceRemix.phChangeElements')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <button onClick={analyze} disabled={loading || !referenceUrl.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? t('referenceRemix.analyzing') : `${t('referenceRemix.analyze')} (${CREDIT_COST} ${t('referenceRemix.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {result.evidence && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Microscope className="w-4 h-4" /> {t('referenceRemix.evidence')}</h3>
              <div className="space-y-3 text-sm">
                {result.evidence.hooks && result.evidence.hooks.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr><th className="text-left py-1">Hook</th><th className="text-left py-1">Type</th><th className="text-left py-1">Timing</th></tr></thead>
                      <tbody>
                        {result.evidence.hooks.map((h, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="py-1">{h.text}</td>
                            <td className="py-1">{h.type}</td>
                            <td className="py-1">{h.timing}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {result.evidence.angles && result.evidence.angles.length > 0 && (
                  <div><span className="font-medium">Angles:</span> {result.evidence.angles.join(', ')}</div>
                )}
                {result.evidence.pacing && <p><span className="font-medium">Pacing:</span> {result.evidence.pacing}</p>}
                {result.evidence.visualStyle && <p><span className="font-medium">Visual Style:</span> {result.evidence.visualStyle}</p>}
                {result.evidence.emotionalBeats && result.evidence.emotionalBeats.length > 0 && (
                  <div><span className="font-medium">Emotional Beats:</span> {result.evidence.emotionalBeats.join(', ')}</div>
                )}
                {result.evidence.ctaStructure && <p><span className="font-medium">CTA Structure:</span> {result.evidence.ctaStructure}</p>}
              </div>
            </div>
          )}

          {result.analysis && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4" /> {t('referenceRemix.analysis')}</h3>
              <div className="space-y-2 text-sm">
                {result.analysis.whatWorks && result.analysis.whatWorks.length > 0 && (
                  <div><span className="font-medium text-success">What Works:</span> {result.analysis.whatWorks.join(', ')}</div>
                )}
                {result.analysis.whatDoesnt && result.analysis.whatDoesnt.length > 0 && (
                  <div><span className="font-medium text-danger">What Doesn&apos;t:</span> {result.analysis.whatDoesnt.join(', ')}</div>
                )}
                {result.analysis.whyItWorks && <p><span className="font-medium">Why It Works:</span> {result.analysis.whyItWorks}</p>}
                {result.analysis.targetAudienceFit && <p><span className="font-medium">Audience Fit:</span> {result.analysis.targetAudienceFit}</p>}
                {result.analysis.platformOptimization && <p><span className="font-medium">Platform Optimization:</span> {result.analysis.platformOptimization}</p>}
                {result.analysis.performancePredictors && result.analysis.performancePredictors.length > 0 && (
                  <div><span className="font-medium">Performance Predictors:</span> {result.analysis.performancePredictors.join(', ')}</div>
                )}
              </div>
            </div>
          )}

          {result.remixBrief && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Wand2 className="w-4 h-4" /> {t('referenceRemix.remixBrief')}</h3>
              <div className="space-y-2 text-sm">
                {result.remixBrief.concept && <p><span className="font-medium">Concept:</span> {result.remixBrief.concept}</p>}
                {result.remixBrief.hookStrategy && <p><span className="font-medium">Hook Strategy:</span> {result.remixBrief.hookStrategy}</p>}
                {result.remixBrief.angleStrategy && <p><span className="font-medium">Angle Strategy:</span> {result.remixBrief.angleStrategy}</p>}
                {result.remixBrief.visualDirection && <p><span className="font-medium">Visual Direction:</span> {result.remixBrief.visualDirection}</p>}
                {result.remixBrief.pacingGuidance && <p><span className="font-medium">Pacing Guidance:</span> {result.remixBrief.pacingGuidance}</p>}
                {result.remixBrief.ctaStrategy && <p><span className="font-medium">CTA Strategy:</span> {result.remixBrief.ctaStrategy}</p>}
                {result.remixBrief.differentiationNotes && <p><span className="font-medium">Differentiation:</span> {result.remixBrief.differentiationNotes}</p>}
                {result.remixBrief.generationPrompt && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">Generation Prompt:</p>
                    <pre className="text-xs bg-bg-secondary rounded-lg p-3 overflow-x-auto whitespace-pre-wrap"><code>{result.remixBrief.generationPrompt}</code></pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
