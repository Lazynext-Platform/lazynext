'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { CalendarClock, Loader2, AlertCircle, Sparkles, Clock, Users, TrendingUp } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { SmartCalendarResult, ScheduledPost, Platform, ContentFormat } from '@/lib/creative/smart-calendar';

const CREDIT_COST = 3;

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'linkedin', 'x'];
const FORMATS: ContentFormat[] = ['video', 'image', 'carousel'];

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  linkedin: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  x: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const TIME_COLORS: Record<string, string> = {
  morning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  afternoon: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  evening: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

function confidenceColor(c: number): string {
  if (c >= 0.8) return 'text-success';
  if (c >= 0.6) return 'text-brand-accent';
  if (c >= 0.4) return 'text-warning';
  return 'text-danger';
}

interface CreativeForm {
  id: string;
  platform: Platform;
  format: ContentFormat;
  audience: string;
  title: string;
}

export default function SmartCalendarPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['tiktok', 'instagram']);
  const [creatives, setCreatives] = useState<CreativeForm[]>([
    { id: 'c1', platform: 'tiktok', format: 'video', audience: '', title: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SmartCalendarResult | null>(null);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const updateCreative = (index: number, field: keyof CreativeForm, value: string) => {
    setCreatives((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addCreative = () => {
    setCreatives((prev) => [
      ...prev,
      { id: `c${prev.length + 1}`, platform: selectedPlatforms[0] || 'tiktok', format: 'video', audience: '', title: '' },
    ]);
  };

  const removeCreative = (index: number) => {
    setCreatives((prev) => prev.filter((_, i) => i !== index));
  };

  const generate = useCallback(async () => {
    if (!startDate.trim() || !endDate.trim() || creatives.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/smart-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatives: creatives.map((c) => ({
            id: c.id,
            platform: c.platform,
            format: c.format,
            audience: c.audience || undefined,
            title: c.title || undefined,
          })),
          startDate,
          endDate,
          timezone: timezone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('smartCalendar.error'));
      setResult(data.result as SmartCalendarResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, timezone, creatives, t]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="w-6 h-6" /> {t('smartCalendar.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('smartCalendar.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="w-6 h-6" /> {t('smartCalendar.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('smartCalendar.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="scStartDate" className="block text-sm font-medium mb-1">{t('smartCalendar.startDate')}</label>
              <input id="scStartDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
            </div>
            <div>
              <label htmlFor="scEndDate" className="block text-sm font-medium mb-1">{t('smartCalendar.endDate')}</label>
              <input id="scEndDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
            </div>
            <div>
              <label htmlFor="scTimezone" className="block text-sm font-medium mb-1">{t('smartCalendar.timezone')}</label>
              <input id="scTimezone" type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('smartCalendar.platforms')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedPlatforms.includes(p)
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('smartCalendar.creatives')}</label>
            <div className="space-y-2">
              {creatives.map((c, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div>
                    <input type="text" value={c.title} onChange={(e) => updateCreative(i, 'title', e.target.value)} placeholder="Title" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  </div>
                  <div>
                    <select value={c.platform} onChange={(e) => updateCreative(i, 'platform', e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <select value={c.format} onChange={(e) => updateCreative(i, 'format', e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
                      {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <input type="text" value={c.audience} onChange={(e) => updateCreative(i, 'audience', e.target.value)} placeholder="Audience" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  </div>
                  <button type="button" onClick={() => removeCreative(i)} className="rounded-lg border border-border px-3 py-2 text-sm text-danger hover:bg-danger/10" disabled={loading || creatives.length === 1}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addCreative} className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover" disabled={loading}>+ Add creative</button>
          </div>

          <button onClick={generate} disabled={loading || !startDate.trim() || !endDate.trim() || creatives.length === 0} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('smartCalendar.generating') : `${t('smartCalendar.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('smartCalendar.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('smartCalendar.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('smartCalendar.dryRunNotice')}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted">{t('smartCalendar.totalPosts')}</div>
                <div className="text-xl font-bold">{result.totalPosts}</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted">{t('smartCalendar.confidence')}</div>
                <div className={`text-xl font-bold ${confidenceColor(result.averageConfidence)}`}>{(result.averageConfidence * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted">{t('smartCalendar.timezone')}</div>
                <div className="text-xl font-bold">{result.timezone}</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted">{t('smartCalendar.platforms')}</div>
                <div className="text-xl font-bold">{Object.keys(result.platformBreakdown).length}</div>
              </div>
            </div>

            {result.schedule.length > 0 ? (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3"><CalendarClock className="w-4 h-4" /> {t('smartCalendar.schedule')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <caption className="sr-only">{t('smartCalendar.schedule')}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="text-left py-1">{t('smartCalendar.date')}</th>
                        <th scope="col" className="text-left py-1">{t('smartCalendar.time')}</th>
                        <th scope="col" className="text-left py-1">{t('smartCalendar.platform')}</th>
                        <th scope="col" className="text-left py-1">{t('smartCalendar.creative')}</th>
                        <th scope="col" className="text-left py-1">{t('smartCalendar.expectedReach')}</th>
                        <th scope="col" className="text-left py-1">{t('smartCalendar.confidence')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.schedule.map((post: ScheduledPost, i: number) => (
                        <tr key={i} className="border-t border-border align-top">
                          <td className="py-1.5 font-medium">{post.date}</td>
                          <td className="py-1.5">
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${TIME_COLORS[post.timeOfDay] || TIME_COLORS.morning}`}>
                              {post.time}
                            </span>
                          </td>
                          <td className="py-1.5">
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[post.platform] || PLATFORM_COLORS.x}`}>
                              {post.platform}
                            </span>
                          </td>
                          <td className="py-1.5 text-fg-muted">{post.creativeId}</td>
                          <td className="py-1.5"><span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{post.expectedReach.toLocaleString()}</span></td>
                          <td className={`py-1.5 ${confidenceColor(post.confidence)}`}>{(post.confidence * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
                {t('smartCalendar.noSchedule')}
              </div>
            )}

            {result.schedule.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3"><Clock className="w-4 h-4" /> {t('smartCalendar.optimalTimes')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2"><span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${TIME_COLORS.morning}`}>{t('smartCalendar.morning')}</span><span className="text-fg-muted">06:00 – 10:00</span></div>
                  <div className="flex items-center gap-2"><span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${TIME_COLORS.afternoon}`}>{t('smartCalendar.afternoon')}</span><span className="text-fg-muted">11:00 – 15:00</span></div>
                  <div className="flex items-center gap-2"><span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${TIME_COLORS.evening}`}>{t('smartCalendar.evening')}</span><span className="text-fg-muted">17:00 – 22:00</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
