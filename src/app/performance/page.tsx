'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  TrendingUp, Loader2, AlertCircle, BarChart3,
  Eye, MousePointerClick, ShoppingCart, DollarSign, Target, Fish,
  Clock, Trophy, Zap,
  ArrowUp, ArrowDown, Minus, Wallet,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

type PerformanceSummary = {
  totalCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number;
  topHooks: Array<{ value: string; avgScore: number; sampleSize: number; recommendation: string }>;
  topAngles: Array<{ value: string; avgScore: number; sampleSize: number; recommendation: string }>;
  topPlatforms: Array<{ value: string; avgScore: number; sampleSize: number; recommendation: string }>;
  recommendations: string[];
};

export default function PerformancePage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [learnings, setLearnings] = useState('');
  const [error, setError] = useState('');
  const [intel, setIntel] = useState<{
    hookTrends: Array<{ date: string; hooks: Record<string, { avgRoas: number; avgCtr: number; count: number }> }>;
    angleTrends: Array<{ date: string; angles: Record<string, { avgRoas: number; count: number }> }>;
    platformComparison: Array<{ platform: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number; avgRoas: number; avgCtr: number; count: number }>;
    timeOfDay: Array<{ hour: number; impressions: number; clicks: number; conversions: number; avgRoas: number; count: number }>;
    summary: {
      totalRecords: number; avgRoas: number; avgCtr: number;
      bestHook: { name: string; avgRoas: number } | null;
      bestAngle: { name: string; avgRoas: number } | null;
      bestPlatform: { name: string; avgRoas: number } | null;
    };
  } | null>(null);
  const [forecast, setForecast] = useState<{
    forecasts: {
      roas: { value: number; slope: number; r2: number; trend: string } | null;
      ctr: { value: number; slope: number; r2: number; trend: string } | null;
      cvr: { value: number; slope: number; r2: number; trend: string } | null;
    };
    budgetRecommendations: Array<{ platform: string; avgRoas: number; avgSpend: number; avgRevenue: number; recommendedBudgetMultiplier: number; recommendation: string }>;
    summary: { totalRecords: number; dataPoints: number; confidence: number; forecastDays: number; message?: string };
  } | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/creative/performance');
      if (!res.ok) {
        if (res.status === 401) throw new Error('auth');
        if (res.status === 402) throw new Error('credits');
        if (res.status >= 500) throw new Error('server');
        throw new Error('failed');
      }
      const j = await res.json().catch(() => ({}));
      setSummary(j?.summary ?? null);
      setLearnings(typeof j?.learnings === 'string' ? j.learnings : '');

      // Fetch intelligence trends in parallel (non-blocking)
      fetch('/api/creative/intelligence?days=30', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => setIntel(data))
        .catch(() => {});

      // Fetch forecast data in parallel (non-blocking)
      fetch('/api/creative/forecast?days=30', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => setForecast(data))
        .catch(() => {});
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'auth') setError(t('common.errUnauthorized'));
      else if (code === 'credits') setError(t('common.errPaymentRequired'));
      else if (code === 'server') setError(t('common.errServer'));
      else if (e instanceof TypeError) setError(t('common.errNetwork'));
      else setError(t('perf.errFailed'));
    }
    setLoading(false);
  }, [session, t]);

  useEffect(() => { load(); }, [load]);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-app pb-safe">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">
            <BarChart3 className="mr-2 inline h-7 w-7 text-brand-accent" />
            {t('perf.title')}
          </h1>
          <p className="mt-2 text-sm text-fg-faint">{t('perf.signInPrompt')}</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: '#0064d9' }}
          >
            {t('perf.signIn')}
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8" aria-busy={loading}>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          <BarChart3 className="mr-2 inline h-7 w-7 text-brand-accent" />
          {t('perf.title')}
        </h1>
        <p className="mt-2 text-sm text-fg-faint">
          {t('perf.subtitle')}
        </p>

        {loading && <Loader2 className="mt-6 h-6 w-6 animate-spin text-brand-accent" role="status" aria-label={t('common.loadingDots')} />}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
          </div>
        )}

        {summary && !loading && (
          <>
            {/* Overview metrics */}
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard icon={Target} label={t('perf.campaigns')} value={(summary.totalCampaigns ?? 0).toString()} />
              <MetricCard icon={DollarSign} label={t('perf.totalSpend')} value={`$${(summary.totalSpend ?? 0).toFixed(2)}`} />
              <MetricCard icon={TrendingUp} label={t('perf.totalRevenue')} value={`$${(summary.totalRevenue ?? 0).toFixed(2)}`} />
              <MetricCard
                icon={BarChart3}
                label={t('perf.roas')}
                value={`${(summary.overallRoas ?? 0).toFixed(2)}x`}
                highlight={(summary.overallRoas ?? 0) >= 1 ? 'positive' : 'negative'}
              />
            </section>

            {/* Recommendations */}
            {(summary.recommendations ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-fg">{t('perf.recommendations')}</h2>
                <ul className="mt-3 space-y-2">
                  {summary.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-fg">
                      <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-brand-accent" />
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Top hooks */}
            {(summary.topHooks ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Fish className="h-4 w-4 text-brand-accent" /> {t('perf.topHooks')}</h2>
                <div className="mt-3 space-y-2">
                  {summary.topHooks.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg truncate min-w-0">{h.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>CTR: {(h.avgScore ?? 0).toFixed(1)}%</span>
                        <span>n={h.sampleSize ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top angles */}
            {(summary.topAngles ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Target className="h-4 w-4 text-brand-accent" /> {t('perf.topAngles')}</h2>
                <div className="mt-3 space-y-2">
                  {summary.topAngles.map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg truncate min-w-0">{a.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>ROAS: {(a.avgScore ?? 0).toFixed(2)}x</span>
                        <span>n={a.sampleSize ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top platforms */}
            {(summary.topPlatforms ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><BarChart3 className="h-4 w-4 text-brand-accent" /> {t('perf.topPlatforms')}</h2>
                <div className="mt-3 space-y-2">
                  {summary.topPlatforms.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg truncate min-w-0">{p.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>CTR: {(p.avgScore ?? 0).toFixed(1)}%</span>
                        <span>n={p.sampleSize ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Learnings context (injected into future briefs) */}
            {learnings && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-fg">{t('perf.learningsContext')}</h2>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-app p-3 text-xs text-fg-faint">{learnings}</pre>
              </section>
            )}

            {(summary.totalCampaigns ?? 0) === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-line bg-hover p-6 text-center">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-fg-placeholder" />
                <p className="text-sm text-fg-faint">{t('perf.noData')}</p>
                <p className="mt-1 text-xs text-fg-faint">{t('perf.noDataHint')}</p>
              </div>
            )}

            {/* Intelligence Dashboard */}
            {intel && intel.summary.totalRecords > 0 && (
              <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-brand-accent" />
                  <h2 className="text-sm font-bold text-fg">{t('perf.intelligenceTitle')}</h2>
                </div>

                {/* Best-of summary */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
                  {intel.summary.bestHook && (
                    <div className="rounded-lg border border-line bg-app p-3">
                      <div className="flex items-center gap-1.5 text-xs text-fg-faint"><Fish className="h-3 w-3" /> {t('perf.bestHook')}</div>
                      <div className="mt-1 text-sm font-bold text-fg">{intel.summary.bestHook.name}</div>
                      <div className="text-xs text-success">{intel.summary.bestHook.avgRoas.toFixed(2)}x ROAS</div>
                    </div>
                  )}
                  {intel.summary.bestAngle && (
                    <div className="rounded-lg border border-line bg-app p-3">
                      <div className="flex items-center gap-1.5 text-xs text-fg-faint"><Target className="h-3 w-3" /> {t('perf.bestAngle')}</div>
                      <div className="mt-1 text-sm font-bold text-fg">{intel.summary.bestAngle.name}</div>
                      <div className="text-xs text-success">{intel.summary.bestAngle.avgRoas.toFixed(2)}x ROAS</div>
                    </div>
                  )}
                  {intel.summary.bestPlatform && (
                    <div className="rounded-lg border border-line bg-app p-3">
                      <div className="flex items-center gap-1.5 text-xs text-fg-faint"><Trophy className="h-3 w-3" /> {t('perf.bestPlatform')}</div>
                      <div className="mt-1 text-sm font-bold text-fg capitalize">{intel.summary.bestPlatform.name}</div>
                      <div className="text-xs text-success">{intel.summary.bestPlatform.avgRoas.toFixed(2)}x ROAS</div>
                    </div>
                  )}
                </div>

                {/* Platform comparison */}
                {intel.platformComparison.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-xs font-medium text-fg-faint">{t('perf.platformComparison')}</h3>
                    <div className="space-y-2">
                      {intel.platformComparison.map((p, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-app p-3 text-xs">
                          <span className="font-medium capitalize text-fg">{p.platform}</span>
                          <div className="flex items-center gap-3 text-fg-faint">
                            <span>{p.impressions.toLocaleString()} imp</span>
                            <span>{p.clicks.toLocaleString()} clicks</span>
                            <span className="font-bold text-fg">{p.avgRoas.toFixed(2)}x</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best time of day */}
                {intel.timeOfDay.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-faint"><Clock className="h-3 w-3" /> {t('perf.bestTimeOfDay')}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {intel.timeOfDay.slice(0, 8).map((h, i) => (
                        <div key={i} className={`rounded-lg px-3 py-2 text-xs ${i === 0 ? 'bg-success/15 text-success' : 'bg-app text-fg-faint'}`}>
                          <div className="font-bold">{h.hour}:00</div>
                          <div className="text-[10px]">{h.avgRoas.toFixed(2)}x</div>
                          <div className="text-[10px]">n={h.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hook trends (simple bar chart) */}
                {intel.hookTrends.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-xs font-medium text-fg-faint">{t('perf.hookTrends')}</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {intel.hookTrends.slice(-10).map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-fg-faint font-mono shrink-0">{entry.date.slice(5)}</span>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(entry.hooks).map(([type, data]) => (
                              <span key={type} className="rounded bg-app border border-line px-1.5 py-0.5 text-[10px]">
                                {type}: {data.avgRoas.toFixed(2)}x
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Angle trends */}
                {intel.angleTrends.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-fg-faint">{t('perf.angleTrends')}</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {intel.angleTrends.slice(-10).map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-fg-faint font-mono shrink-0">{entry.date.slice(5)}</span>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(entry.angles).map(([name, data]) => (
                              <span key={name} className="rounded bg-app border border-line px-1.5 py-0.5 text-[10px]">
                                {name}: {data.avgRoas.toFixed(2)}x
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Performance Forecast */}
            {forecast && (
              <section className="mt-6 rounded-2xl border border-line bg-surface p-5" aria-label={t('perf.forecastTitle')}>
                <div className="mb-1 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-brand-accent" />
                  <h2 className="text-sm font-bold text-fg">{t('perf.forecastTitle')}</h2>
                </div>
                <p className="mb-4 text-xs text-fg-faint">{t('perf.forecastSubtitle')}</p>

                {/* Insufficient data state */}
                {forecast.summary.message === 'insufficient_data' || (!forecast.forecasts.roas && !forecast.forecasts.ctr && !forecast.forecasts.cvr) ? (
                  <div role="status" className="rounded-xl bg-app p-4 text-center text-xs text-fg-faint">
                    {t('perf.forecastNoData')}
                  </div>
                ) : (
                  <>
                    {/* Low confidence warning */}
                    {forecast.summary.confidence < 30 && (
                      <div role="alert" className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                        <AlertCircle className="mr-1.5 inline h-3.5 w-3.5" />
                        {t('perf.forecastLowConfidence')}
                      </div>
                    )}

                    {/* Forecast metric cards */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label={t('perf.forecastTitle')}>
                      <ForecastMetricCard
                        label={t('perf.forecastRoas')}
                        value={forecast.forecasts.roas ? `${forecast.forecasts.roas.value.toFixed(2)}x` : '—'}
                        trend={forecast.forecasts.roas?.trend ?? 'flat'}
                        confidence={forecast.forecasts.roas?.r2 ?? 0}
                        confidenceLabel={t('perf.forecastConfidence')}
                        trendUpLabel={t('perf.forecastTrendUp')}
                        trendDownLabel={t('perf.forecastTrendDown')}
                        trendFlatLabel={t('perf.forecastTrendFlat')}
                      />
                      <ForecastMetricCard
                        label={t('perf.forecastCtr')}
                        value={forecast.forecasts.ctr ? `${(forecast.forecasts.ctr.value * 100).toFixed(2)}%` : '—'}
                        trend={forecast.forecasts.ctr?.trend ?? 'flat'}
                        confidence={forecast.forecasts.ctr?.r2 ?? 0}
                        confidenceLabel={t('perf.forecastConfidence')}
                        trendUpLabel={t('perf.forecastTrendUp')}
                        trendDownLabel={t('perf.forecastTrendDown')}
                        trendFlatLabel={t('perf.forecastTrendFlat')}
                      />
                      <ForecastMetricCard
                        label={t('perf.forecastCvr')}
                        value={forecast.forecasts.cvr ? `${(forecast.forecasts.cvr.value * 100).toFixed(2)}%` : '—'}
                        trend={forecast.forecasts.cvr?.trend ?? 'flat'}
                        confidence={forecast.forecasts.cvr?.r2 ?? 0}
                        confidenceLabel={t('perf.forecastConfidence')}
                        trendUpLabel={t('perf.forecastTrendUp')}
                        trendDownLabel={t('perf.forecastTrendDown')}
                        trendFlatLabel={t('perf.forecastTrendFlat')}
                      />
                    </div>

                    {/* Budget recommendations */}
                    {forecast.budgetRecommendations.length > 0 && (
                      <div className="mt-5">
                        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-faint">
                          <Wallet className="h-3.5 w-3.5" /> {t('perf.budgetRecommendations')}
                        </h3>
                        <div className="space-y-2">
                          {forecast.budgetRecommendations.map((b, i) => (
                            <BudgetRecommendationCard
                              key={i}
                              platform={b.platform}
                              avgRoas={b.avgRoas}
                              avgSpend={b.avgSpend}
                              avgRevenue={b.avgRevenue}
                              recommendation={b.recommendation}
                              multiplier={b.recommendedBudgetMultiplier}
                              roasLabel={t('perf.budgetCurrentRoas')}
                              spendLabel={t('perf.budgetCurrentSpend')}
                              revenueLabel={t('perf.budgetCurrentRevenue')}
                              increaseLabel={t('perf.budgetIncrease')}
                              decreaseLabel={t('perf.budgetDecrease')}
                              maintainLabel={t('perf.budgetMaintain')}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, highlight,
}: { icon: typeof Eye; label: string; value: string; highlight?: 'positive' | 'negative' }) {
  const color = highlight === 'positive' ? 'text-success' : highlight === 'negative' ? 'text-danger' : 'text-fg';
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Icon className="h-5 w-5 text-fg-faint" />
      <div className={`mt-2 text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-fg-faint">{label}</div>
    </div>
  );
}

function ForecastMetricCard({
  label, value, trend, confidence, confidenceLabel,
  trendUpLabel, trendDownLabel, trendFlatLabel,
}: {
  label: string;
  value: string;
  trend: string;
  confidence: number;
  confidenceLabel: string;
  trendUpLabel: string;
  trendDownLabel: string;
  trendFlatLabel: string;
}) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-fg-faint';
  const trendLabel = trend === 'up' ? trendUpLabel : trend === 'down' ? trendDownLabel : trendFlatLabel;
  const confidenceColor = confidence >= 0.7 ? 'text-success' : confidence >= 0.3 ? 'text-warning' : 'text-danger';
  return (
    <div className="rounded-xl border border-line bg-app p-4">
      <div className="text-[10px] text-fg-faint">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-lg font-bold text-fg">{value}</span>
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendColor}`} aria-label={trendLabel}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{trendLabel}</span>
        </span>
      </div>
      <div className={`mt-1 text-[10px] ${confidenceColor}`}>
        {confidenceLabel}: {Math.round(confidence * 100)}%
      </div>
    </div>
  );
}

function BudgetRecommendationCard({
  platform, avgRoas, avgSpend, avgRevenue, recommendation, multiplier,
  roasLabel, spendLabel, revenueLabel,
  increaseLabel, decreaseLabel, maintainLabel,
}: {
  platform: string;
  avgRoas: number;
  avgSpend: number;
  avgRevenue: number;
  recommendation: string;
  multiplier: number;
  roasLabel: string;
  spendLabel: string;
  revenueLabel: string;
  increaseLabel: string;
  decreaseLabel: string;
  maintainLabel: string;
}) {
  const recColor =
    recommendation === 'increase' ? 'bg-success/15 text-success' :
    recommendation === 'decrease' ? 'bg-danger/15 text-danger' :
    'bg-warning/15 text-warning';
  const recLabel =
    recommendation === 'increase' ? increaseLabel :
    recommendation === 'decrease' ? decreaseLabel :
    maintainLabel;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-app p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="font-bold capitalize text-fg">{platform}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${recColor}`} role="status">
          {recLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-faint">
        <span>{roasLabel}: <span className="font-bold text-fg">{avgRoas.toFixed(2)}x</span></span>
        <span>{spendLabel}: <span className="font-bold text-fg">${avgSpend.toFixed(2)}</span></span>
        <span>{revenueLabel}: <span className="font-bold text-fg">${avgRevenue.toFixed(2)}</span></span>
        <span className="text-brand-accent">×{multiplier.toFixed(1)}</span>
      </div>
    </div>
  );
}
