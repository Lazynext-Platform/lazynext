'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  BudgetAllocatorResult,
  BudgetAllocation,
  PlatformAllocation,
  CampaignGoal,
} from '@/lib/creative/ad-budget-allocator';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const GOALS: CampaignGoal[] = ['awareness', 'engagement', 'conversions', 'traffic', 'app_installs'];

export default function AdBudgetAllocatorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>('awareness');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BudgetAllocatorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePlatform = useCallback((p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }, []);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !totalBudget.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-budget-allocator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          totalBudget,
          campaignGoal,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adBudgetAllocator.error'));
      setResult(data.result as BudgetAllocatorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, totalBudget, campaignGoal, selectedPlatforms, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const a: BudgetAllocation = result.allocation;
      const lines = [
        `Total Budget: ${a.totalBudget}`,
        `Recommended Split: ${a.recommendedSplit}`,
        '',
        'Platform Allocations:',
        ...a.platformAllocations.map((p: PlatformAllocation) =>
          `  ${p.platform}: ${p.percentage}% (${p.amount}) — Reach: ${p.expectedReach}, Clicks: ${p.expectedClicks}, Conversions: ${p.expectedConversions}\n    Rationale: ${p.rationale}`,
        ),
        '',
        'Optimization Notes:',
        ...a.optimizationNotes.map((n) => `  - ${n}`),
        '',
        'Risk Factors:',
        ...a.riskFactors.map((r) => `  - ${r}`),
      ];
      await navigator.clipboard.writeText(lines.join('\n'));
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
          {t('adBudgetAllocator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" /> {t('adBudgetAllocator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adBudgetAllocator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adBudgetAllocator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" /> {t('adBudgetAllocator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adBudgetAllocator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="abaProduct" className="block text-sm font-medium mb-1">
              {t('adBudgetAllocator.productOrBrand')}
            </label>
            <textarea
              id="abaProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="abaBudget" className="block text-sm font-medium mb-1">
                {t('adBudgetAllocator.totalBudget')}
              </label>
              <input
                id="abaBudget"
                type="text"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="e.g., $10,000"
                maxLength={100}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('adBudgetAllocator.campaignGoal')}</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setCampaignGoal(g)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      campaignGoal === g
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {g.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adBudgetAllocator.platforms')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlatforms([])}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selectedPlatforms.length === 0
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                all
              </button>
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

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !totalBudget.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adBudgetAllocator.allocating') : `${t('adBudgetAllocator.allocate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adBudgetAllocator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adBudgetAllocator.allocating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adBudgetAllocator.dryRunNotice')}
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
                {copied ? t('adBudgetAllocator.copied') : t('adBudgetAllocator.copy')}
              </button>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-fg-muted">{t('adBudgetAllocator.totalBudget')}</p>
                  <p className="text-2xl font-bold">{result.allocation.totalBudget}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-fg-muted">{t('adBudgetAllocator.recommendedSplit')}</p>
                  <p className="text-sm font-medium text-brand-accent">{result.allocation.recommendedSplit}</p>
                </div>
              </div>
            </div>

            {/* Platform allocations */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adBudgetAllocator.platformAllocations')}
              </h2>
              {result.allocation.platformAllocations.map((alloc: PlatformAllocation, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-medium text-sm capitalize">{alloc.platform}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-medium text-brand-accent">{alloc.percentage}%</span>
                      <span className="text-fg-muted">{alloc.amount}</span>
                    </div>
                  </div>
                  {/* Percentage bar */}
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full bg-brand-accent rounded-full transition-all" style={{ width: `${alloc.percentage}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-fg-muted">{t('adBudgetAllocator.expectedReach')}</p>
                      <p className="font-medium">{alloc.expectedReach}</p>
                    </div>
                    <div>
                      <p className="text-fg-muted">{t('adBudgetAllocator.expectedClicks')}</p>
                      <p className="font-medium">{alloc.expectedClicks}</p>
                    </div>
                    <div>
                      <p className="text-fg-muted">{t('adBudgetAllocator.expectedConversions')}</p>
                      <p className="font-medium">{alloc.expectedConversions}</p>
                    </div>
                  </div>
                  <p className="text-xs text-fg-muted">{alloc.rationale}</p>
                </div>
              ))}
            </div>

            {/* Optimization notes */}
            {result.allocation.optimizationNotes.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('adBudgetAllocator.optimizationNotes')}
                </h2>
                <ul className="space-y-1">
                  {result.allocation.optimizationNotes.map((n, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                      <span className="text-brand-accent flex-shrink-0 mt-0.5">→</span> {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk factors */}
            {result.allocation.riskFactors.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> {t('adBudgetAllocator.riskFactors')}
                </h2>
                <ul className="space-y-1">
                  {result.allocation.riskFactors.map((r, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
