'use client';

import { useState, useCallback } from 'react';
import { Film, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { SceneAnalysisResult } from '@/lib/creative/scene-analysis';

export function SceneAnalysis() {
  const { t } = useI18n();
  const [sourceContent, setSourceContent] = useState('');
  const [sourceType, setSourceType] = useState('transcript');
  const [targetPlatform, setTargetPlatform] = useState('meta');
  const [adaptationGoal, setAdaptationGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SceneAnalysisResult | null>(null);

  const analyze = useCallback(async () => {
    if (!sourceContent.trim()) { setError(t('sceneAnalysis.contentRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/scene-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceContent, sourceType, targetPlatform, adaptationGoal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sourceContent, sourceType, targetPlatform, adaptationGoal, t]);

  const effectivenessColor = (score: number) => score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Film className="w-5 h-5" /> {t('sceneAnalysis.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('sceneAnalysis.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="sa-content" className="block text-sm font-medium mb-1">{t('sceneAnalysis.sourceContent')}</label>
          <textarea id="sa-content" value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} rows={6} placeholder={t('sceneAnalysis.contentPlaceholder')} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('sceneAnalysis.sourceContent')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="sa-type" className="block text-sm font-medium mb-1">{t('sceneAnalysis.sourceType')}</label>
            <select id="sa-type" value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('sceneAnalysis.sourceType')}>
              <option value="transcript">Transcript</option>
              <option value="description">Description</option>
              <option value="script">Script</option>
            </select>
          </div>
          <div>
            <label htmlFor="sa-platform" className="block text-sm font-medium mb-1">{t('sceneAnalysis.platform')}</label>
            <select id="sa-platform" value={targetPlatform} onChange={(e) => setTargetPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('sceneAnalysis.platform')}>
              <option value="meta">Meta</option>
              <option value="google">Google</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div>
            <label htmlFor="sa-goal" className="block text-sm font-medium mb-1">{t('sceneAnalysis.adaptationGoal')}</label>
            <input id="sa-goal" type="text" value={adaptationGoal} onChange={(e) => setAdaptationGoal(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('sceneAnalysis.adaptationGoal')} />
          </div>
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('sceneAnalysis.analyze')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
        {loading ? t('sceneAnalysis.analyzing') : t('sceneAnalysis.analyze')} <span className="text-xs opacity-75">({t('sceneAnalysis.credits')}: 8)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('sceneAnalysis.totalScenes')}</p><p className="text-xl font-bold">{result.totalScenes}</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('sceneAnalysis.totalDuration')}</p><p className="text-xl font-bold">{result.totalDuration}s</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('sceneAnalysis.pacing')}</p><p className="text-sm font-bold capitalize">{result.pacingAnalysis.pacingPattern.replace(/_/g, ' ')}</p></div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center"><p className="text-xs text-fg-muted">{t('sceneAnalysis.overallScore')}</p><p className={`text-xl font-bold ${effectivenessColor(result.effectivenessBreakdown.overallScore)}`}>{result.effectivenessBreakdown.overallScore}</p></div>
          </div>

          {/* Effectiveness Breakdown */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('sceneAnalysis.effectiveness')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><span className="text-fg-muted">{t('sceneAnalysis.hookStrength')}: </span><span className={`font-bold ${effectivenessColor(result.effectivenessBreakdown.hookStrength)}`}>{result.effectivenessBreakdown.hookStrength}</span></div>
              <div><span className="text-fg-muted">{t('sceneAnalysis.productClarity')}: </span><span className={`font-bold ${effectivenessColor(result.effectivenessBreakdown.productClarity)}`}>{result.effectivenessBreakdown.productClarity}</span></div>
              <div><span className="text-fg-muted">{t('sceneAnalysis.persuasion')}: </span><span className={`font-bold ${effectivenessColor(result.effectivenessBreakdown.persuasionPower)}`}>{result.effectivenessBreakdown.persuasionPower}</span></div>
              <div><span className="text-fg-muted">{t('sceneAnalysis.ctaClarity')}: </span><span className={`font-bold ${effectivenessColor(result.effectivenessBreakdown.ctaClarity)}`}>{result.effectivenessBreakdown.ctaClarity}</span></div>
            </div>
          </div>

          {/* Scenes */}
          {result.scenes.map((scene, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold">{scene.title}</span>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{scene.sceneType.replace(/_/g, ' ')}</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{scene.mood}</span>
                  <span className={`rounded bg-bg-primary px-2 py-0.5 font-bold ${effectivenessColor(scene.effectivenessScore)}`}>{scene.effectivenessScore}</span>
                </div>
              </div>
              <p className="text-xs text-fg-muted">{scene.startTime}s - {scene.endTime}s ({scene.duration}s) | {t('sceneAnalysis.shots')}: {scene.shots.length}</p>
              <p className="text-sm text-fg-muted">{scene.description}</p>
              <p className="text-xs text-fg-muted">{t('sceneAnalysis.keyMessage')}: {scene.keyMessage}</p>
              {scene.adaptationNotes && <p className="text-xs text-fg-muted">{t('sceneAnalysis.adaptationNotes')}: {scene.adaptationNotes}</p>}
            </div>
          ))}

          {/* Reshoot Plan */}
          {result.reshootPlan.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('sceneAnalysis.reshootPlan')}</h3>
              {result.reshootPlan.map((r, i) => (
                <div key={i} className="text-sm border-l-2 border-border pl-3 mb-2">
                  <span className="font-medium capitalize">{r.action}</span> — {r.sceneId}: {r.reason}
                </div>
              ))}
            </div>
          )}

          {result.adaptationRecommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('sceneAnalysis.recommendations')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.adaptationRecommendations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}
          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('sceneAnalysis.insights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.insights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
