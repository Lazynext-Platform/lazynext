'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, ChevronRight, CalendarDays,
  TrendingUp, MousePointerClick, Eye, Clock, Sparkles, X,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { formatNumber } from '@/lib/i18n-format';

type ScheduleEntry = {
  id: string;
  date: string;
  type: 'campaign' | 'creative';
  name: string;
  platform?: string;
  status?: string;
  budgetDaily?: number | null;
  creativeIds?: unknown;
};

type ScheduleStats = {
  total: number;
  campaigns: number;
  creatives: number;
  active: number;
  pending: number;
};

type ScheduleResponse = {
  month: string;
  entries: ScheduleEntry[];
  stats: ScheduleStats;
};

type Suggestion = {
  day: string;
  hour: number;
  avgRoas: number;
  avgCtr: number;
  totalImpressions: number;
  label: string;
  platform: string;
};

type PlatformBest = {
  platform: string;
  bestDay: string;
  bestHour: number;
  avgRoas: number;
};

type OptimalTimesResponse = {
  suggestions: Suggestion[];
  platformBest: PlatformBest[];
  hasData: boolean;
  totalRecords?: number;
  message?: string;
};

const PLATFORM_OPTIONS = ['meta', 'google', 'tiktok', 'instagram', 'youtube', 'facebook'];
const STATUS_OPTIONS = ['draft', 'pending_approval', 'active', 'paused', 'completed'];

const PLATFORM_COLORS: Record<string, string> = {
  meta: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  google: 'bg-red-500/15 text-red-400',
  tiktok: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  instagram: 'bg-pink-500/15 text-pink-400',
  youtube: 'bg-red-500/15 text-red-400',
  facebook: 'bg-blue-600/15 text-blue-400',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-fg-faint/10 text-fg-faint',
  pending_approval: 'bg-amber-500/15 text-amber-400',
  active: 'bg-emerald-500/15 text-emerald-400',
  paused: 'bg-fg-faint/10 text-fg-faint',
  completed: 'bg-purple-500/15 text-purple-400',
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthLabel(year: number, month: number, locale: string) {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : locale, { month: 'long', year: 'numeric' });
}

export function ContentCalendar() {
  const { t, locale } = useI18n();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');

  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [optimal, setOptimal] = useState<OptimalTimesResponse | null>(null);
  const [optimalLoading, setOptimalLoading] = useState(true);

  const [selected, setSelected] = useState<ScheduleEntry | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [rescheduleMsg, setRescheduleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const monthParam = useMemo(() => `${viewYear}-${pad2(viewMonth + 1)}`, [viewYear, viewMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('month', monthParam);
      if (platform) params.set('platform', platform);
      if (status) params.set('status', status);
      const res = await fetch(`/api/creative/schedule?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json().catch(() => ({}));
      setData(j);
    } catch {
      setError(t('calendar.error'));
    } finally {
      setLoading(false);
    }
  }, [monthParam, platform, status, t]);

  const loadOptimal = useCallback(async () => {
    setOptimalLoading(true);
    try {
      const params = new URLSearchParams();
      if (platform) params.set('platform', platform);
      const res = await fetch(`/api/creative/optimal-times?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json().catch(() => ({}));
      setOptimal(j);
    } catch {
      setOptimal({ suggestions: [], platformBest: [], hasData: false });
    } finally {
      setOptimalLoading(false);
    }
  }, [platform]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOptimal(); }, [loadOptimal]);

  // Auto-dismiss reschedule message
  useEffect(() => {
    if (!rescheduleMsg) return;
    const id = setTimeout(() => setRescheduleMsg(null), 3000);
    return () => clearTimeout(id);
  }, [rescheduleMsg]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); };

  // Build calendar grid
  const entriesByDate = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    for (const e of data?.entries || []) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [data]);

  const gridDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ date: string | null; day: number | null; isToday: boolean }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ date: null, day: null, isToday: false });
    const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`;
      cells.push({ date: dateStr, day: d, isToday: dateStr === todayStr });
    }
    // pad to multiple of 7
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null, isToday: false });
    return cells;
  }, [viewYear, viewMonth, now]);

  const handleDragStart = (e: React.DragEvent, entry: ScheduleEntry) => {
    setDragId(entry.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entry.id);
  };
  const handleDragEnd = () => {
    setDragId(null);
    setDragOverDate(null);
  };
  const handleDragOver = (e: React.DragEvent, date: string) => {
    if (!date) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== date) setDragOverDate(date);
  };
  const handleDragLeave = (date: string) => {
    if (dragOverDate === date) setDragOverDate(null);
  };
  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const entryId = e.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    if (!entryId || !date) return;

    const entry = (data?.entries || []).find(en => en.id === entryId);
    if (!entry || entry.type !== 'campaign') return; // only campaigns can be rescheduled
    if (entry.date === date) return;

    try {
      const res = await fetch('/api/creative/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: entryId, newDate: date }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRescheduleMsg({ type: 'success', text: t('calendar.rescheduleSuccess') });
      await load();
    } catch {
      setRescheduleMsg({ type: 'error', text: t('calendar.rescheduleError') });
    }
  };

  const stats = data?.stats;
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-brand-accent" aria-hidden="true" />
          {t('calendar.title')}
        </h1>
        <p className="text-sm text-fg-faint">{t('calendar.description')}</p>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" role="region" aria-label={t('calendar.stats')}>
          <StatCard label={t('calendar.totalEntries')} value={stats.total} />
          <StatCard label={t('calendar.totalCampaigns')} value={stats.campaigns} />
          <StatCard label={t('calendar.totalCreatives')} value={stats.creatives} />
          <StatCard label={t('calendar.activeCampaigns')} value={stats.active} accent="text-emerald-400" />
          <StatCard label={t('calendar.pendingCampaigns')} value={stats.pending} accent="text-amber-400" />
        </div>
      )}

      {/* Filters + month navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            aria-label={t('calendar.prevMonth')}
            className="rounded-lg border border-line bg-surface p-2 text-fg transition hover:bg-hover focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-bold" aria-live="polite">
            {monthLabel(viewYear, viewMonth, locale)}
          </span>
          <button
            onClick={goNext}
            aria-label={t('calendar.nextMonth')}
            className="rounded-lg border border-line bg-surface p-2 text-fg transition hover:bg-hover focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-fg transition hover:bg-hover focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            {t('calendar.today')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="cal-filter-platform" className="text-xs font-medium text-fg-faint">
              {t('calendar.filterPlatform')}
            </label>
            <select
              id="cal-filter-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              aria-label={t('calendar.filterPlatform')}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">{t('calendar.allPlatforms')}</option>
              {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="cal-filter-status" className="text-xs font-medium text-fg-faint">
              {t('calendar.filterStatus')}
            </label>
            <select
              id="cal-filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label={t('calendar.filterStatus')}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">{t('calendar.allStatuses')}</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Reschedule message */}
      {rescheduleMsg && (
        <div
          role={rescheduleMsg.type === 'success' ? 'status' : 'alert'}
          className={`rounded-lg border p-3 text-sm ${
            rescheduleMsg.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-danger'
          }`}
        >
          {rescheduleMsg.text}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div role="alert" className="rounded-lg border border-line bg-surface p-4 text-sm text-danger">
          <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
          {error}
          <button onClick={() => load()} className="ml-3 underline hover:opacity-80">
            {t('calendar.retry')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div role="status" className="flex items-center gap-2 text-fg-faint py-12">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          <span className="text-sm">{t('calendar.loading')}</span>
        </div>
      )}

      {/* Drag hint */}
      {!loading && !error && (
        <p className="text-xs text-fg-faint flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          {t('calendar.dragToReschedule')}
        </p>
      )}

      {/* Calendar — desktop grid view */}
      {!loading && !error && (
        <>
          <div className="hidden md:block" role="region" aria-label={t('calendar.title')}>
            <div className="grid grid-cols-7 gap-px rounded-xl border border-line bg-line overflow-hidden">
              {/* Day headers */}
              {DAY_KEYS.map(dk => (
                <div key={dk} className="bg-surface px-2 py-2 text-center text-xs font-bold uppercase text-fg-faint">
                  {t(`calendar.${dk}`)}
                </div>
              ))}
              {/* Day cells */}
              {gridDays.map((cell, idx) => {
                const cellEntries = cell.date ? (entriesByDate[cell.date] || []) : [];
                const isDragOver = dragOverDate === cell.date;
                return (
                  <div
                    key={idx}
                    role="gridcell"
                    aria-label={cell.date ? `${cell.day} — ${cellEntries.length} ${cellEntries.length === 1 ? t('calendar.entry') : t('calendar.entries')}` : undefined}
                    onDragOver={cell.date ? (e) => handleDragOver(e, cell.date!) : undefined}
                    onDragLeave={cell.date ? () => handleDragLeave(cell.date!) : undefined}
                    onDrop={cell.date ? (e) => handleDrop(e, cell.date!) : undefined}
                    className={`min-h-[88px] bg-surface p-1.5 transition ${
                      isDragOver ? 'ring-2 ring-brand-accent ring-inset bg-brand-accent/5' : ''
                    } ${cell.isToday ? 'bg-brand-accent/5' : ''}`}
                  >
                    {cell.day != null && (
                      <>
                        <div className={`mb-1 text-xs font-bold ${cell.isToday ? 'text-brand-accent' : 'text-fg-faint'}`}>
                          {cell.day}
                        </div>
                        <div className="space-y-1">
                          {cellEntries.slice(0, 4).map(en => (
                            <button
                              key={en.id}
                              draggable={en.type === 'campaign'}
                              onDragStart={(e) => handleDragStart(e, en)}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelected(en)}
                              className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-brand-accent ${
                                en.type === 'campaign'
                                  ? 'bg-blue-500/15 text-blue-400'
                                  : 'bg-purple-500/15 text-purple-400'
                              } ${dragId === en.id ? 'opacity-40' : ''}`}
                              title={en.name}
                              aria-label={`${en.type === 'campaign' ? t('calendar.campaign') : t('calendar.creative')}: ${en.name}`}
                            >
                              {en.name}
                            </button>
                          ))}
                          {cellEntries.length > 4 && (
                            <span className="text-[10px] text-fg-faint">
                              +{cellEntries.length - 4} {t('calendar.more') || 'more'}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar — mobile list view */}
          <div className="md:hidden" role="region" aria-label={t('calendar.title')}>
            <ul className="space-y-2">
              {gridDays.filter(c => c.date && (entriesByDate[c.date!] || []).length > 0).length === 0 && (
                <li className="rounded-lg border border-line bg-surface p-4 text-center text-sm text-fg-faint">
                  {t('calendar.noEntries')}
                </li>
              )}
              {gridDays.filter(c => c.date && (entriesByDate[c.date!] || []).length > 0).map(cell => {
                const cellEntries = entriesByDate[cell.date!] || [];
                return (
                  <li key={cell.date} className="rounded-lg border border-line bg-surface p-3">
                    <div className="mb-2 text-xs font-bold text-fg-faint">
                      {cell.date}{cell.isToday ? ` · ${t('calendar.today')}` : ''}
                    </div>
                    <ul className="space-y-1.5">
                      {cellEntries.map(en => (
                        <li key={en.id}>
                          <button
                            draggable={en.type === 'campaign'}
                            onDragStart={(e) => handleDragStart(e, en)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setSelected(en)}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium transition hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-brand-accent ${
                              en.type === 'campaign'
                                ? 'bg-blue-500/15 text-blue-400'
                                : 'bg-purple-500/15 text-purple-400'
                            }`}
                            aria-label={`${en.type === 'campaign' ? t('calendar.campaign') : t('calendar.creative')}: ${en.name}`}
                          >
                            <span className="truncate">{en.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* Suggested optimal times panel */}
      <section aria-label={t('calendar.suggestedTimes')} className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-brand-accent" aria-hidden="true" />
          {t('calendar.suggestedTimes')}
        </h2>

        {optimalLoading && (
          <div role="status" className="flex items-center gap-2 text-fg-faint py-4">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span className="text-xs">{t('calendar.loading')}</span>
          </div>
        )}

        {!optimalLoading && optimal && !optimal.hasData && (
          <p className="text-xs text-fg-faint py-2">{optimal.message || t('calendar.noSuggestions')}</p>
        )}

        {!optimalLoading && optimal && optimal.hasData && (
          <div className="space-y-4">
            {/* Top 5 suggestions */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-fg-faint">{t('calendar.bestTime')}</h3>
              <ul className="space-y-2">
                {optimal.suggestions.map((s, i) => (
                  <li key={`${s.day}-${s.hour}-${i}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-app px-3 py-2">
                    <span className="text-sm font-bold text-fg min-w-[120px]">{s.label}</span>
                    <Metric icon={<TrendingUp className="w-3 h-3" />} label={t('calendar.avgRoas')} value={`${s.avgRoas.toFixed(2)}x`} good={s.avgRoas >= 3} />
                    <Metric icon={<MousePointerClick className="w-3 h-3" />} label={t('calendar.avgCtr')} value={`${s.avgCtr.toFixed(2)}%`} />
                    <Metric icon={<Eye className="w-3 h-3" />} label={t('calendar.impressions')} value={formatNumber(s.totalImpressions, locale)} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Per-platform best */}
            {optimal.platformBest.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-fg-faint">{t('calendar.platformBest')}</h3>
                <ul className="flex flex-wrap gap-2">
                  {optimal.platformBest.map(pb => (
                    <li key={pb.platform} className="flex items-center gap-2 rounded-lg border border-line bg-app px-3 py-1.5">
                      <span className={`text-xs font-medium ${PLATFORM_COLORS[pb.platform] || 'text-fg'}`}>
                        {pb.platform}
                      </span>
                      <span className="text-xs text-fg">
                        {pb.bestDay.charAt(0).toUpperCase() + pb.bestDay.slice(1)} {pb.bestHour}:00
                      </span>
                      <span className="text-xs font-bold text-emerald-400">{pb.avgRoas.toFixed(2)}x</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Entry detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-tight">{selected.name}</h3>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1 text-fg-faint transition hover:bg-hover hover:text-fg focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-fg-faint">{t('calendar.type')}</dt>
                <dd className="font-medium">
                  <span className={selected.type === 'campaign' ? 'text-blue-400' : 'text-purple-400'}>
                    {selected.type === 'campaign' ? t('calendar.campaign') : t('calendar.creative')}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-faint">{t('calendar.scheduled')}</dt>
                <dd className="font-medium text-fg">{selected.date}</dd>
              </div>
              {selected.platform && (
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-faint">{t('calendar.filterPlatform')}</dt>
                  <dd className={`font-medium ${PLATFORM_COLORS[selected.platform] || 'text-fg'}`}>{selected.platform}</dd>
                </div>
              )}
              {selected.status && (
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-faint">{t('calendar.filterStatus')}</dt>
                  <dd className={`font-medium ${STATUS_COLORS[selected.status] || 'text-fg'}`}>
                    {selected.status === 'active' ? t('calendar.active')
                      : selected.status === 'pending_approval' ? t('calendar.pending')
                      : selected.status === 'rejected' ? t('calendar.rejected')
                      : selected.status}
                  </dd>
                </div>
              )}
              {selected.budgetDaily != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-faint">{t('calendar.budgetDaily') || 'Daily Budget'}</dt>
                  <dd className="font-medium text-fg">${selected.budgetDaily.toFixed(2)}</dd>
                </div>
              )}
            </dl>
            {selected.type === 'campaign' && (
              <p className="mt-3 text-xs text-fg-faint">{t('calendar.dragToReschedule')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-center">
      <div className={`text-lg font-bold ${accent || 'text-fg'}`}>{value}</div>
      <div className="text-xs text-fg-faint">{label}</div>
    </div>
  );
}

function Metric({ icon, label, value, good }: { icon: React.ReactNode; label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-fg-faint">{icon}</span>
      <span className="text-xs text-fg-faint">{label}</span>
      <span className={`text-xs font-bold ${good ? 'text-emerald-400' : 'text-fg'}`}>{value}</span>
    </div>
  );
}
