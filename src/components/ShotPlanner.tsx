'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clapperboard, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { VideoShotPlanResult } from '@/lib/creative/shot-planner';

export function ShotPlanner() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [sourceContent, setSourceContent] = useState('');
  const [sourceType, setSourceType] = useState('script');
  const [format, setFormat] = useState('vertical_9_16');
  const [productionStyle, setProductionStyle] = useState('lifestyle');
  const [budgetTier, setBudgetTier] = useState('low');
  const [targetDuration, setTargetDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VideoShotPlanResult | null>(null);

  // Pre-fill from query params (cross-feature handoff from brand-concepts)
  useEffect(() => {
    const script = searchParams.get('script');
    if (script) {
      setSourceContent(script);
      setSourceType('script');
    }
  }, [searchParams]);

  const analyze = useCallback(async () => {
    if (!sourceContent.trim()) { setError(t('shotPlanner.contentRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/shot-planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceContent, sourceType, format, productionStyle, budgetTier, targetDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sourceContent, sourceType, format, productionStyle, budgetTier, targetDuration, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Clapperboard className="w-5 h-5" /> {t('shotPlanner.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('shotPlanner.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="sp-content" className="block text-sm font-medium mb-1">{t('shotPlanner.sourceContent')}</label>
          <textarea id="sp-content" value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} rows={5} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('shotPlanner.sourceContent')} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="sp-type" className="block text-sm font-medium mb-1">{t('shotPlanner.sourceType')}</label>
            <select id="sp-type" value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('shotPlanner.sourceType')}>
              <option value="brief">Brief</option>
              <option value="angle">Angle</option>
              <option value="script">Script</option>
              <option value="storyboard">Storyboard</option>
            </select>
          </div>
          <div>
            <label htmlFor="sp-format" className="block text-sm font-medium mb-1">{t('shotPlanner.format')}</label>
            <select id="sp-format" value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('shotPlanner.format')}>
              <option value="vertical_9_16">Vertical 9:16</option>
              <option value="horizontal_16_9">Horizontal 16:9</option>
              <option value="square_1_1">Square 1:1</option>
              <option value="story_9_16">Story 9:16</option>
              <option value="reel_9_16">Reel 9:16</option>
            </select>
          </div>
          <div>
            <label htmlFor="sp-style" className="block text-sm font-medium mb-1">{t('shotPlanner.productionStyle')}</label>
            <select id="sp-style" value={productionStyle} onChange={(e) => setProductionStyle(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('shotPlanner.productionStyle')}>
              <option value="studio">Studio</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="ugc">UGC</option>
              <option value="animated">Animated</option>
              <option value="mixed">Mixed</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
          <div>
            <label htmlFor="sp-budget" className="block text-sm font-medium mb-1">{t('shotPlanner.budgetTier')}</label>
            <select id="sp-budget" value={budgetTier} onChange={(e) => setBudgetTier(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('shotPlanner.budgetTier')}>
              <option value="shoestring">Shoestring ($0-100)</option>
              <option value="low">Low ($100-500)</option>
              <option value="medium">Medium ($500-2000)</option>
              <option value="high">High ($2000-10000)</option>
              <option value="premium">Premium ($10000+)</option>
            </select>
          </div>
          <div>
            <label htmlFor="sp-duration" className="block text-sm font-medium mb-1">{t('shotPlanner.targetDuration')}</label>
            <input id="sp-duration" type="number" min={5} max={180} value={targetDuration} onChange={(e) => setTargetDuration(Number(e.target.value))} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('shotPlanner.targetDuration')} />
          </div>
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('shotPlanner.analyze')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
        {loading ? t('shotPlanner.analyzing') : t('shotPlanner.analyze')} <span className="text-xs opacity-75">({t('shotPlanner.credits')}: 7)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          {/* Schedule Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('shotPlanner.totalShots')}</p><p className="text-xl font-bold">{result.schedule.totalShots}</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('shotPlanner.shootTime')}</p><p className="text-xl font-bold">{result.schedule.estimatedShootTime}h</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('shotPlanner.editTime')}</p><p className="text-xl font-bold">{result.schedule.estimatedEditTime}h</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('shotPlanner.estimatedCost')}</p><p className="text-xl font-bold">${result.schedule.estimatedTotalCost}</p></div>
          </div>

          {/* Quality Estimate */}
          <div className="rounded-lg border border-border bg-bg-secondary p-3">
            <p className="text-xs text-fg-muted">{t('shotPlanner.qualityEstimate')}: <span className="font-bold text-brand-accent">{result.estimatedQualityScore}/100</span></p>
          </div>

          {/* Shots */}
          {result.shots.map((shot, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold">{shot.shotNumber}. {shot.sceneLabel}</span>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{shot.shotType.replace(/_/g, ' ')}</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{shot.cameraMovement.replace(/_/g, ' ')}</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5">{shot.duration}s</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{shot.complexity}</span>
                </div>
              </div>
              <p className="text-sm text-fg-muted">{shot.visualDescription}</p>
              {shot.voiceoverScript && <p className="text-xs text-fg-muted italic">VO: {shot.voiceoverScript}</p>}
              {shot.onScreenText && <p className="text-xs text-fg-muted">Text: {shot.onScreenText}</p>}
              {shot.keyframes.length > 0 && (
                <div className="text-xs text-fg-muted">
                  <span className="font-medium">{t('shotPlanner.keyframes')}: </span>
                  {shot.keyframes.map((k, j) => <span key={j} className="inline-block bg-bg-primary rounded px-1.5 py-0.5 mr-1 mb-1">{k.timestamp}s</span>)}
                </div>
              )}
              {shot.productionNotes && <p className="text-xs text-fg-muted">{t('shotPlanner.productionNotes')}: {shot.productionNotes}</p>}
            </div>
          ))}

          {/* Pipeline */}
          {result.pipelineSteps.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('shotPlanner.pipeline')}</h3>
              {result.pipelineSteps.map((step, i) => (
                <div key={i} className="text-sm border-l-2 border-border pl-3 mb-2">
                  <span className="font-medium">{step.step}</span> — {step.description} <span className="text-xs text-fg-muted">({step.estimatedTime}h)</span>
                </div>
              ))}
            </div>
          )}

          {/* Checklists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.schedule.assetChecklist.length > 0 && <div className="rounded-lg border border-border bg-bg-secondary p-3"><h4 className="text-xs font-semibold mb-1">{t('shotPlanner.assets')}</h4><ul className="text-xs text-fg-muted space-y-0.5">{result.schedule.assetChecklist.map((a, i) => <li key={i}>• {a}</li>)}</ul></div>}
            {result.schedule.propChecklist.length > 0 && <div className="rounded-lg border border-border bg-bg-secondary p-3"><h4 className="text-xs font-semibold mb-1">{t('shotPlanner.props')}</h4><ul className="text-xs text-fg-muted space-y-0.5">{result.schedule.propChecklist.map((p, i) => <li key={i}>• {p}</li>)}</ul></div>}
            {result.schedule.locationChecklist.length > 0 && <div className="rounded-lg border border-border bg-bg-secondary p-3"><h4 className="text-xs font-semibold mb-1">{t('shotPlanner.locations')}</h4><ul className="text-xs text-fg-muted space-y-0.5">{result.schedule.locationChecklist.map((l, i) => <li key={i}>• {l}</li>)}</ul></div>}
            {result.schedule.equipmentChecklist.length > 0 && <div className="rounded-lg border border-border bg-bg-secondary p-3"><h4 className="text-xs font-semibold mb-1">{t('shotPlanner.equipment')}</h4><ul className="text-xs text-fg-muted space-y-0.5">{result.schedule.equipmentChecklist.map((e, i) => <li key={i}>• {e}</li>)}</ul></div>}
          </div>

          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('shotPlanner.insights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.insights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('shotPlanner.recommendations')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.recommendations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
