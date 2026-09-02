'use client';

import { useState, useCallback } from 'react';
import { Brain, Loader2, AlertCircle, TrendingUp, Target, Lightbulb, Layers, Download } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { MLInsightsResult, ElementAttribution, PerformancePattern, CreativeCluster, MLInsight } from '@/lib/creative/ml-insights';

export function MLInsightsDashboard() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MLInsightsResult | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ml-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const impactColor = (s: number) => s >= 60 ? 'text-success' : s >= 30 ? 'text-warning' : s < 0 ? 'text-danger' : 'text-fg-muted';
  const confidenceColor = (s: number) => s >= 80 ? 'text-success' : s >= 60 ? 'text-warning' : 'text-danger';
  const insightTypeColor = (type: MLInsight['type']) => type === 'strength' ? 'text-success' : type === 'weakness' ? 'text-danger' : type === 'opportunity' ? 'text-brand-accent' : 'text-warning';

  const exportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-insights-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5" />
          {t('mlInsights.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('mlInsights.subtitle')}</p>
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
        {loading ? t('mlInsights.analyzing') : `${t('mlInsights.analyze')} (7 ${t('mlInsights.credits')})`}
      </button>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
                <div className="text-2xl font-bold">{result.totalCreativesAnalyzed}</div>
                <div className="text-xs text-fg-muted">{t('mlInsights.totalAnalyzed')}</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
                <div className="text-2xl font-bold text-success">{result.topPerformersCount}</div>
                <div className="text-xs text-fg-muted">{t('mlInsights.topPerformers')}</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
                <div className="text-2xl font-bold text-danger">{result.bottomPerformersCount}</div>
                <div className="text-xs text-fg-muted">{t('mlInsights.bottomPerformers')}</div>
              </div>
            </div>
            <button onClick={exportJson} className="ml-3 text-fg-muted hover:text-fg" aria-label={t('mlInsights.export')}>
              <Download className="w-5 h-5" />
            </button>
          </div>

          {result.elementAttribution.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('mlInsights.elementAttribution')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr>
                    <th className="text-left py-1">{t('mlInsights.elementType')}</th>
                    <th className="text-left py-1">{t('mlInsights.elementValue')}</th>
                    <th className="text-right py-1">{t('mlInsights.impact')}</th>
                    <th className="text-right py-1">{t('mlInsights.samples')}</th>
                    <th className="text-left py-1">{t('mlInsights.recommendation')}</th>
                  </tr></thead>
                  <tbody>
                    {result.elementAttribution.slice(0, 15).map((a, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1">{a.elementType}</td>
                        <td className="py-1">{a.elementValue}</td>
                        <td className={`text-right py-1 font-medium ${impactColor(a.impactScore)}`}>{a.impactScore > 0 ? '+' : ''}{a.impactScore}</td>
                        <td className="text-right py-1 text-fg-muted">{a.sampleSize}</td>
                        <td className="py-1 text-xs text-fg-muted">{a.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.performancePatterns.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Layers className="w-4 h-4" /> {t('mlInsights.patterns')}</h3>
              <div className="space-y-2">
                {result.performancePatterns.map((p) => (
                  <div key={p.patternId} className="border-l-2 border-brand-accent/30 pl-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className={`text-xs ${confidenceColor(p.confidenceScore)}`}>{p.confidenceScore}% {t('mlInsights.confidence')}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{p.description}</p>
                    <p className="text-xs text-fg-muted">Freq: {p.frequency} | Avg: {p.avgPerformance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.creativeClusters.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Layers className="w-4 h-4" /> {t('mlInsights.clusters')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.creativeClusters.map((c) => (
                  <div key={c.clusterId} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className={`text-xs ${impactColor(c.avgPerformance)}`}>{c.avgPerformance}</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-1">{c.description}</p>
                    <p className="text-xs text-fg-muted">Members: {c.memberCount}</p>
                    {c.recommendedActions.length > 0 && (
                      <ul className="text-xs list-disc list-inside mt-1 text-fg-muted">
                        {c.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4" /> {t('mlInsights.insights')}</h3>
              <div className="space-y-2">
                {result.insights.map((ins) => (
                  <div key={ins.insightId} className="border-l-2 pl-3" style={{ borderColor: 'var(--brand-accent)' }}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs uppercase font-medium ${insightTypeColor(ins.type)}`}>{ins.type}</span>
                      <span className="text-sm font-medium">{ins.title}</span>
                      <span className={`text-xs ${confidenceColor(ins.confidenceScore)}`}>{ins.confidenceScore}%</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-1">{ins.description}</p>
                    <p className="text-xs text-fg-muted">Evidence: {ins.evidence}</p>
                    <p className="text-xs mt-1"><span className="font-medium">Action:</span> {ins.actionableRecommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.predictiveFactors.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /> {t('mlInsights.predictiveFactors')}</h3>
              <div className="space-y-1">
                {result.predictiveFactors.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32">{f.factor}</span>
                    <div className="flex-1 bg-bg-secondary rounded-full h-2">
                      <div className="bg-brand-accent rounded-full h-2" style={{ width: `${f.importance}%` }} />
                    </div>
                    <span className="text-xs text-fg-muted w-32">{f.optimalRange}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('mlInsights.recommendations')}</h3>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.category}</p>
                      <p className="text-xs text-fg-muted">{r.recommendation}</p>
                      <p className="text-xs text-success">{r.expectedImpact}</p>
                      <p className="text-xs text-fg-muted">{r.implementation}</p>
                    </div>
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
