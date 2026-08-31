'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Target,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdPlacementStrategistResult,
  PlacementRecommendation,
  Priority,
} from '@/lib/creative/ad-placement-strategist';

const CREDIT_COST = 5;

const BUDGETS = ['low', 'medium', 'high'] as const;
const GOALS = ['awareness', 'engagement', 'conversions', 'traffic', 'app_installs'] as const;

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-bg-secondary text-fg-muted border-border',
};

export default function AdPlacementStrategistPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [budget, setBudget] = useState<string>('medium');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdPlacementStrategistResult | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleGoal = useCallback((goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }, []);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-placement-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          budget,
          goals: selectedGoals.length > 0 ? selectedGoals : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adPlacementStrategist.error'));
      setResult(data.result as AdPlacementStrategistResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, budget, selectedGoals, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const s = result.strategy;
      const text =
        `${s.summary}\n\n` +
        `Placements:\n${s.placements.map((p) => `- ${p.platform} / ${p.placementType} (${p.format}) — Fit: ${p.audienceFit}/10, CPM: ${p.estimatedCPM}, Reach: ${p.estimatedReach}, Priority: ${p.priority}`).join('\n')}\n\n` +
        `Budget Allocation: ${s.budgetAllocation}\n\n` +
        `Timeline: ${s.timeline}\n\n` +
        `Risks:\n${s.risks.map((r) => `- ${r}`).join('\n')}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('adPlacementStrategist.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" /> {t('adPlacementStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adPlacementStrategist.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adPlacementStrategist.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" /> {t('adPlacementStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adPlacementStrategist.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="apsProduct" className="block text-sm font-medium mb-1">
              {t('adPlacementStrategist.productOrBrand')}
            </label>
            <textarea
              id="apsProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="apsAudience" className="block text-sm font-medium mb-1">
              {t('adPlacementStrategist.targetAudience')}
            </label>
            <input
              id="apsAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., millennial women aged 25-35 interested in skincare"
              maxLength={1000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adPlacementStrategist.budget')}</label>
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBudget(b)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    budget === b
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adPlacementStrategist.goals')}</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGoal(g)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedGoals.includes(g)
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adPlacementStrategist.generating') : `${t('adPlacementStrategist.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adPlacementStrategist.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adPlacementStrategist.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adPlacementStrategist.dryRunNotice')}
              </div>
            )}

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('adPlacementStrategist.copied') : t('adPlacementStrategist.copy')}
              </button>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-sm">{result.strategy.summary}</p>
            </div>

            {/* Placement cards */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('adPlacementStrategist.placements')}</h3>
              {result.strategy.placements.map((p: PlacementRecommendation, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.platform}</span>
                      <span className="text-xs text-fg-muted">/ {p.placementType}</span>
                      <span className="text-xs text-fg-muted">({p.format})</span>
                    </div>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[p.priority] || PRIORITY_COLORS.low}`}>
                      {p.priority}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> {t('adPlacementStrategist.audienceFit')}: {p.audienceFit}/10
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> CPM: {p.estimatedCPM}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> {t('adPlacementStrategist.reach')}: {p.estimatedReach}
                    </span>
                  </div>

                  <p className="text-xs text-fg-muted">{p.expectedPerformance}</p>
                </div>
              ))}
            </div>

            {/* Budget allocation */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-xs font-medium text-fg flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> {t('adPlacementStrategist.budgetAllocation')}
              </p>
              <p className="text-sm text-fg-muted">{result.strategy.budgetAllocation}</p>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-xs font-medium text-fg flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {t('adPlacementStrategist.timeline')}
              </p>
              <p className="text-sm text-fg-muted">{result.strategy.timeline}</p>
            </div>

            {/* Risks */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-xs font-medium text-fg flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {t('adPlacementStrategist.risks')}
              </p>
              <ul className="text-sm text-fg-muted list-disc list-inside space-y-0.5">
                {result.strategy.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
