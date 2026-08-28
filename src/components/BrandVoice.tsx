'use client';

import { useState, useCallback } from 'react';
import { MessageSquareQuote, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { BrandVoiceResult } from '@/lib/creative/brand-voice';

interface CreativeInput { creativeId: string; content: string; }

export function BrandVoice() {
  const { t } = useI18n();
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [samples, setSamples] = useState<CreativeInput[]>([]);
  const [toCheck, setToCheck] = useState<CreativeInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BrandVoiceResult | null>(null);

  const addSample = () => setSamples((p) => [...p, { creativeId: `s${p.length + 1}`, content: '' }]);
  const addCheck = () => setToCheck((p) => [...p, { creativeId: `c${p.length + 1}`, content: '' }]);

  const analyze = useCallback(async () => {
    if (!brandName.trim()) { setError(t('brandVoice.brandNameRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/brand-voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, brandDescription, brandGuidelines, sampleCreatives: samples.filter((s) => s.content.trim()), creativesToCheck: toCheck.filter((c) => c.content.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [brandName, brandDescription, brandGuidelines, samples, toCheck, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquareQuote className="w-5 h-5" /> {t('brandVoice.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('brandVoice.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div><label htmlFor="bv-name" className="block text-sm font-medium mb-1">{t('brandVoice.brandName')}</label><input id="bv-name" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /></div>
        <div><label htmlFor="bv-desc" className="block text-sm font-medium mb-1">{t('brandVoice.brandDescription')}</label><textarea id="bv-desc" value={brandDescription} onChange={(e) => setBrandDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /></div>
        <div><label htmlFor="bv-guide" className="block text-sm font-medium mb-1">{t('brandVoice.brandGuidelines')}</label><textarea id="bv-guide" value={brandGuidelines} onChange={(e) => setBrandGuidelines(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /></div>

        <details className="rounded-lg border border-border bg-bg-card p-3">
          <summary className="text-sm font-medium cursor-pointer">{t('brandVoice.sampleCreatives')}</summary>
          <div className="mt-2 space-y-2">{samples.map((s, i) => (<div key={i} className="flex gap-2"><input type="text" placeholder="Content" value={s.content} onChange={(e) => setSamples((p) => p.map((x, idx) => idx === i ? { ...x, content: e.target.value } : x))} className="flex-1 rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /><button onClick={() => setSamples((p) => p.filter((_, idx) => idx !== i))} className="text-fg-muted hover:text-danger"><X className="w-4 h-4" /></button></div>))}<button onClick={addSample} className="text-xs text-brand-accent flex items-center gap-1"><Plus className="w-3 h-3" /> {t('brandVoice.addSample')}</button></div>
        </details>

        <details className="rounded-lg border border-border bg-bg-card p-3">
          <summary className="text-sm font-medium cursor-pointer">{t('brandVoice.creativesToCheck')}</summary>
          <div className="mt-2 space-y-2">{toCheck.map((c, i) => (<div key={i} className="flex gap-2"><input type="text" placeholder="Content to check" value={c.content} onChange={(e) => setToCheck((p) => p.map((x, idx) => idx === i ? { ...x, content: e.target.value } : x))} className="flex-1 rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /><button onClick={() => setToCheck((p) => p.filter((_, idx) => idx !== i))} className="text-fg-muted hover:text-danger"><X className="w-4 h-4" /></button></div>))}<button onClick={addCheck} className="text-xs text-brand-accent flex items-center gap-1"><Plus className="w-3 h-3" /> {t('brandVoice.addCreative')}</button></div>
        </details>

        <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareQuote className="w-4 h-4" />}
          {loading ? t('brandVoice.analyzing') : `${t('brandVoice.analyze')} (6 ${t('brandVoice.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Profile */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium mb-3">{t('brandVoice.profile')}</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-fg-muted">{t('brandVoice.tones')}:</span> <div className="flex flex-wrap gap-1 mt-1">{result.profile.voiceTones.map((to, i) => <span key={i} className="text-xs bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded capitalize">{to}</span>)}</div></div>
              <div><span className="text-fg-muted">{t('brandVoice.attributes')}:</span> <div className="flex flex-wrap gap-1 mt-1">{result.profile.voiceAttributes.map((a, i) => <span key={i} className="text-xs bg-bg-secondary px-2 py-0.5 rounded capitalize">{a}</span>)}</div></div>
              <div><span className="text-fg-muted">{t('brandVoice.pillars')}:</span> <div className="flex flex-wrap gap-1 mt-1">{result.profile.messagingPillars.map((p, i) => <span key={i} className="text-xs bg-bg-secondary px-2 py-0.5 rounded capitalize">{p.replace(/_/g, ' ')}</span>)}</div></div>
              {result.profile.vocabulary.preferred.length > 0 && <div><span className="text-fg-muted">{t('brandVoice.preferred')}:</span> {result.profile.vocabulary.preferred.join(', ')}</div>}
              {result.profile.vocabulary.avoided.length > 0 && <div><span className="text-fg-muted">{t('brandVoice.avoided')}:</span> {result.profile.vocabulary.avoided.join(', ')}</div>}
              {result.profile.doList.length > 0 && <div className="text-xs"><span className="text-success">Do:</span> {result.profile.doList.join(', ')}</div>}
              {result.profile.dontList.length > 0 && <div className="text-xs"><span className="text-danger">Don&apos;t:</span> {result.profile.dontList.join(', ')}</div>}
            </div>
          </div>

          {/* Overall Consistency */}
          {result.consistencyChecks.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4 text-center">
              <div className="text-xs text-fg-muted">{t('brandVoice.overallConsistency')}</div>
              <div className={`text-4xl font-bold ${result.overallConsistency >= 70 ? 'text-success' : result.overallConsistency >= 50 ? 'text-warning' : 'text-danger'}`}>{result.overallConsistency}</div>
              <div className={`text-xs ${result.consistencyTrend === 'improving' ? 'text-success' : result.consistencyTrend === 'declining' ? 'text-danger' : 'text-fg-muted'}`}>{result.consistencyTrend}</div>
            </div>
          )}

          {/* Consistency Checks */}
          {result.consistencyChecks.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{c.creativeId}</span><span className={`text-xs font-bold ${c.overallScore >= 70 ? 'text-success' : c.overallScore >= 50 ? 'text-warning' : 'text-danger'}`}>{c.overallScore}/100</span></div>
              <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                <div>Tone: {c.toneScore}</div><div>Msg: {c.messagingScore}</div><div>Vocab: {c.vocabularyScore}</div><div>Style: {c.styleScore}</div>
              </div>
              {c.issues.length > 0 && <div className="space-y-1">{c.issues.map((iss, j) => (<div key={j} className="text-xs flex gap-2"><span className={`font-medium ${iss.severity === 'critical' ? 'text-danger' : iss.severity === 'major' ? 'text-warning' : iss.severity === 'minor' ? 'text-warning' : 'text-brand-accent'}`}>{iss.severity}</span><span className="flex-1">{iss.description}</span><span className="text-success">{iss.suggestion}</span></div>))}</div>}
            </div>
          ))}

          {/* Auto Corrections */}
          {result.autoCorrections.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('brandVoice.autoCorrections')}</h3>
              <div className="space-y-2">{result.autoCorrections.map((ac, i) => (<div key={i} className="text-xs"><div className="text-danger line-through">{ac.originalText}</div><div className="text-success">{ac.correctedText}</div><div className="text-fg-muted">{ac.changeType.replace(/_/g, ' ')} — {ac.confidence}% confidence</div></div>))}</div>
            </div>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('brandVoice.insights')}</h3>
              <div className="space-y-2">{result.insights.map((ins, i) => (<div key={i} className="text-sm border-l-2 border-brand-accent pl-3"><span className="text-xs uppercase font-medium text-brand-accent">{ins.type.replace(/_/g, ' ')}</span><p className="font-medium">{ins.title}</p><p className="text-xs text-fg-muted">{ins.description}</p><p className="text-xs text-success">{ins.actionableRecommendation}</p></div>))}</div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('brandVoice.recommendations')}</h3>
              <div className="space-y-2">{result.recommendations.map((r, i) => (<div key={i} className="flex gap-3"><span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span><div className="flex-1"><p className="text-sm">{r.recommendation}</p><p className="text-xs text-success">{r.expectedImpact}</p></div></div>))}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
