'use client';

import { useState, useCallback } from 'react';
import { Award, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { QualityScoringResult } from '@/lib/creative/quality-scoring';

export function QualityScoring() {
  const { t } = useI18n();
  const [creativeContent, setCreativeContent] = useState('');
  const [creativeType, setCreativeType] = useState('video');
  const [platform, setPlatform] = useState('meta');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandContext, setBrandContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<QualityScoringResult | null>(null);

  const analyze = useCallback(async () => {
    if (!creativeContent.trim()) { setError(t('qualityScoring.contentRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/quality-scoring', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeContent, creativeType, platform, targetAudience, brandContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [creativeContent, creativeType, platform, targetAudience, brandContext, t]);

  const gradeColor = (grade: string) => {
    if (grade === 'A') return 'text-success';
    if (grade === 'B') return 'text-success';
    if (grade === 'C') return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Award className="w-5 h-5" /> {t('qualityScoring.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('qualityScoring.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="qs-content" className="block text-sm font-medium mb-1">{t('qualityScoring.creativeContent')}</label>
          <textarea id="qs-content" value={creativeContent} onChange={(e) => setCreativeContent(e.target.value)} rows={6} placeholder={t('qualityScoring.contentPlaceholder')} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('qualityScoring.creativeContent')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="qs-type" className="block text-sm font-medium mb-1">{t('qualityScoring.creativeType')}</label>
            <select id="qs-type" value={creativeType} onChange={(e) => setCreativeType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('qualityScoring.creativeType')}>
              <option value="video">Video</option>
              <option value="image">Image</option>
              <option value="carousel">Carousel</option>
              <option value="story">Story</option>
              <option value="script">Script</option>
            </select>
          </div>
          <div>
            <label htmlFor="qs-platform" className="block text-sm font-medium mb-1">{t('qualityScoring.platform')}</label>
            <select id="qs-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('qualityScoring.platform')}>
              <option value="meta">Meta</option>
              <option value="google">Google</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div>
            <label htmlFor="qs-audience" className="block text-sm font-medium mb-1">{t('qualityScoring.targetAudience')}</label>
            <input id="qs-audience" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('qualityScoring.targetAudience')} />
          </div>
        </div>
        <div>
          <label htmlFor="qs-brand" className="block text-sm font-medium mb-1">{t('qualityScoring.brandContext')}</label>
          <textarea id="qs-brand" value={brandContext} onChange={(e) => setBrandContext(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('qualityScoring.brandContext')} />
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('qualityScoring.analyze')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
        {loading ? t('qualityScoring.analyzing') : t('qualityScoring.analyze')} <span className="text-xs opacity-75">({t('qualityScoring.credits')}: 5)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          {/* Overall Score */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-fg-muted">{t('qualityScoring.overallScore')}</p>
                <p className={`text-3xl font-bold ${gradeColor(result.assessment.overallGrade)}`}>{result.assessment.overallScore} <span className="text-lg">({result.assessment.overallGrade})</span></p>
              </div>
              <div className="text-right text-xs text-fg-muted space-y-1">
                <p>{t('qualityScoring.predictedCtr')}: {result.assessment.estimatedPerformance.predictedCtr}%</p>
                <p>{t('qualityScoring.predictedCvr')}: {result.assessment.estimatedPerformance.predictedCvr}%</p>
                <p>{t('qualityScoring.predictedRoas')}: {result.assessment.estimatedPerformance.predictedRoas}x</p>
              </div>
            </div>
          </div>

          {/* Dimension Scores */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t('qualityScoring.dimensions')}</h3>
            {result.assessment.dimensionScores.map((d, i) => (
              <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium capitalize">{d.dimension.replace(/_/g, ' ')}</span>
                  <span className={`text-sm font-bold ${gradeColor(d.grade)}`}>{d.score} ({d.grade})</span>
                </div>
                <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
                  <div className="h-full bg-brand-accent rounded-full" style={{ width: `${d.score}%` }} />
                </div>
                {d.strengths.length > 0 && <p className="text-xs text-success mt-1">+ {d.strengths.join(', ')}</p>}
                {d.weaknesses.length > 0 && <p className="text-xs text-danger mt-1">- {d.weaknesses.join(', ')}</p>}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {result.assessment.priorityRecommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('qualityScoring.recommendations')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.assessment.priorityRecommendations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}

          {/* Action Items */}
          {result.actionItems.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('qualityScoring.actionItems')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.actionItems.map((a, i) => <li key={i}>• {a}</li>)}</ul>
            </div>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('qualityScoring.insights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.insights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
