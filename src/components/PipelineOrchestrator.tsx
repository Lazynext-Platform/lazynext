'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Workflow,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  SkipForward,
  RotateCw,
  Play,
  Pause,
  XOctagon,
  Coins,
  Clock,
  FileText,
  Film,
  Image as ImageIcon,
  Volume2,
  Scissors,
  ShieldCheck,
  Send,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type {
  PipelineState,
  PipelineStage,
  PipelineStageConfig,
  PipelineTemplate,
  StageStatus,
} from '@/lib/creative/pipeline';

// ---------------------------------------------------------------------------
// Stage metadata (mirrors server-side STAGE_META for the UI).
// ---------------------------------------------------------------------------
const STAGE_ICONS: Record<PipelineStage, typeof Workflow> = {
  brief: FileText,
  script: Sparkles,
  storyboard: Film,
  media_generation: ImageIcon,
  audio: Volume2,
  edit: Scissors,
  compliance: ShieldCheck,
  publish: Send,
  completed: CheckCircle2,
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  brief: 'Brief',
  script: 'Script',
  storyboard: 'Storyboard',
  media_generation: 'Media Generation',
  audio: 'Audio',
  edit: 'Edit',
  compliance: 'Compliance',
  publish: 'Publish',
  completed: 'Completed',
};

const ALL_STAGES: PipelineStage[] = [
  'brief',
  'script',
  'storyboard',
  'media_generation',
  'audio',
  'edit',
  'compliance',
  'publish',
];

const PLATFORM_OPTIONS = ['tiktok', 'instagram', 'youtube', 'meta', 'google'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PipelineOrchestrator() {
  const { data: session } = useSession();
  const { t } = useI18n();

  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Config form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [stageConfigs, setStageConfigs] = useState<Record<PipelineStage, { enabled: boolean; autoAdvance: boolean }>>(
    () =>
      Object.fromEntries(
        ALL_STAGES.map((s) => [s, { enabled: true, autoAdvance: true }]),
      ) as Record<PipelineStage, { enabled: boolean; autoAdvance: boolean }>,
  );
  const [onComplete, setOnComplete] = useState<'publish' | 'review' | 'export'>('publish');

  // Execution state
  const [activePipeline, setActivePipeline] = useState<PipelineState | null>(null);
  const [starting, setStarting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // History
  const [history, setHistory] = useState<PipelineState[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ---- Load templates ----
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/creative/pipeline/templates');
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        setTemplates(j?.templates || []);
      }
    } catch {
      /* non-fatal */
    }
    setLoadingTemplates(false);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!session?.user) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/creative/pipeline');
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        setHistory(j?.pipelines || []);
      }
    } catch {
      /* non-fatal */
    }
    setLoadingHistory(false);
  }, [session]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (session?.user) loadHistory();
  }, [session, loadHistory]);

  // ---- Apply a template to the form ----
  const applyTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplate(templateId);
      const tmpl = templates.find((tp) => tp.templateId === templateId);
      if (!tmpl) return;
      // Enable only the stages in the template (in template order), disable the rest.
      const next = Object.fromEntries(
        ALL_STAGES.map((s) => [s, { enabled: false, autoAdvance: true }]),
      ) as Record<PipelineStage, { enabled: boolean; autoAdvance: boolean }>;
      for (const s of tmpl.stages) {
        if (s !== 'completed') next[s] = { enabled: true, autoAdvance: true };
      }
      setStageConfigs(next);
      if (!name) setName(tmpl.defaultConfig.name ?? tmpl.name);
      if (tmpl.defaultConfig.onComplete) setOnComplete(tmpl.defaultConfig.onComplete);
    },
    [templates, name],
  );

  // ---- Build config from form ----
  const buildConfig = useCallback(() => {
    const stages: PipelineStageConfig[] = ALL_STAGES.filter((s) => stageConfigs[s].enabled).map((s) => ({
      stage: s,
      enabled: true,
      autoAdvance: stageConfigs[s].autoAdvance,
      config: {},
    }));
    return {
      name: name.trim(),
      productName: productName.trim(),
      productDescription: productDescription.trim() || undefined,
      brandName: brandName.trim() || undefined,
      targetAudience: targetAudience.trim() || undefined,
      platforms: platforms.length > 0 ? platforms : undefined,
      stages,
      onComplete,
    };
  }, [name, productName, productDescription, brandName, targetAudience, platforms, stageConfigs, onComplete]);

  const canStart = useMemo(() => {
    return (
      session?.user &&
      name.trim().length > 0 &&
      productName.trim().length > 0 &&
      ALL_STAGES.some((s) => stageConfigs[s].enabled) &&
      !starting
    );
  }, [session, name, productName, stageConfigs, starting]);

  // ---- Start pipeline ----
  const startPipeline = useCallback(async () => {
    if (!session?.user) return;
    setStarting(true);
    setError('');
    try {
      const res = await fetch('/api/creative/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: buildConfig() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error('auth');
        if (res.status === 402) throw new Error('credits');
        if (res.status >= 500) throw new Error('server');
        throw new Error('failed');
      }
      if (!j?.state) throw new Error('failed');
      setActivePipeline(j.state as PipelineState);
      loadHistory();
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'auth') setError(t('common.errUnauthorized'));
      else if (code === 'credits') setError(t('common.errPaymentRequired'));
      else if (code === 'server') setError(t('common.errServer'));
      else if (e instanceof TypeError) setError(t('common.errNetwork'));
      else setError(t('common.errGeneric'));
    }
    setStarting(false);
  }, [session, buildConfig, loadHistory, t]);

  // ---- Pipeline actions ----
  const callAction = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      if (!activePipeline) return;
      setActionLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/creative/pipeline/${activePipeline.pipelineId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) throw new Error('auth');
          if (res.status === 402) throw new Error('credits');
          if (res.status >= 500) throw new Error('server');
          throw new Error('failed');
        }
        if (j?.state) setActivePipeline(j.state as PipelineState);
        loadHistory();
      } catch (e) {
        const code = e instanceof Error ? e.message : '';
        if (code === 'auth') setError(t('common.errUnauthorized'));
        else if (code === 'credits') setError(t('common.errPaymentRequired'));
        else if (code === 'server') setError(t('common.errServer'));
        else if (e instanceof TypeError) setError(t('common.errNetwork'));
        else setError(t('common.errGeneric'));
      }
      setActionLoading(false);
    },
    [activePipeline, loadHistory, t],
  );

  const advance = useCallback(() => callAction('advance'), [callAction]);
  const pause = useCallback(() => callAction('pause'), [callAction]);
  const resume = useCallback(() => callAction('resume'), [callAction]);
  const cancel = useCallback(() => callAction('cancel'), [callAction]);
  const skip = useCallback((stage: PipelineStage) => callAction('skip', { stage }), [callAction]);
  const retry = useCallback((stage: PipelineStage) => callAction('retry', { stage }), [callAction]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const toggleStage = (s: PipelineStage) => {
    setStageConfigs((prev) => ({ ...prev, [s]: { ...prev[s], enabled: !prev[s].enabled } }));
  };
  const toggleAutoAdvance = (s: PipelineStage) => {
    setStageConfigs((prev) => ({ ...prev, [s]: { ...prev[s], autoAdvance: !prev[s].autoAdvance } }));
  };

  const isTerminal =
    activePipeline?.status === 'completed' || activePipeline?.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
        </div>
      )}

      {/* Active pipeline execution view */}
      {activePipeline ? (
        <PipelineExecutionView
          state={activePipeline}
          onAdvance={advance}
          onPause={pause}
          onResume={resume}
          onCancel={cancel}
          onSkip={skip}
          onRetry={retry}
          actionLoading={actionLoading}
          isTerminal={isTerminal}
          onReset={() => setActivePipeline(null)}
        />
      ) : (
        <>
          {/* Template selector */}
          <section className="rounded-2xl border border-line bg-surface p-5" aria-busy={loadingTemplates}>
            <h2 className="text-sm font-bold text-fg">Pipeline Templates</h2>
            <p className="mt-1 text-xs text-fg-faint">
              Choose a template to pre-configure the stages, or build a custom pipeline below.
            </p>
            {loadingTemplates ? (
              <Loader2 className="mt-4 h-5 w-5 animate-spin text-fg-faint" role="status" aria-label="Loading templates" />
            ) : templates.length === 0 ? (
              <p className="mt-4 text-xs text-fg-faint">No templates available.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {templates.map((tmpl) => {
                  const active = selectedTemplate === tmpl.templateId;
                  return (
                    <button
                      key={tmpl.templateId}
                      onClick={() => applyTemplate(tmpl.templateId)}
                      aria-pressed={active}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? 'border-brand-accent bg-brand-accent/10'
                          : 'border-line bg-app hover:border-brand-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-fg">{tmpl.name}</span>
                        {active && <CheckCircle2 className="h-4 w-4 text-brand-accent" />}
                      </div>
                      <p className="mt-1 text-xs text-fg-faint">{tmpl.description}</p>
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-fg-faint">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3" /> {tmpl.estimatedCredits} credits
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> ~{tmpl.estimatedDurationMin} min
                        </span>
                        <span>{tmpl.stages.length} stages</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Custom configuration */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-fg">Configuration</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Pipeline name" id="pl-name">
                <input
                  id="pl-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Summer Glow Campaign"
                  className="input-base"
                />
              </Field>
              <Field label="Product name" id="pl-product">
                <input
                  id="pl-product"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Glow Serum"
                  className="input-base"
                />
              </Field>
              <Field label="Product description" id="pl-desc" full>
                <textarea
                  id="pl-desc"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="A vitamin-C brightening serum for dull skin…"
                  rows={3}
                  className="input-base resize-none"
                />
              </Field>
              <Field label="Brand name" id="pl-brand">
                <input
                  id="pl-brand"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Lumière"
                  className="input-base"
                />
              </Field>
              <Field label="Target audience" id="pl-audience">
                <input
                  id="pl-audience"
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Women 25-34, skincare enthusiasts"
                  className="input-base"
                />
              </Field>
            </div>

            {/* Platforms */}
            <div className="mt-4">
              <span className="text-xs font-medium text-fg-faint" id="pl-platforms-label">
                Platforms
              </span>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="group"
                aria-labelledby="pl-platforms-label"
              >
                {PLATFORM_OPTIONS.map((p) => {
                  const active = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                          : 'border-line bg-app text-fg-faint hover:text-fg'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage toggles */}
            <div className="mt-5">
              <span className="text-xs font-medium text-fg-faint">Stages</span>
              <div className="mt-2 space-y-2">
                {ALL_STAGES.map((s) => {
                  const Icon = STAGE_ICONS[s];
                  const cfg = stageConfigs[s];
                  return (
                    <div
                      key={s}
                      className="flex items-center justify-between rounded-lg border border-line bg-app px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-fg-faint" />
                        <span className="text-xs font-medium text-fg">{STAGE_LABELS[s]}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-[11px] text-fg-faint">
                          <input
                            type="checkbox"
                            checked={cfg.autoAdvance}
                            onChange={() => toggleAutoAdvance(s)}
                            disabled={!cfg.enabled}
                            aria-label={`Auto-advance ${STAGE_LABELS[s]}`}
                          />
                          Auto-advance
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-fg-faint">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={() => toggleStage(s)}
                            aria-label={`Enable ${STAGE_LABELS[s]}`}
                          />
                          Enabled
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* On-complete action */}
            <div className="mt-4">
              <label className="text-xs font-medium text-fg-faint" htmlFor="pl-oncomplete">
                On complete
              </label>
              <select
                id="pl-oncomplete"
                value={onComplete}
                onChange={(e) => setOnComplete(e.target.value as 'publish' | 'review' | 'export')}
                className="input-base mt-1 max-w-[200px]"
              >
                <option value="publish">Publish</option>
                <option value="review">Review</option>
                <option value="export">Export</option>
              </select>
            </div>

            {/* Start button */}
            <button
              onClick={startPipeline}
              disabled={!canStart}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
              Start Pipeline
            </button>
          </section>
        </>
      )}

      {/* History */}
      {!activePipeline && (
        <section className="rounded-2xl border border-line bg-surface p-5" aria-busy={loadingHistory}>
          <h2 className="text-sm font-bold text-fg">Pipeline History</h2>
          {loadingHistory ? (
            <Loader2
              className="mt-3 h-4 w-4 animate-spin text-fg-faint"
              role="status"
              aria-label="Loading history"
            />
          ) : history.length === 0 ? (
            <p className="mt-3 text-xs text-fg-faint">No pipelines yet. Start one above.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((p) => (
                <li
                  key={p.pipelineId}
                  className="flex items-center justify-between rounded-lg border border-line bg-app px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold text-fg">{p.config.name}</div>
                    <div className="text-fg-faint">
                      {p.status} · {p.progress}% · {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-faint" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <style jsx>{`
        :global(.input-base) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--line, #e5e7eb);
          background: var(--app, #fff);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--fg, #111);
          outline: none;
        }
        :global(.input-base:focus) {
          border-color: #00b2fc;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Execution view
// ---------------------------------------------------------------------------
function PipelineExecutionView({
  state,
  onAdvance,
  onPause,
  onResume,
  onCancel,
  onSkip,
  onRetry,
  actionLoading,
  isTerminal,
  onReset,
}: {
  state: PipelineState;
  onAdvance: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onSkip: (stage: PipelineStage) => void;
  onRetry: (stage: PipelineStage) => void;
  actionLoading: boolean;
  isTerminal: boolean;
  onReset: () => void;
}) {
  const enabledStages = state.config.stages.filter((s) => s.enabled);
  const minutesLeft = state.estimatedTimeRemaining
    ? Math.max(1, Math.round(state.estimatedTimeRemaining / 60))
    : 0;

  return (
    <div className="space-y-5">
      {/* Header + progress */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-fg">{state.config.name}</h2>
            <p className="text-xs text-fg-faint">{state.config.productName}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge(state.status)}`}
          >
            {state.status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-fg-faint">
            <span>Progress</span>
            <span>{state.progress}%</span>
          </div>
          <div
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-app"
            role="progressbar"
            aria-valuenow={state.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Pipeline progress"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${state.progress}%`, background: '#00b2fc' }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat icon={Coins} label="Credits used" value={String(state.totalCreditsUsed)} />
          <Stat icon={Clock} label="Est. time left" value={isTerminal ? '0 min' : `${minutesLeft} min`} />
          <Stat
            icon={Workflow}
            label="Current stage"
            value={state.currentStage && state.currentStage !== 'completed' ? STAGE_LABELS[state.currentStage] : '—'}
          />
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap gap-2">
          {!isTerminal && state.status === 'running' && (
            <button
              onClick={onPause}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-xs font-medium text-fg hover:bg-hover disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {!isTerminal && state.status === 'paused' && (
            <button
              onClick={onResume}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-xs font-medium text-fg hover:bg-hover disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}
          {!isTerminal && (
            <button
              onClick={onAdvance}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Advance
            </button>
          )}
          {!isTerminal && (
            <button
              onClick={onCancel}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              <XOctagon className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
          {isTerminal && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-xs font-medium text-fg hover:bg-hover"
            >
              <RotateCw className="h-3.5 w-3.5" /> New Pipeline
            </button>
          )}
        </div>
      </section>

      {/* Stage timeline */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-sm font-bold text-fg">Stage Timeline</h3>
        <ol className="mt-3 space-y-2">
          {enabledStages.map((s, idx) => {
            const result = state.stageResults.find((r) => r.stage === s.stage);
            const status: StageStatus = result?.status ?? 'pending';
            const Icon = STAGE_ICONS[s.stage];
            const isCurrent = state.currentStage === s.stage && state.status === 'running';
            return (
              <li key={`${s.stage}-${idx}`} className="flex items-center gap-3">
                <StageStatusIcon status={status} isCurrent={isCurrent} />
                <Icon className="h-4 w-4 text-fg-faint" />
                <span
                  className={`text-xs font-medium ${
                    isCurrent ? 'text-brand-accent' : status === 'completed' ? 'text-fg' : 'text-fg-faint'
                  }`}
                >
                  {STAGE_LABELS[s.stage]}
                </span>
                {isCurrent && <Loader2 className="h-3 w-3 animate-spin text-brand-accent" />}
                <span className="ml-auto text-[10px] text-fg-faint">
                  {result?.duration != null ? `${result.duration}s` : status}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Per-stage cards */}
      <section className="space-y-3">
        {enabledStages.map((s, idx) => {
          const result = state.stageResults.find((r) => r.stage === s.stage);
          if (!result) return null;
          return (
            <StageCard
              key={`${s.stage}-card-${idx}`}
              stage={s.stage}
              result={result}
              onSkip={() => onSkip(s.stage)}
              onRetry={() => onRetry(s.stage)}
              actionLoading={actionLoading}
            />
          );
        })}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage card
// ---------------------------------------------------------------------------
function StageCard({
  stage,
  result,
  onSkip,
  onRetry,
  actionLoading,
}: {
  stage: PipelineStage;
  result: PipelineState['stageResults'][number];
  onSkip: () => void;
  onRetry: () => void;
  actionLoading: boolean;
}) {
  const Icon = STAGE_ICONS[stage];
  const failed = result.status === 'failed';
  const canRetry = failed;
  const canSkip = result.status === 'pending' || result.status === 'failed' || result.status === 'in_progress';

  return (
    <div
      className={`rounded-xl border p-4 ${
        failed ? 'border-danger/30 bg-danger/5' : 'border-line bg-surface'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-fg-faint" />
          <span className="text-sm font-bold text-fg">{STAGE_LABELS[stage]}</span>
        </div>
        <span className={`text-[11px] font-bold ${statusText(result.status)}`}>{result.status}</span>
      </div>

      {result.duration != null && (
        <div className="mt-1 text-[11px] text-fg-faint">Duration: {result.duration}s</div>
      )}

      {result.error && (
        <div role="alert" className="mt-2 rounded-lg bg-danger/10 p-2 text-xs text-danger">
          <AlertCircle className="mr-1 inline h-3 w-3" /> {result.error}
        </div>
      )}

      {result.artifacts.length > 0 && (
        <div className="mt-2 space-y-1">
          {result.artifacts.map((a, i) => (
            <div key={i} className="text-[11px] text-fg-faint">
              <span className="font-medium text-fg">{a.type}</span>
              {a.url && (
                <>
                  {' · '}
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-accent underline"
                  >
                    view
                  </a>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {(canRetry || canSkip) && (
        <div className="mt-3 flex gap-2">
          {canRetry && (
            <button
              onClick={onRetry}
              disabled={actionLoading}
              className="flex items-center gap-1 rounded-lg border border-line bg-app px-2.5 py-1.5 text-[11px] font-medium text-fg hover:bg-hover disabled:opacity-50"
            >
              <RotateCw className="h-3 w-3" /> Retry
            </button>
          )}
          {canSkip && (
            <button
              onClick={onSkip}
              disabled={actionLoading}
              className="flex items-center gap-1 rounded-lg border border-line bg-app px-2.5 py-1.5 text-[11px] font-medium text-fg-faint hover:text-fg disabled:opacity-50"
            >
              <SkipForward className="h-3 w-3" /> Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------
function Field({
  label,
  id,
  children,
  full,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-medium text-fg-faint" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-app p-3">
      <Icon className="h-4 w-4 text-fg-faint" />
      <div className="mt-1 text-sm font-bold text-fg">{value}</div>
      <div className="text-[10px] text-fg-faint">{label}</div>
    </div>
  );
}

function StageStatusIcon({ status, isCurrent }: { status: StageStatus; isCurrent: boolean }) {
  if (isCurrent) return <Loader2 className="h-4 w-4 animate-spin text-brand-accent" />;
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-danger" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-fg-faint" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 animate-spin text-brand-accent" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-line" />;
  }
}

function statusBadge(status: string): string {
  switch (status) {
    case 'running':
      return 'bg-brand-accent/15 text-brand-accent';
    case 'completed':
      return 'bg-success/15 text-success';
    case 'failed':
      return 'bg-danger/15 text-danger';
    case 'paused':
      return 'bg-warning/15 text-warning';
    default:
      return 'bg-app text-fg-faint';
  }
}

function statusText(status: StageStatus): string {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'failed':
      return 'text-danger';
    case 'skipped':
      return 'text-fg-faint';
    case 'in_progress':
      return 'text-brand-accent';
    default:
      return 'text-fg-faint';
  }
}
