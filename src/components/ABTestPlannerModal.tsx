'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  FlaskConical, X, Loader2, AlertCircle, CheckCircle2, Rocket,
  Beaker, Target, Calendar, BarChart3, Lightbulb, Info,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { CreativeBrief, HookCandidate, CreativeAngle, ScriptCandidate } from '@/lib/creative/types';

interface TestVariant {
  label: string;
  variable: string;
  change: string;
  hook: string;
  cta: string;
  angle: string;
  scriptSummary: string;
  hypothesis: string;
}

interface ABTestPlan {
  testName: string;
  controlVariant: TestVariant;
  testVariants: TestVariant[];
  primaryMetric: string;
  hypothesis: string;
  sampleSizePerVariant: number;
  estimatedDurationDays: number;
  confidenceLevel: number;
  variables: string[];
  notes: string;
}

interface ABTestPlannerModalProps {
  open: boolean;
  onClose: () => void;
  brief: CreativeBrief | null;
  script: ScriptCandidate | null;
  hook: HookCandidate | null;
  angle: CreativeAngle | null;
}

const METRICS = [
  { value: 'roas', labelKey: 'abTestPlanner.metricRoas' },
  { value: 'ctr', labelKey: 'abTestPlanner.metricCtr' },
  { value: 'cvr', labelKey: 'abTestPlanner.metricCvr' },
] as const;

export function ABTestPlannerModal({
  open, onClose, brief, script, hook, angle,
}: ABTestPlannerModalProps) {
  const { t } = useI18n();
  const [primaryMetric, setPrimaryMetric] = useState<string>('roas');
  const [dailyBudget, setDailyBudget] = useState<number>(50);
  const [expectedCvr, setExpectedCvr] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<ABTestPlan | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchMsg, setLaunchMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    if (!brief || !script || !hook || !angle) return;
    setLoading(true);
    setError('');
    setPlan(null);
    setLaunchMsg(null);
    try {
      const res = await fetch('/api/creative/ab-test/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          script,
          hook,
          angle,
          primaryMetric,
          dailyBudget,
          expectedCvr: expectedCvr / 100,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === 'insufficient_credits') throw new Error('insufficient_credits');
        throw new Error(j.error || 'failed');
      }
      const data = await res.json();
      setPlan(data.plan as ABTestPlan);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [brief, script, hook, angle, primaryMetric, dailyBudget, expectedCvr]);

  const launchTest = useCallback(async () => {
    if (!plan || !brief) return;
    setLaunching(true);
    setLaunchMsg(null);
    try {
      const allVariants = [plan.controlVariant, ...plan.testVariants];
      const res = await fetch('/api/creative/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: allVariants.map((v) => ({
            creationId: `variant-${v.label}`,
            name: `${plan.testName} — Variant ${v.label}`,
            score: v.label === 'A' ? 100 : 90,
          })),
          platform: brief.platform === 'facebook' ? 'meta' : 'meta',
          campaignName: plan.testName,
          budgetDaily: dailyBudget,
          dryRun: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'failed');
      }
      setLaunchMsg({ type: 'success', text: t('abTestPlanner.launchSuccess') });
    } catch (e) {
      setLaunchMsg({ type: 'error', text: `${t('abTestPlanner.launchError')}: ${String(e instanceof Error ? e.message : e)}` });
    } finally {
      setLaunching(false);
    }
  }, [plan, brief, dailyBudget, t]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !launching) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, loading, launching]);

  // Focus trap: focus the dialog on open
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setPlan(null);
      setError('');
      setLaunchMsg(null);
    }
  }, [open]);

  if (!open) return null;

  const renderVariant = (variant: TestVariant, isControl: boolean) => {
    const changedFields: Array<{ key: string; label: string; value: string }> = [
      { key: 'hook', label: t('abTestPlanner.hook'), value: variant.hook },
      { key: 'cta', label: t('abTestPlanner.cta'), value: variant.cta },
      { key: 'angle', label: t('abTestPlanner.angle'), value: variant.angle },
    ];

    return (
      <div
        key={variant.label}
        className={`rounded-xl border p-4 ${isControl ? 'border-line bg-app' : 'border-brand-accent/30 bg-brand-accent/5'}`}
      >
        {/* Variant header */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
              isControl ? 'bg-surface border border-line text-fg-faint' : 'bg-brand-accent/20 text-brand-accent'
            }`}
          >
            {variant.label}
          </span>
          <div className="flex-1">
            <div className="text-sm font-bold text-fg">
              {isControl ? t('abTestPlanner.controlVariant') : `${t('abTestPlanner.variant')} ${variant.label}`}
            </div>
            {!isControl && (
              <div className="flex items-center gap-1.5 text-xs text-brand-accent">
                <Target className="h-3 w-3" />
                <span className="font-medium">{t('abTestPlanner.variable')}: {variant.variable}</span>
              </div>
            )}
          </div>
        </div>

        {/* Change description */}
        {!isControl && variant.change && (
          <div className="mb-3 rounded-lg bg-brand-accent/10 px-2.5 py-1.5 text-xs text-brand-accent">
            <span className="font-bold">{t('abTestPlanner.change')}: </span>
            {variant.change}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-2">
          {changedFields.map((field) => {
            const isChanged = !isControl && variant.variable === field.key;
            return (
              <div key={field.key} className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-fg-faint">{field.label}</span>
                <span className={`text-xs ${isChanged ? 'font-bold text-brand-accent' : 'text-fg'}`}>
                  {isChanged && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-accent align-middle" />}
                  {field.value || '—'}
                </span>
              </div>
            );
          })}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase text-fg-faint">{t('abTestPlanner.scriptSummary')}</span>
            <span className="text-xs text-fg">{variant.scriptSummary || '—'}</span>
          </div>
        </div>

        {/* Hypothesis */}
        <div className="mt-3 rounded-lg bg-surface border border-line px-2.5 py-2">
          <div className="flex items-start gap-1.5">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <div>
              <div className="text-[10px] font-bold uppercase text-fg-faint">{t('abTestPlanner.variantHypothesis')}</div>
              <div className="text-xs text-fg">
                {variant.hypothesis === 'baseline' ? t('abTestPlanner.baseline') : variant.hypothesis}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('abTestPlanner.title')}
      onClick={() => { if (!loading && !launching) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-brand-accent" />
            <h2 className="text-lg font-bold text-fg">{t('abTestPlanner.title')}</h2>
          </div>
          <button
            onClick={() => { if (!loading && !launching) onClose(); }}
            className="rounded-lg p-1.5 text-fg-faint hover:bg-app hover:text-fg"
            aria-label={t('abTestPlanner.close')}
            disabled={loading || launching}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-fg-faint">{t('abTestPlanner.subtitle')}</p>

        {/* Input form — shown when no plan yet */}
        {!plan && !loading && (
          <div className="space-y-5">
            {/* Primary metric */}
            <div>
              <label className="mb-2 block text-xs font-bold text-fg">{t('abTestPlanner.primaryMetric')}</label>
              <div className="flex flex-wrap gap-2">
                {METRICS.map((metric) => (
                  <label
                    key={metric.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      primaryMetric === metric.value
                        ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                        : 'border-line bg-app text-fg-faint hover:bg-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="primaryMetric"
                      value={metric.value}
                      checked={primaryMetric === metric.value}
                      onChange={(e) => setPrimaryMetric(e.target.value)}
                      className="sr-only"
                    />
                    {t(metric.labelKey)}
                  </label>
                ))}
              </div>
            </div>

            {/* Daily budget */}
            <div>
              <label htmlFor="ab-daily-budget" className="mb-1 block text-xs font-bold text-fg">
                {t('abTestPlanner.dailyBudget')}
              </label>
              <input
                id="ab-daily-budget"
                type="number"
                min={1}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(Math.max(1, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg focus:border-[#00b2fc]/40 focus:outline-none"
              />
            </div>

            {/* Expected CVR */}
            <div>
              <label htmlFor="ab-expected-cvr" className="mb-1 block text-xs font-bold text-fg">
                {t('abTestPlanner.expectedCvr')}
              </label>
              <input
                id="ab-expected-cvr"
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={expectedCvr}
                onChange={(e) => setExpectedCvr(Math.max(0.1, Math.min(100, Number(e.target.value) || 0)))}
                className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg focus:border-[#00b2fc]/40 focus:outline-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {error === 'insufficient_credits' ? t('abTestPlanner.error') : `${t('abTestPlanner.error')}: ${error}`}
                </span>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={!brief || !script || !hook || !angle}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              <span className="flex items-center justify-center gap-2">
                <Beaker className="h-4 w-4" />
                {t('abTestPlanner.generate')}
                <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">5 {t('abTestPlanner.credits')}</span>
              </span>
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
            <p className="mt-3 text-sm text-fg-faint">{t('abTestPlanner.generating')}</p>
          </div>
        )}

        {/* Plan results */}
        {plan && !loading && (
          <div className="space-y-5">
            {/* Test name & hypothesis */}
            <div className="rounded-xl border border-line bg-app p-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-brand-accent" />
                <h3 className="text-sm font-bold text-fg">{plan.testName}</h3>
              </div>
              <div className="mt-2 flex items-start gap-1.5">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-fg-faint">{t('abTestPlanner.hypothesis')}: </span>
                  <span className="text-xs text-fg">{plan.hypothesis}</span>
                </div>
              </div>
            </div>

            {/* Control variant */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-fg-faint">{t('abTestPlanner.controlVariant')}</h3>
              {renderVariant(plan.controlVariant, true)}
            </div>

            {/* Test variants */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-fg-faint">{t('abTestPlanner.testVariants')}</h3>
              <div className="space-y-3">
                {plan.testVariants.map((v) => renderVariant(v, false))}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-app p-3">
                <div className="flex items-center gap-1.5 text-fg-faint">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">{t('abTestPlanner.sampleSize')}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-fg tabular-nums">
                  {plan.sampleSizePerVariant.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-app p-3">
                <div className="flex items-center gap-1.5 text-fg-faint">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">{t('abTestPlanner.estimatedDuration')}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-fg tabular-nums">
                  {plan.estimatedDurationDays} <span className="text-xs font-normal text-fg-faint">{t('abTestPlanner.days')}</span>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-app p-3">
                <div className="flex items-center gap-1.5 text-fg-faint">
                  <Target className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">{t('abTestPlanner.confidenceLevel')}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-success tabular-nums">{plan.confidenceLevel}%</div>
              </div>
              <div className="rounded-xl border border-line bg-app p-3">
                <div className="flex items-center gap-1.5 text-fg-faint">
                  <Beaker className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">{t('abTestPlanner.variablesTested')}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-fg">
                  {plan.variables.join(', ') || '—'}
                </div>
              </div>
            </div>

            {/* Sample size explanation */}
            <div className="flex items-start gap-2 rounded-lg bg-app border border-line px-3 py-2 text-xs text-fg-faint">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {t('abTestPlanner.sampleSize')}: {plan.sampleSizePerVariant.toLocaleString()} —{' '}
                {t('abTestPlanner.confidenceLevel')} {plan.confidenceLevel}%
              </span>
            </div>

            {/* Notes */}
            {plan.notes && (
              <div className="rounded-xl border border-line bg-app p-4">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-fg-faint" />
                  <span className="text-[10px] font-bold uppercase text-fg-faint">{t('abTestPlanner.notes')}</span>
                </div>
                <p className="mt-1.5 text-xs text-fg">{plan.notes}</p>
              </div>
            )}

            {/* Launch message */}
            {launchMsg && (
              <div
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  launchMsg.type === 'success'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-danger/30 bg-danger/10 text-danger'
                }`}
                role={launchMsg.type === 'success' ? 'status' : 'alert'}
              >
                {launchMsg.type === 'success'
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <AlertCircle className="h-4 w-4 shrink-0" />}
                {launchMsg.text}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={launchTest}
                disabled={launching}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#0064d9' }}
              >
                <span className="flex items-center justify-center gap-2">
                  {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {launching ? t('abTestPlanner.launching') : t('abTestPlanner.launchTest')}
                </span>
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="rounded-lg border border-line bg-app px-4 py-2.5 text-sm font-medium text-fg-faint hover:bg-surface disabled:opacity-50"
              >
                {t('abTestPlanner.retry')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
