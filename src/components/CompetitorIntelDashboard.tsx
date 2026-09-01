'use client';

import { useState, useCallback } from 'react';
import { Eye, Loader2, AlertCircle, Plus, X, TrendingUp, TrendingDown, Minus, Target, Lightbulb } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { CompetitorIntelResult, CompetitorProfile, MarketGap, BenchmarkMetric } from '@/lib/creative/competitor-intel';

const POSITION_LABELS: Record<string, string> = {
  leader: 'Leader', challenger: 'Challenger', follower: 'Follower', nicher: 'Nicher', new_entrant: 'New Entrant',
};

const STATUS_COLORS: Record<string, string> = {
  leading: 'text-success', above_average: 'text-brand-accent', average: 'text-warning', below_average: 'text-danger',
};

export function CompetitorIntelDashboard() {
  const { t } = useI18n();
  const [market, setMarket] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [yourSpend, setYourSpend] = useState('');
  const [yourImpressions, setYourImpressions] = useState('');
  const [yourEngagement, setYourEngagement] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CompetitorIntelResult | null>(null);

  const addUrl = () => setCompetitorUrls((prev) => [...prev, '']);
  const removeUrl = (i: number) => setCompetitorUrls((prev) => prev.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, val: string) => setCompetitorUrls((prev) => prev.map((u, idx) => idx === i ? val : u));

  const analyze = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const urls = competitorUrls.filter((u) => u.trim());
      const yourMetrics: Record<string, number> = {};
      if (yourSpend) yourMetrics.spend = Number(yourSpend);
      if (yourImpressions) yourMetrics.impressions = Number(yourImpressions);
      if (yourEngagement) yourMetrics.engagement = Number(yourEngagement);
      const res = await fetch('/api/creative/competitor-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: market || undefined, competitorUrls: urls.length > 0 ? urls : undefined, yourMetrics }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [market, competitorUrls, yourSpend, yourImpressions, yourEngagement]);

  const trendIcon = (trend: string) => trend === 'increasing' ? <TrendingUp className="w-3 h-3 text-success" /> : trend === 'decreasing' ? <TrendingDown className="w-3 h-3 text-danger" /> : <Minus className="w-3 h-3 text-fg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Eye className="w-5 h-5" /> {t('competitorIntel.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('competitorIntel.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="market" className="block text-sm font-medium mb-1">{t('competitorIntel.market')}</label>
          <input id="market" type="text" value={market} onChange={(e) => setMarket(e.target.value)} placeholder={t('competitorIntel.phMarket')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('competitorIntel.competitorUrls')}</label>
          <div className="space-y-2">
            {competitorUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input type="url" value={url} onChange={(e) => updateUrl(i, e.target.value)} placeholder={t('competitorIntel.phCompetitorUrl')} className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                {competitorUrls.length > 1 && <button onClick={() => removeUrl(i)} className="text-fg-muted hover:text-danger"><X className="w-4 h-4" /></button>}
              </div>
            ))}
            <button onClick={addUrl} className="text-sm text-brand-accent hover:opacity-80 flex items-center gap-1"><Plus className="w-4 h-4" /> {t('competitorIntel.addUrl')}</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="yourSpend" className="block text-sm font-medium mb-1">{t('competitorIntel.yourSpend')}</label>
            <input id="yourSpend" type="number" value={yourSpend} onChange={(e) => setYourSpend(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="yourImpressions" className="block text-sm font-medium mb-1">{t('competitorIntel.yourImpressions')}</label>
            <input id="yourImpressions" type="number" value={yourImpressions} onChange={(e) => setYourImpressions(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="yourEngagement" className="block text-sm font-medium mb-1">{t('competitorIntel.yourEngagement')}</label>
            <input id="yourEngagement" type="number" step="0.01" value={yourEngagement} onChange={(e) => setYourEngagement(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          {loading ? t('competitorIntel.analyzing') : `${t('competitorIntel.analyze')} (8 ${t('competitorIntel.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('competitorIntel.yourPosition')}</div>
              <div className="text-lg font-bold">{POSITION_LABELS[result.yourMarketPosition] || result.yourMarketPosition}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('competitorIntel.totalCompetitors')}</div>
              <div className="text-lg font-bold">{result.totalCompetitors}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('competitorIntel.marketGaps')}</div>
              <div className="text-lg font-bold text-brand-accent">{result.marketGaps.length}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('competitorIntel.insights')}</div>
              <div className="text-lg font-bold">{result.insights.length}</div>
            </div>
          </div>

          {result.shareOfVoice.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('competitorIntel.shareOfVoice')}</h3>
              <div className="space-y-2">
                {result.shareOfVoice.map((sov, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate">{sov.competitor}</span>
                    <div className="flex-1 bg-bg-secondary rounded-full h-3"><div className="bg-brand-accent rounded-full h-3" style={{ width: `${sov.percentage}%` }} /></div>
                    <span className="text-xs text-fg-muted w-12 text-right">{sov.percentage}%</span>
                    {trendIcon(sov.trend)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.competitors.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('competitorIntel.competitors')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.competitors.map((c, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-fg-muted">{POSITION_LABELS[c.marketPosition] || c.marketPosition}</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-1">Spend: ${c.estimatedAdSpend.toLocaleString()} | Creatives: {c.activeCreatives}</p>
                    <p className="text-xs text-fg-muted">Engagement: {(c.avgEngagementRate * 100).toFixed(1)}% | Posts/wk: {c.postingFrequency}</p>
                    {c.strengths.length > 0 && <p className="text-xs text-success mt-1">Strengths: {c.strengths.join(', ')}</p>}
                    {c.weaknesses.length > 0 && <p className="text-xs text-danger">Weaknesses: {c.weaknesses.join(', ')}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.marketGaps.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('competitorIntel.gaps')}</h3>
              <div className="space-y-2">
                {result.marketGaps.map((g, i) => (
                  <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-medium text-brand-accent">{g.type.replace('_', ' ')}</span>
                      <span className={`text-xs ${g.priority === 'high' ? 'text-danger' : g.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{g.priority}</span>
                    </div>
                    <p className="text-sm font-medium">{g.description}</p>
                    <p className="text-xs text-fg-muted">Opportunity: {g.opportunity}</p>
                    <p className="text-xs text-fg-muted">Reach: ~{g.estimatedReach.toLocaleString()} | Difficulty: {g.difficulty}</p>
                    <p className="text-xs mt-1">{g.recommendedAction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.benchmarks.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('competitorIntel.benchmarks')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr>
                    <th className="text-left py-1">Metric</th><th className="text-right py-1">You</th><th className="text-right py-1">Comp Avg</th><th className="text-right py-1">Industry</th><th className="text-right py-1">Top</th><th className="text-right py-1">Percentile</th><th className="text-left py-1">Status</th>
                  </tr></thead>
                  <tbody>
                    {result.benchmarks.map((b, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1 capitalize">{b.metric}</td>
                        <td className="text-right py-1">{b.yourValue.toLocaleString()}</td>
                        <td className="text-right py-1 text-fg-muted">{b.competitorAvg.toLocaleString()}</td>
                        <td className="text-right py-1 text-fg-muted">{b.industryAvg.toLocaleString()}</td>
                        <td className="text-right py-1 text-fg-muted">{b.topPerformer.toLocaleString()}</td>
                        <td className="text-right py-1">{b.percentile}%</td>
                        <td className={`py-1 ${STATUS_COLORS[b.status] || 'text-fg-muted'}`}>{b.status.replace('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4" /> {t('competitorIntel.insights')}</h3>
              <div className="space-y-2">
                {result.insights.map((ins, i) => (
                  <div key={i} className="border-l-2 pl-3" style={{ borderColor: 'var(--brand-accent)' }}>
                    <span className="text-xs uppercase font-medium text-brand-accent">{ins.type}</span>
                    <p className="text-sm font-medium">{ins.title}</p>
                    <p className="text-xs text-fg-muted">{ins.description}</p>
                    <p className="text-xs mt-1"><span className="font-medium">Action:</span> {ins.actionableRecommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('competitorIntel.recommendations')}</h3>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span>
                    <div className="flex-1">
                      <p className="text-sm">{r.recommendation}</p>
                      <p className="text-xs text-success">{r.expectedImpact}</p>
                      <p className="text-xs text-fg-muted">{r.timeframe}</p>
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
