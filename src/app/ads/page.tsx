'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Megaphone, Loader2, CheckCircle2, AlertCircle, Coins,
  TrendingUp, Eye, MousePointerClick, ShoppingCart, DollarSign, RefreshCw,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

type Campaign = {
  id: string;
  platform: string;
  campaignId?: string;
  name: string;
  status: string;
  budgetDaily?: number;
  budgetTotal?: number;
  currency: string;
  metrics?: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; cvr: number; roas: number };
  createdAt: string;
};

export default function AdsPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const [platform, setPlatform] = useState<'meta' | 'google'>('meta');
  const [name, setName] = useState('');
  const [creativeIds, setCreativeIds] = useState('');
  const [budgetDaily, setBudgetDaily] = useState(10);
  const [dryRun, setDryRun] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);

  const [step, setStep] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState('');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [metricsMap, setMetricsMap] = useState<Record<string, Campaign['metrics']>>({});
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!session?.user) return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/ads/list');
      if (res.ok) {
        const j = await res.json();
        setCampaigns(j.campaigns || []);
      }
    } catch { /* non-fatal */ }
    setLoadingList(false);
  }, [session]);

  useEffect(() => { if (session?.user) loadCampaigns(); }, [session, loadCampaigns]);

  const refreshMetrics = useCallback(async (campaignId: string, platform: string) => {
    if (!session?.user) return;
    setRefreshingId(campaignId);
    try {
      const res = await fetch('/api/ads/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, platform }),
      });
      if (res.ok) {
        const j = await res.json();
        setMetricsMap((prev) => ({ ...prev, [campaignId]: j.metrics }));
      }
    } catch { /* non-fatal */ }
    setRefreshingId(null);
  }, [session]);

  const create = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    if (!name.trim() || !creativeIds.trim()) return;
    setStep('loading'); setError(''); setCampaign(null);
    try {
      const res = await fetch('/api/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            platform,
            name: name.trim(),
            creativeIds: creativeIds.split(',').map(s => s.trim()).filter(Boolean),
            budgetDaily,
            currency: 'USD',
          },
          dryRun,
          requireApproval,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'create_failed');
      setCampaign(j.campaign as Campaign);
      setStep('done');
      loadCampaigns();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setStep('error');
    }
  }, [session, platform, name, creativeIds, budgetDaily, dryRun, requireApproval, loadCampaigns]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-success';
      case 'paused': return 'text-warning';
      case 'draft': return 'text-fg-faint';
      case 'pending_approval': return 'text-warning';
      default: return 'text-fg';
    }
  };

  return (
    <div className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          <Megaphone className="mr-2 inline h-7 w-7 text-brand-accent" />
          {t('ads.title')}
        </h1>
        <p className="mt-2 text-sm text-fg-faint">
          {t('ads.subtitle')}
        </p>

        {/* Create form */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-bold text-fg">{t('ads.createCampaign')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="platform-select">{t('ads.platform')}</label>
              <select
                id="platform-select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'meta' | 'google')}
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              >
                <option value="meta">{t('ads.platformMeta')}</option>
                <option value="google">{t('ads.platformGoogle')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="campaign-name">{t('ads.campaignName')}</label>
              <input
                id="campaign-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Sale - Glow Serum"
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-fg-faint" htmlFor="creative-ids">{t('ads.creativeIds')}</label>
              <input
                id="creative-ids"
                type="text"
                value={creativeIds}
                onChange={(e) => setCreativeIds(e.target.value)}
                placeholder="abc123, def456"
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="daily-budget">{t('ads.dailyBudget')}</label>
              <input
                id="daily-budget"
                type="number"
                min={1}
                value={budgetDaily}
                onChange={(e) => setBudgetDaily(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs text-fg">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                {t('ads.dryRun')}
              </label>
              <label className="flex items-center gap-2 text-xs text-fg">
                <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
                {t('ads.requireApproval')}
              </label>
            </div>
          </div>

          <button
            onClick={create}
            disabled={step === 'loading' || !name.trim() || !creativeIds.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: '#0064d9' }}
          >
            {step === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            {dryRun ? t('ads.simulate') : t('ads.create')}
          </button>
        </section>

        {/* Error */}
        {step === 'error' && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
          </div>
        )}

        {/* Created campaign result */}
        {campaign && (
          <section className="mt-4 rounded-2xl border-2 border-brand-accent/30 bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {campaign.status === 'draft' ? t('ads.campaignSimulated') : t('ads.campaignCreated')}
            </h2>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div><span className="text-fg-faint">{t('ads.name')}</span> <span className="text-fg">{campaign.name}</span></div>
              <div><span className="text-fg-faint">{t('ads.platformLabel')}</span> <span className="text-fg">{campaign.platform}</span></div>
              <div><span className="text-fg-faint">{t('ads.status')}</span> <span className={statusColor(campaign.status)}>{campaign.status}</span></div>
              <div><span className="text-fg-faint">{t('ads.budget')}</span> <span className="text-fg">${campaign.budgetDaily}/{campaign.currency}/day</span></div>
            </div>
            {campaign.metrics && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric icon={Eye} label={t('ads.impressions')} value={campaign.metrics.impressions.toLocaleString()} />
                <Metric icon={MousePointerClick} label={t('ads.clicks')} value={campaign.metrics.clicks.toLocaleString()} />
                <Metric icon={TrendingUp} label={t('ads.ctr')} value={`${campaign.metrics.ctr.toFixed(1)}%`} />
                <Metric icon={Coins} label={t('ads.estSpend')} value={`$${(campaign.budgetDaily || 0).toFixed(2)}`} />
              </div>
            )}
          </section>
        )}

        {/* Campaign list */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-bold text-fg">{t('ads.yourCampaigns')}</h2>
          {loadingList && <Loader2 className="mt-3 h-4 w-4 animate-spin text-fg-faint" />}
          {!loadingList && campaigns.length === 0 && (
            <p className="mt-3 text-xs text-fg-faint">{t('ads.noCampaigns')}</p>
          )}
          {campaigns.length > 0 && (
            <div className="mt-3 space-y-3">
              {campaigns.map((c) => {
                const m = metricsMap[c.id] || c.metrics;
                return (
                  <div key={c.id} className="rounded-xl border border-line bg-app p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-fg">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={statusColor(c.status)}>{c.status}</span>
                        <button
                          onClick={() => refreshMetrics(c.id, c.platform)}
                          disabled={refreshingId === c.id}
                          aria-label={`Refresh metrics for ${c.name}`}
                          className="rounded p-1 text-fg-faint hover:bg-hover hover:text-fg disabled:opacity-50"
                        >
                          {refreshingId === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-fg-faint">
                      <span>{c.platform}</span>
                      {c.budgetDaily && <span>${c.budgetDaily}/day</span>}
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    {m && (
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <MiniMetric label={t('ads.metricImpr')} value={m.impressions.toLocaleString()} />
                        <MiniMetric label={t('ads.metricClicks')} value={m.clicks.toLocaleString()} />
                        <MiniMetric label={t('ads.metricCtr')} value={`${m.ctr.toFixed(1)}%`} />
                        <MiniMetric label={t('ads.metricCvr')} value={`${m.cvr.toFixed(1)}%`} />
                        <MiniMetric label={t('ads.metricSpend')} value={`$${m.spend.toFixed(2)}`} />
                        <MiniMetric label={t('ads.metricRoas')} value={`${m.roas.toFixed(2)}x`} highlight={m.roas >= 1 ? 'pos' : 'neg'} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-app p-3">
      <Icon className="h-4 w-4 text-fg-faint" />
      <div className="mt-1 text-lg font-bold text-fg">{value}</div>
      <div className="text-[10px] text-fg-faint">{label}</div>
    </div>
  );
}

function MiniMetric({ label, value, highlight }: { label: string; value: string; highlight?: 'pos' | 'neg' }) {
  const color = highlight === 'pos' ? 'text-success' : highlight === 'neg' ? 'text-danger' : 'text-fg';
  return (
    <div className="rounded-lg bg-surface px-2 py-1">
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-fg-faint">{label}</div>
    </div>
  );
}
