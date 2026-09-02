'use client';

import { useState, useCallback } from 'react';
import { TrendingUp, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface CreativeLearning {
  dimension?: string;
  insight?: string;
  confidence?: number;
  sampleSize?: number;
  recommendedAction?: string;
}

interface ImprovedBrief {
  originalAngle?: string;
  improvedAngle?: string;
  improvementReason?: string;
  expectedLift?: string;
  adjustedHooks?: string[];
  adjustedScriptOutline?: string;
  adjustedCta?: string;
}

interface PerformanceLoopResult {
  learnings?: CreativeLearning[];
  improvedBriefs?: ImprovedBrief[];
  summary?: string;
  topPerformingPatterns?: string[];
  underperformingPatterns?: string[];
  recommendedNextSteps?: string[];
  generationPrompt?: string;
}

const CREDIT_COST = 5;

export function PerformanceLoopStudio() {
  const { t } = useI18n();
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PerformanceLoopResult | null>(null);

  const generate = useCallback(async () => {
    if (!productName.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/performance-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productUrl: productUrl || undefined,
          audience: audience || undefined,
          platform,
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
  }, [productName, productUrl, audience, platform]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> {t('performanceLoop.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('performanceLoop.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="plProductName" className="block text-sm font-medium mb-1">{t('performanceLoop.productName')}</label>
          <input id="plProductName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t('performanceLoop.phProductName')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label htmlFor="plProductUrl" className="block text-sm font-medium mb-1">{t('performanceLoop.productUrl')}</label>
          <input id="plProductUrl" type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder={t('performanceLoop.phProductUrl')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="plAudience" className="block text-sm font-medium mb-1">{t('performanceLoop.audience')}</label>
            <input id="plAudience" type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={t('performanceLoop.phAudience')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="plPlatform" className="block text-sm font-medium mb-1">{t('performanceLoop.platform')}</label>
            <select id="plPlatform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
        </div>

        <button onClick={generate} disabled={loading || !productName.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? t('performanceLoop.loading') : `${t('performanceLoop.generate')} (${CREDIT_COST} ${t('performanceLoop.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {result.summary && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4" /> {t('performanceLoop.summary')}</h3>
              <p className="text-sm">{result.summary}</p>
            </div>
          )}

          {result.learnings && result.learnings.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /> {t('performanceLoop.learnings')}</h3>
              <div className="space-y-2">
                {result.learnings.map((l, i) => (
                  <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
                    <p className="text-sm font-medium">{l.dimension}</p>
                    {l.insight && <p className="text-xs text-fg-muted">{l.insight}</p>}
                    {l.recommendedAction && <p className="text-xs mt-1"><span className="font-medium">Action:</span> {l.recommendedAction}</p>}
                    {l.confidence != null && <p className="text-xs text-fg-muted mt-1">Confidence: {Math.round((l.confidence ?? 0) * 100)}% · n={l.sampleSize ?? 0}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.improvedBriefs && result.improvedBriefs.length > 0 && (
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4" /> {t('performanceLoop.improvedBriefs')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.improvedBriefs.map((b, i) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                    {b.originalAngle && <p className="text-xs text-fg-muted"><span className="font-medium">Original:</span> {b.originalAngle}</p>}
                    {b.improvedAngle && <p className="text-sm font-bold mt-1">{b.improvedAngle}</p>}
                    {b.improvementReason && <p className="text-xs text-fg-muted mt-1">{b.improvementReason}</p>}
                    {b.expectedLift && <p className="text-xs text-brand-accent mt-1"><span className="font-medium">Expected lift:</span> {b.expectedLift}</p>}
                    {b.adjustedHooks && b.adjustedHooks.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">Hooks:</p>
                        <ul className="text-xs text-fg-muted list-disc list-inside">
                          {b.adjustedHooks.map((h, j) => <li key={j}>{h}</li>)}
                        </ul>
                      </div>
                    )}
                    {b.adjustedScriptOutline && <p className="text-xs mt-1"><span className="font-medium">Script:</span> {b.adjustedScriptOutline}</p>}
                    {b.adjustedCta && <p className="text-xs text-brand-accent mt-1"><span className="font-medium">CTA:</span> {b.adjustedCta}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.topPerformingPatterns && result.topPerformingPatterns.length > 0 && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-success" /> {t('performanceLoop.topPerforming')}</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {result.topPerformingPatterns.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {result.underperformingPatterns && result.underperformingPatterns.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-warning" /> {t('performanceLoop.underperforming')}</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {result.underperformingPatterns.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {result.recommendedNextSteps && result.recommendedNextSteps.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4" /> {t('performanceLoop.nextSteps')}</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {result.recommendedNextSteps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {result.generationPrompt && (
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-brand-accent" /> {t('performanceLoop.generationPrompt')}</h3>
              <pre className="text-xs whitespace-pre-wrap break-words bg-bg-card rounded-lg border border-border p-3 overflow-x-auto"><code>{result.generationPrompt}</code></pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
