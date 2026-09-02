'use client';

import { useState, useCallback } from 'react';
import { Flame, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { TrendIntelligenceResult } from '@/lib/creative/trend-intelligence';

const PLATFORMS = ['meta', 'google', 'tiktok', 'youtube', 'instagram', 'x', 'linkedin', 'pinterest', 'snapchat'];

export function TrendIntelligence() {
  const { t } = useI18n();
  const [productNiche, setProductNiche] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['meta', 'tiktok', 'instagram']);
  const [timeframe, setTimeframe] = useState('short_term');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrendIntelligenceResult | null>(null);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const analyze = useCallback(async () => {
    if (!productNiche.trim()) { setError(t('trendIntelligence.nicheRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/trend-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNiche, productCategory, targetAudience, platforms, timeframe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productNiche, productCategory, targetAudience, platforms, timeframe, t]);

  const statusColor = (status: string) => {
    if (status === 'rising' || status === 'emerging') return 'text-success';
    if (status === 'peaking') return 'text-warning';
    return 'text-fg-muted';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Flame className="w-5 h-5" /> {t('trendIntelligence.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('trendIntelligence.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="ti-niche" className="block text-sm font-medium mb-1">{t('trendIntelligence.productNiche')}</label>
          <input id="ti-niche" type="text" value={productNiche} onChange={(e) => setProductNiche(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('trendIntelligence.productNiche')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ti-category" className="block text-sm font-medium mb-1">{t('trendIntelligence.productCategory')}</label>
            <input id="ti-category" type="text" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('trendIntelligence.productCategory')} />
          </div>
          <div>
            <label htmlFor="ti-audience" className="block text-sm font-medium mb-1">{t('trendIntelligence.targetAudience')}</label>
            <input id="ti-audience" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('trendIntelligence.targetAudience')} />
          </div>
        </div>
        <div>
          <label htmlFor="ti-timeframe" className="block text-sm font-medium mb-1">{t('trendIntelligence.timeframe')}</label>
          <select id="ti-timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('trendIntelligence.timeframe')}>
            <option value="immediate">Immediate</option>
            <option value="short_term">Short-term</option>
            <option value="medium_term">Medium-term</option>
            <option value="long_term">Long-term</option>
          </select>
        </div>
        <div>
          <span className="block text-sm font-medium mb-1">{t('trendIntelligence.platforms')}</span>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} disabled={loading} className="rounded" aria-label={p} />
                <span className="capitalize">{p}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('trendIntelligence.analyze')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
        {loading ? t('trendIntelligence.analyzing') : t('trendIntelligence.analyze')} <span className="text-xs opacity-75">({t('trendIntelligence.credits')}: 6)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          {/* Market Timing */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('trendIntelligence.marketTiming')}</h3>
            <div className="grid grid-cols-3 gap-2 text-xs text-fg-muted">
              <div><p className="text-fg-muted">{t('trendIntelligence.bestTime')}</p><p className="font-medium text-fg-primary">{result.marketTiming.bestTimeToPost}</p></div>
              <div><p className="text-fg-muted">{t('trendIntelligence.bestDay')}</p><p className="font-medium text-fg-primary">{result.marketTiming.bestDayOfWeek}</p></div>
              <div><p className="text-fg-muted">{t('trendIntelligence.window')}</p><p className="font-medium text-fg-primary">{result.marketTiming.trendingWindow}</p></div>
            </div>
          </div>

          {/* Trends */}
          {result.trends.map((trend, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold">{trend.name}</span>
                <span className={`text-xs font-medium capitalize ${statusColor(trend.status)}`}>{trend.status}</span>
              </div>
              <p className="text-xs text-fg-muted">{trend.description}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{trend.category}</span>
                <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{trend.velocity}</span>
                <span className="rounded bg-bg-primary px-2 py-0.5">{t('trendIntelligence.momentum')}: {trend.momentumScore}</span>
                <span className="rounded bg-bg-primary px-2 py-0.5">{t('trendIntelligence.relevance')}: {trend.relevanceScore}</span>
                <span className="rounded bg-bg-primary px-2 py-0.5">{t('trendIntelligence.volume')}: {trend.volumeScore}</span>
              </div>
              {trend.keywords.length > 0 && <p className="text-xs text-fg-muted">Keywords: {trend.keywords.join(', ')}</p>}
              {trend.hashtags.length > 0 && <p className="text-xs text-fg-muted">Hashtags: {trend.hashtags.join(', ')}</p>}
            </div>
          ))}

          {/* Opportunities */}
          {result.opportunities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('trendIntelligence.opportunities')}</h3>
              {result.opportunities.map((opp, i) => (
                <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium">{opp.trendName}</span>
                    <span className="text-xs font-bold text-brand-accent">{t('trendIntelligence.opportunityScore')}: {opp.opportunityScore}</span>
                  </div>
                  <p className="text-xs text-fg-muted">{opp.recommendedAction}</p>
                  <p className="text-xs text-fg-muted">{t('trendIntelligence.creativeAngle')}: {opp.creativeAngle}</p>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{opp.effortLevel} effort</span>
                    <span className="rounded bg-bg-primary px-2 py-0.5">{opp.timeToMarket}h to market</span>
                    <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{opp.riskLevel} risk</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Seasonal */}
          {result.seasonalOpportunities.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('trendIntelligence.seasonal')}</h3>
              {result.seasonalOpportunities.map((s, i) => (
                <div key={i} className="text-sm border-l-2 border-border pl-3 mb-2">
                  <p className="font-medium">{s.eventName} <span className="text-xs text-fg-muted">({s.date}, {s.daysUntil} days)</span></p>
                  <p className="text-xs text-fg-muted">Relevance: {s.relevanceScore} | Lead time: {s.preparationLeadTime} days</p>
                </div>
              ))}
            </div>
          )}

          {/* Trending lists */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.trendingKeywords.length > 0 && <div className="rounded-lg border border-border bg-bg-secondary p-3"><h4 className="text-xs font-semibold mb-1">{t('trendIntelligence.trendingKeywords')}</h4><div className="flex flex-wrap gap-1">{result.trendingKeywords.map((k, i) => <span key={i} className="text-xs bg-bg-primary px-2 py-0.5 rounded">{k}</span>)}</div></div>}
            {result.trendingHashtags.length > 0 && <div className="rounded-lg border border-border bg-bg-secondary p-3"><h4 className="text-xs font-semibold mb-1">{t('trendIntelligence.trendingHashtags')}</h4><div className="flex flex-wrap gap-1">{result.trendingHashtags.map((h, i) => <span key={i} className="text-xs bg-bg-primary px-2 py-0.5 rounded">{h}</span>)}</div></div>}
            {result.trendingAudio.length > 0 && <div className="rounded-lg border border-border bg-bg-secondary p-3"><h4 className="text-xs font-semibold mb-1">{t('trendIntelligence.trendingAudio')}</h4><div className="flex flex-wrap gap-1">{result.trendingAudio.map((a, i) => <span key={i} className="text-xs bg-bg-primary px-2 py-0.5 rounded">{a}</span>)}</div></div>}
          </div>

          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('trendIntelligence.insights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.insights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('trendIntelligence.recommendations')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.recommendations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
