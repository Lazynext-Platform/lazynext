'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Anchor, Loader2, AlertCircle, Sparkles, Copy, Check, Filter } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { Hook, EmotionalTrigger, Platform } from '@/lib/creative/hook-library';

const CREDIT_COST = 4;

const TRIGGERS: EmotionalTrigger[] = ['fear', 'aspiration', 'humor', 'urgency', 'curiosity', 'social_proof'];
const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook'];

const TRIGGER_COLORS: Record<EmotionalTrigger, string> = {
  fear: 'bg-danger/20 text-danger border-danger/30',
  aspiration: 'bg-success/20 text-success border-success/30',
  humor: 'bg-warning/20 text-warning border-warning/30',
  urgency: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  curiosity: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  social_proof: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
};

const PLATFORM_COLORS: Record<Platform, string> = {
  tiktok: 'bg-fg/10 text-fg border-border',
  instagram: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
  youtube: 'bg-red-500/20 text-red-500 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 70) return 'text-brand-accent';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function HookLibraryPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [audience, setAudience] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<EmotionalTrigger[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [filterTrigger, setFilterTrigger] = useState<EmotionalTrigger | ''>('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | ''>('');
  const [filterMinScore, setFilterMinScore] = useState(0);

  // Load the user's persisted hooks from D1 via the API route (which carries
  // the session and enforces ownership). Runs once the session is available.
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/creative/hook-library', { method: 'GET' });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.hooks)) {
          setHooks(data.hooks as Hook[]);
        }
      } catch {
        // ignore — hooks will populate on next generation
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user]);

  const toggleTrigger = (tr: EmotionalTrigger) => {
    setSelectedTriggers((prev) =>
      prev.includes(tr) ? prev.filter((x) => x !== tr) : [...prev, tr],
    );
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/creative/hook-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          audience: audience.trim() || undefined,
          triggers: selectedTriggers.length ? selectedTriggers : undefined,
          platforms: selectedPlatforms.length ? selectedPlatforms : undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('hookLibrary.error'));
      const newHooks = data.result.hooks as Hook[];
      setHooks((prev) => [...newHooks, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, audience, selectedTriggers, selectedPlatforms, count, t]);

  const copyHook = async (hook: Hook) => {
    try {
      await navigator.clipboard.writeText(hook.text);
      setCopiedId(hook.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const clearFilters = () => {
    setFilterTrigger('');
    setFilterPlatform('');
    setFilterMinScore(0);
  };

  const filteredHooks = hooks.filter((h) => {
    if (filterTrigger && h.trigger !== filterTrigger) return false;
    if (filterPlatform && !h.platforms.includes(filterPlatform as Platform)) return false;
    if (filterMinScore > 0 && h.performanceScore < filterMinScore) return false;
    return true;
  });

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Anchor className="w-6 h-6" /> {t('hookLibrary.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('hookLibrary.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Anchor className="w-6 h-6" /> {t('hookLibrary.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('hookLibrary.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="hlProduct" className="block text-sm font-medium mb-1">{t('hookLibrary.productContext')}</label>
                <input id="hlProduct" type="text" value={productOrBrand} onChange={(e) => setProductOrBrand(e.target.value)} placeholder="e.g., Acme noise-cancelling headphones" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="hlAudience" className="block text-sm font-medium mb-1">{t('hookLibrary.audience')}</label>
                <input id="hlAudience" type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g., remote workers" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('hookLibrary.emotionalTrigger')}</label>
            <div className="flex flex-wrap gap-2">
              {TRIGGERS.map((tr) => (
                <button key={tr} type="button" onClick={() => toggleTrigger(tr)} disabled={loading}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedTriggers.includes(tr)
                      ? TRIGGER_COLORS[tr]
                      : 'border-border bg-bg-card text-fg-muted hover:text-fg'
                  }`}>
                  {t(`hookLibrary.${tr}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('hookLibrary.platform')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)} disabled={loading}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedPlatforms.includes(p)
                      ? PLATFORM_COLORS[p]
                      : 'border-border bg-bg-card text-fg-muted hover:text-fg'
                  }`}>
                  {t(`hookLibrary.${p}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="hlCount" className="block text-sm font-medium mb-1">{t('hookLibrary.count')}</label>
            <input id="hlCount" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="w-24 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>

          <button onClick={generate} disabled={loading || !productOrBrand.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('hookLibrary.generating') : `${t('hookLibrary.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('hookLibrary.generating')}
          </div>
        )}

        {!loading && hooks.length === 0 && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('hookLibrary.noHooks')}
          </div>
        )}

        {hooks.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Filter className="w-4 h-4" /> {t('hookLibrary.filter')}</h3>
              <div className="flex flex-wrap items-center gap-3">
                <select value={filterTrigger} onChange={(e) => setFilterTrigger(e.target.value as EmotionalTrigger | '')} className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent">
                  <option value="">{t('hookLibrary.all')}</option>
                  {TRIGGERS.map((tr) => <option key={tr} value={tr}>{t(`hookLibrary.${tr}`)}</option>)}
                </select>
                <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value as Platform | '')} className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent">
                  <option value="">{t('hookLibrary.all')}</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{t(`hookLibrary.${p}`)}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <label htmlFor="hlMinScore" className="text-sm text-fg-muted">{t('hookLibrary.minScore')}</label>
                  <input id="hlMinScore" type="number" min={0} max={100} value={filterMinScore} onChange={(e) => setFilterMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-20 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                </div>
                <button type="button" onClick={clearFilters} className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg transition">
                  {t('hookLibrary.clearFilters')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredHooks.map((hook) => (
                <div key={hook.id} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${TRIGGER_COLORS[hook.trigger]}`}>
                      {t(`hookLibrary.${hook.trigger}`)}
                    </span>
                    <button type="button" onClick={() => copyHook(hook)} className="text-fg-muted hover:text-fg transition flex items-center gap-1 text-xs" aria-label={t('hookLibrary.copy')}>
                      {copiedId === hook.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === hook.id ? t('hookLibrary.copied') : t('hookLibrary.copy')}
                    </button>
                  </div>
                  <p className="text-sm font-medium">{hook.text}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {hook.platforms.map((p) => (
                        <span key={p} className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[p]}`}>
                          {t(`hookLibrary.${p}`)}
                        </span>
                      ))}
                    </div>
                    <span className={`text-sm font-bold ${scoreColor(hook.performanceScore)}`}>
                      {t('hookLibrary.performanceScore')}: {hook.performanceScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredHooks.length === 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
                {t('hookLibrary.noHooks')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
