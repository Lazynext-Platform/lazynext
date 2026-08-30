'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FlaskConical, Loader2, AlertCircle, Sparkles, Copy, Check, Target, Users, Clock, TrendingUp, Beaker } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { ABTestPlan, ABTestPlannerResult, TestVariant, TestMetric } from '@/lib/creative/ab-test-planner';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'linkedin', 'x'] as const;

function variantColor(id: string): string {
  const map: Record<string, string> = {
    a: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    b: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    c: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    d: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return map[id] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export default function ABTestPlannerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [baseCreative, setBaseCreative] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [goal, setGoal] = useState('');
  const [audienceSize, setAudienceSize] = useState('');
  const [currentCTR, setCurrentCTR] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ABTestPlannerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!baseCreative.trim() || !platform.trim() || !goal.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ab-test-planner-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCreative,
          platform,
          goal,
          audienceSize: audienceSize ? Number(audienceSize) : undefined,
          currentCTR: currentCTR ? Number(currentCTR) : undefined,
          budget: budget ? Number(budget) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('abTestPlannerV2.error'));
      setResult(data.result as ABTestPlannerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [baseCreative, platform, goal, audienceSize, currentCTR, budget, t]);

  const copyPlan = useCallback(() => {
    if (!result) return;
    const text = JSON.stringify(result.plan, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6" /> {t('abTestPlannerV2.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('abTestPlannerV2.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm">
        {t('common.skipToContent')}
      </a>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6" id="main-content">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6" /> {t('abTestPlannerV2.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('abTestPlannerV2.subtitle')}</p>
        </header>

        {/* Form */}
        <div className="space-y-4 rounded-xl border border-border bg-bg-card p-4 sm:p-6">
          <div>
            <label htmlFor="abpBaseCreative" className="block text-sm font-medium mb-1">{t('abTestPlannerV2.baseCreative')}</label>
            <textarea
              id="abpBaseCreative"
              value={baseCreative}
              onChange={(e) => setBaseCreative(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Describe the base creative you want to test (hook, CTA, visual style, angle)..."
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="abpPlatform" className="block text-sm font-medium mb-1">{t('abTestPlannerV2.platform')}</label>
              <select
                id="abpPlatform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="abpGoal" className="block text-sm font-medium mb-1">{t('abTestPlannerV2.goal')}</label>
              <input
                id="abpGoal"
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                maxLength={500}
                placeholder="e.g., increase CTR by 20%"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="abpAudienceSize" className="block text-sm font-medium mb-1">{t('abTestPlannerV2.audienceSize')}</label>
              <input
                id="abpAudienceSize"
                type="number"
                value={audienceSize}
                onChange={(e) => setAudienceSize(e.target.value)}
                min={1}
                placeholder="optional"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="abpCurrentCTR" className="block text-sm font-medium mb-1">{t('abTestPlannerV2.currentCTR')}</label>
              <input
                id="abpCurrentCTR"
                type="number"
                value={currentCTR}
                onChange={(e) => setCurrentCTR(e.target.value)}
                min={0}
                max={100}
                step={0.01}
                placeholder="optional %"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="abpBudget" className="block text-sm font-medium mb-1">{t('abTestPlannerV2.budget')}</label>
              <input
                id="abpBudget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min={0}
                placeholder="optional $"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading || !baseCreative.trim() || !platform.trim() || !goal.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-bg transition hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('abTestPlannerV2.planning') : `${t('abTestPlannerV2.plan')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <ABTestPlanView plan={result.plan} dryRun={result.dryRun} onCopy={copyPlan} copied={copied} t={t} />
        )}
      </div>
    </div>
  );
}

function ABTestPlanView({
  plan,
  dryRun,
  onCopy,
  copied,
  t,
}: {
  plan: ABTestPlan;
  dryRun: boolean;
  onCopy: () => void;
  copied: boolean;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Beaker className="w-5 h-5" /> {plan.testName}</h2>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium hover:bg-bg-elevated transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('common.copied') : t('abTestPlannerV2.copy')}
        </button>
      </div>

      {dryRun && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          {t('abTestPlannerV2.dryRunNotice')}
        </div>
      )}

      {/* Hypothesis */}
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Target className="w-4 h-4" /> {t('abTestPlannerV2.hypothesis')}</h3>
        <p className="text-sm text-fg-muted">{plan.hypothesis}</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label={t('abTestPlannerV2.sampleSize')} value={plan.sampleSizePerVariant.toLocaleString()} />
        <StatCard icon={<Clock className="w-4 h-4" />} label={t('abTestPlannerV2.duration')} value={`${plan.estimatedDurationDays}d`} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label={t('abTestPlannerV2.confidence')} value={`${plan.confidenceLevel}%`} />
        <StatCard icon={<Target className="w-4 h-4" />} label={t('abTestPlannerV2.power')} value={`${(plan.statisticalPower * 100).toFixed(0)}%`} />
      </div>

      {/* Variants */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t('abTestPlannerV2.variants')}</h3>
        {plan.variants.map((v: TestVariant) => (
          <div key={v.id} className="rounded-xl border border-border bg-bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${variantColor(v.id)}`}>{v.id}</span>
              <span className="text-sm font-semibold">{v.name}</span>
            </div>
            <p className="text-sm text-fg-muted mb-2">{v.description}</p>
            {v.changes.length > 0 && (
              <ul className="text-xs text-fg-muted space-y-1 mb-2">
                {v.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-brand-accent mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs italic text-fg-muted"><span className="font-medium not-italic">{t('abTestPlannerV2.variantHypothesis')}:</span> {v.hypothesis}</p>
          </div>
        ))}
      </div>

      {/* Metrics table */}
      <div className="rounded-xl border border-border bg-bg-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3">{t('abTestPlannerV2.metrics')}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-muted border-b border-border">
              <th className="py-2 pr-3">{t('abTestPlannerV2.metricName')}</th>
              <th className="py-2 pr-3">{t('abTestPlannerV2.primary')}</th>
              <th className="py-2 pr-3">{t('abTestPlannerV2.target')}</th>
              <th className="py-2">{t('abTestPlannerV2.mde')}</th>
            </tr>
          </thead>
          <tbody>
            {plan.metrics.map((m: TestMetric, i: number) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-3 font-medium">{m.name}</td>
                <td className="py-2 pr-3">{m.primary ? <span className="text-success">✓</span> : <span className="text-fg-muted">—</span>}</td>
                <td className="py-2 pr-3 text-fg-muted">{m.target}</td>
                <td className="py-2 text-fg-muted">{m.minimumDetectableEffect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Success / Failure criteria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CriteriaList title={t('abTestPlannerV2.successCriteria')} items={plan.successCriteria} color="text-success" />
        <CriteriaList title={t('abTestPlannerV2.failureCriteria')} items={plan.failureCriteria} color="text-danger" />
      </div>

      {/* Segment recommendations */}
      {plan.segmentRecommendations.length > 0 && (
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">{t('abTestPlannerV2.segments')}</h3>
          <ul className="text-sm text-fg-muted space-y-1">
            {plan.segmentRecommendations.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-brand-accent mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {plan.notes.length > 0 && (
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">{t('abTestPlannerV2.notes')}</h3>
          <ul className="text-sm text-fg-muted space-y-1">
            {plan.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-fg-muted mt-0.5">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-1">{icon}{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function CriteriaList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <h3 className={`text-sm font-semibold mb-2 ${color}`}>{title}</h3>
      <ul className="text-sm text-fg-muted space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className={`${color} mt-0.5`}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
