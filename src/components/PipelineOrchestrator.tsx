'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Star,
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
  score: Star,
  publish: Send,
  completed: CheckCircle2,
};

const STAGE_I18N_KEYS: Record<PipelineStage, string> = {
  brief: 'pipeline.stageBrief',
  script: 'pipeline.stageScript',
  storyboard: 'pipeline.stageStoryboard',
  media_generation: 'pipeline.stageMediaGeneration',
  audio: 'pipeline.stageAudio',
  edit: 'pipeline.stageEdit',
  compliance: 'pipeline.stageCompliance',
  score: 'pipeline.stageScore',
  publish: 'pipeline.stagePublish',
  completed: 'pipeline.stageCompleted',
};

const ALL_STAGES: PipelineStage[] = [
  'brief',
  'script',
  'storyboard',
  'media_generation',
  'audio',
  'edit',
  'compliance',
  'score',
  'publish',
];

const PLATFORM_OPTIONS = ['tiktok', 'instagram', 'youtube', 'meta', 'google'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PipelineOrchestrator({ initialPipelineId }: { initialPipelineId?: string } = {}) {
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

  // Load a specific pipeline when initialPipelineId is provided (e.g. from
  // the Workflow Builder "Run as Pipeline" redirect: /pipeline?id=pl_...)
  useEffect(() => {
    if (!session?.user || !initialPipelineId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/creative/pipeline/${initialPipelineId}`);
        if (res.ok && !cancelled) {
          const j = await res.json().catch(() => ({}));
          if (j?.state) setActivePipeline(j.state as PipelineState);
        } else if (!cancelled) {
          if (res.status === 404) setError(t('common.errNotFound'));
          else if (res.status === 401) setError(t('common.errUnauthorized'));
          else if (res.status === 403) setError(t('common.errForbidden'));
          else setError(t('common.errGeneric'));
        }
      } catch {
        if (!cancelled) setError(t('common.errNetwork'));
      }
    })();
    return () => { cancelled = true; };
  }, [session, initialPipelineId, t]);

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
  const advancingRef = useRef(false);
  const callAction = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      if (!activePipeline) return;
      // Guard against concurrent advance calls (auto-advance + manual click race)
      if (action === 'advance' && advancingRef.current) return;
      if (action === 'advance') advancingRef.current = true;
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
      advancingRef.current = false;
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

  // Auto-advance: when the pipeline is running and the current stage has
  // autoAdvance enabled, automatically call advance after a short delay.
  // This lets the pipeline run end-to-end without manual clicking.
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (!activePipeline || activePipeline.status !== 'running' || actionLoading) return;
    const currentStage = activePipeline.currentStage;
    if (!currentStage || currentStage === 'completed') return;
    // Read autoAdvance from the server pipeline config, not the client form state
    const serverStageConfig = activePipeline.config.stages.find(
      (s) => s.stage === currentStage,
    );
    const autoAdvance = serverStageConfig?.autoAdvance ?? stageConfigs[currentStage as PipelineStage]?.autoAdvance;
    if (!autoAdvance) return;
    // Check if the current stage has completed (has output) — advance to the next
    const stageResult = activePipeline.stageResults.find(
      (r) => r.stage === currentStage && r.status === 'completed',
    );
    if (!stageResult) return;
    // Auto-advance after 1.5s delay to let the user see the output
    autoAdvanceTimer.current = setTimeout(() => {
      callAction('advance');
    }, 1500);
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [activePipeline, actionLoading, stageConfigs, callAction]);

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
          onApprove={() => callAction('approve')}
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
                        <span className="text-xs font-medium text-fg">{t(STAGE_I18N_KEYS[s])}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-[11px] text-fg-faint">
                          <input
                            type="checkbox"
                            checked={cfg.autoAdvance}
                            onChange={() => toggleAutoAdvance(s)}
                            disabled={!cfg.enabled}
                            aria-label={`Auto-advance ${t(STAGE_I18N_KEYS[s])}`}
                          />
                          Auto-advance
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-fg-faint">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={() => toggleStage(s)}
                            aria-label={`Enable ${t(STAGE_I18N_KEYS[s])}`}
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
  onApprove,
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
  onApprove?: () => void;
  actionLoading: boolean;
  isTerminal: boolean;
  onReset: () => void;
}) {
  const { t } = useI18n();
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
            value={state.currentStage && state.currentStage !== 'completed' ? t(STAGE_I18N_KEYS[state.currentStage as PipelineStage]) : '—'}
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
              <Pause className="h-3.5 w-3.5" /> {t('pipeline.pause')}
            </button>
          )}
          {!isTerminal && state.status === 'paused' && (
            <button
              onClick={onResume}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-xs font-medium text-fg hover:bg-hover disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> {t('pipeline.resume')}
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
                  {t(STAGE_I18N_KEYS[s.stage])}
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
              pipelineId={state.pipelineId}
              onSkip={() => onSkip(s.stage)}
              onRetry={() => onRetry(s.stage)}
              onApprove={s.stage === 'publish' ? onApprove : undefined}
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
  pipelineId,
  onSkip,
  onRetry,
  onApprove,
  actionLoading,
}: {
  stage: PipelineStage;
  result: PipelineState['stageResults'][number];
  pipelineId: string;
  onSkip: () => void;
  onRetry: () => void;
  onApprove?: () => void;
  actionLoading: boolean;
}) {
  const { t } = useI18n();
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
          <span className="text-sm font-bold text-fg">{t(STAGE_I18N_KEYS[stage])}</span>
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

      {/* Stage output viewer — shows generated content */}
      {result.status === 'completed' && hasStageOutput(stage, result.output) && (
        <StageOutputViewer stage={stage} output={result.output} pipelineId={pipelineId} />
      )}

      {(canRetry || canSkip) && (
        <div className="mt-3 flex gap-2">
          {canRetry && (
            <button
              onClick={onRetry}
              disabled={actionLoading}
              className="flex items-center gap-1 rounded-lg border border-line bg-app px-2.5 py-1.5 text-[11px] font-medium text-fg hover:bg-hover disabled:opacity-50"
            >
              <RotateCw className="h-3 w-3" /> {t('pipeline.retry')}
            </button>
          )}
          {canSkip && (
            <button
              onClick={onSkip}
              disabled={actionLoading}
              className="flex items-center gap-1 rounded-lg border border-line bg-app px-2.5 py-1.5 text-[11px] font-medium text-fg-faint hover:text-fg disabled:opacity-50"
            >
              <SkipForward className="h-3 w-3" /> {t('pipeline.skip')}
            </button>
          )}
        </div>
      )}

      {/* Approve & Publish button for pending_review publish results */}
      {stage === 'publish' && result.status === 'completed' && onApprove && (() => {
        const pr = result.output?.publishResult as Record<string, unknown> | undefined;
        return pr?.status === 'pending_review';
      })() && (
        <div className="mt-3">
          <button
            onClick={onApprove}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {t('pipeline.approvePublish')}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage output viewer — renders generated content per stage
// ---------------------------------------------------------------------------

/** Check if a stage has meaningful output to display. */
function hasStageOutput(stage: PipelineStage, output: Record<string, unknown>): boolean {
  if (!output || typeof output !== 'object') return false;
  switch (stage) {
    case 'brief': return !!output.brief;
    case 'script': return !!(output.script || output.hooks || output.angles);
    case 'storyboard': return !!output.storyboard;
    case 'media_generation': return !!(output.mediaUrls && (output.mediaUrls as string[]).length > 0);
    case 'audio': return !!output.audioUrl;
    case 'edit': return !!output.editResult;
    case 'compliance': return !!output.complianceResult;
    case 'score': return !!output.score;
    case 'publish': return !!output.publishResult;
    default: return false;
  }
}

/** Collapsible viewer for stage output content. */
function StageOutputViewer({ stage, output, pipelineId }: { stage: PipelineStage; output: Record<string, unknown>; pipelineId: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-line pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] font-medium text-brand-accent hover:underline"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? 'Hide output' : 'View output'}
      </button>
      {expanded && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-app p-3 text-[11px] text-fg-muted">
          <StageOutputContent stage={stage} output={output} pipelineId={pipelineId} />
        </div>
      )}
    </div>
  );
}

/** Render stage-specific output content. */
function StageOutputContent({ stage, output, pipelineId }: { stage: PipelineStage; output: Record<string, unknown>; pipelineId: string }) {
  const { t } = useI18n();
  switch (stage) {
    case 'brief': {
      const brief = output.brief as Record<string, unknown> | undefined;
      if (!brief) return null;
      return (
        <dl className="space-y-1">
          <DetailRow label="Objective" value={brief.objective as string} />
          <DetailRow label="Platform" value={brief.platform as string} />
          <DetailRow label="Format" value={brief.format as string} />
          <DetailRow label="Audience" value={brief.audience as string} />
          <DetailRow label="Product" value={brief.product as string} />
          <DetailRow label="Hook" value={brief.hook as string} />
          <DetailRow label="CTA" value={brief.cta as string} />
          <DetailRow label="Visual Direction" value={brief.visualDirection as string} />
        </dl>
      );
    }
    case 'script': {
      const script = output.script as Record<string, unknown> | undefined;
      const hooks = output.hooks as Array<Record<string, unknown>> | undefined;
      const angles = output.angles as Array<Record<string, unknown>> | undefined;
      return (
        <div className="space-y-2">
          {hooks && hooks.length > 0 && (
            <div>
              <p className="font-bold text-fg">Hooks ({hooks.length})</p>
              {hooks.slice(0, 3).map((h, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">[{String(h.type)}]</span> {String(h.text)}
                </div>
              ))}
            </div>
          )}
          {angles && angles.length > 0 && (
            <div>
              <p className="font-bold text-fg">Angles ({angles.length})</p>
              {angles.slice(0, 3).map((a, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">{String(a.name)}:</span> {String(a.description)}
                </div>
              ))}
            </div>
          )}
          {script && (
            <div>
              <p className="font-bold text-fg">Script: {script.title as string}</p>
              <p className="text-fg-faint">Duration: {String(script.totalDurationSec)}s · CTA: {script.cta as string}</p>
              {Array.isArray(script.scenes) && (
                <div className="mt-1 space-y-1">
                  {(script.scenes as Array<Record<string, unknown>>).slice(0, 5).map((s, i) => (
                    <div key={i} className="ml-2">
                      <span className="text-fg-faint">Scene {String(s.i)}:</span> {s.visual as string}
                      {s.voiceover ? <span className="text-fg-faint"> — &ldquo;{s.voiceover as string}&rdquo;</span> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    case 'storyboard': {
      const storyboard = output.storyboard as Record<string, unknown> | undefined;
      if (!storyboard) return null;
      return (
        <div className="space-y-1">
          <p className="font-bold text-fg">Ratio: {storyboard.ratio as string} · Duration: {String(storyboard.totalDurationSec)}s</p>
          {Array.isArray(storyboard.shots) && (
            <div className="space-y-1">
              {(storyboard.shots as Array<Record<string, unknown>>).slice(0, 6).map((shot, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">Shot {String(shot.i)}:</span> {shot.shot as string}
                  <p className="ml-2 text-fg-faint">{shot.prompt as string}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'media_generation': {
      const mediaUrls = output.mediaUrls as string[] | undefined;
      const mediaResults = output.mediaResults as Array<Record<string, unknown>> | undefined;
      if (!mediaUrls || mediaUrls.length === 0) return null;
      return (
        <div className="space-y-1">
          <p className="font-bold text-fg">{mediaUrls.length} media URLs generated</p>
          {mediaResults && mediaResults.some((r) => r.dryRun) && (
            <p className="text-fg-faint">(some are dry-run placeholders)</p>
          )}
          {mediaUrls.slice(0, 6).map((url, i) => (
            <div key={i} className="ml-2 break-all">
              <span className="text-fg-faint">Shot {i + 1}:</span>{' '}
              {url.startsWith('placeholder://') || url.startsWith('data:') ? (
                <span className="text-fg-faint">{url.slice(0, 60)}…</span>
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-accent underline">{url.slice(0, 60)}…</a>
              )}
            </div>
          ))}
        </div>
      );
    }
    case 'audio': {
      const audioUrl = output.audioUrl as string | undefined;
      if (!audioUrl) return <p className="text-fg-faint">No audio generated</p>;
      return (
        <div>
          <p className="font-bold text-fg">Voiceover</p>
          {audioUrl.startsWith('placeholder://') || audioUrl.startsWith('data:') ? (
            <p className="text-fg-faint">{audioUrl.slice(0, 60)}…</p>
          ) : (
            <audio controls src={audioUrl} className="mt-1 w-full" />
          )}
        </div>
      );
    }
    case 'score': {
      const score = output.score as Record<string, unknown> | undefined;
      if (!score) return null;
      const overall = typeof score.overall === 'number' ? score.overall : undefined;
      const dims: Array<[string, number]> = [
        [t('creativeStudio.hookStrength'), score.hookStrength],
        [t('creativeStudio.clarity'), score.clarity],
        [t('creativeStudio.productVisibility'), score.productVisibility],
        [t('creativeStudio.brandConsistency'), score.brandConsistency],
        [t('creativeStudio.emotionalImpact'), score.emotionalImpact],
        [t('creativeStudio.novelty'), score.novelty],
        [t('creativeStudio.platformFit'), score.platformFit],
        [t('creativeStudio.ctaStrength'), score.ctaStrength],
        [t('creativeStudio.audioQuality'), score.audioQuality],
        [t('creativeStudio.visualQuality'), score.visualQuality],
        [t('creativeStudio.complianceRisk'), score.complianceRisk],
      ].filter(([, v]) => typeof v === 'number') as Array<[string, number]>;
      return (
        <dl className="space-y-1">
          {overall !== undefined && (
            <DetailRow label={t('creativeStudio.overall')} value={`${overall}/100`} />
          )}
          {dims.map(([label, val]) => (
            <DetailRow key={label} label={label} value={String(val)} />
          ))}
          {typeof score.notes === 'string' && score.notes && (
            <p className="text-fg-faint text-xs pt-1">{score.notes}</p>
          )}
        </dl>
      );
    }
    case 'compliance': {
      const result = output.complianceResult as Record<string, unknown> | undefined;
      if (!result) return null;
      const violations = Array.isArray(result.violations) ? (result.violations as Array<Record<string, unknown>>) : [];
      const warnings = Array.isArray(result.warnings) ? (result.warnings as Array<Record<string, unknown>>) : [];
      const recommendations = Array.isArray(result.recommendations) ? (result.recommendations as Array<Record<string, unknown>>) : [];
      return (
        <dl className="space-y-1">
          <DetailRow label={t('compliance.complianceScore')} value={typeof result.complianceScore === 'number' ? String(result.complianceScore) : ''} />
          <DetailRow label={t('compliance.brandSafety')} value={typeof result.brandSafetyScore === 'number' ? String(result.brandSafetyScore) : ''} />
          <DetailRow label="Status" value={String(result.overallStatus || '')} />
          {violations.length > 0 && (
            <div>
              <p className="font-bold text-fg">{t('compliance.violations')} ({violations.length})</p>
              {violations.slice(0, 5).map((v, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">[{String(v.severity)}]</span> {v.title as string}
                  {typeof v.description === 'string' && v.description && (
                    <p className="text-fg-faint text-xs">{v.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <p className="font-bold text-fg">{t('compliance.warnings')} ({warnings.length})</p>
              {warnings.slice(0, 3).map((w, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">[{String(w.severity)}]</span> {w.title as string}
                </div>
              ))}
            </div>
          )}
          {recommendations.length > 0 && (
            <div>
              <p className="font-bold text-fg">{t('compliance.recommendations')}</p>
              {recommendations.slice(0, 3).map((r, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">[{String(r.priority)}]</span> {r.recommendation as string}
                </div>
              ))}
            </div>
          )}
        </dl>
      );
    }
    case 'edit': {
      const editResult = output.editResult as Record<string, unknown> | undefined;
      if (!editResult) return null;
      const finalMediaUrl = editResult.finalMediaUrl as string | undefined;
      return (
        <dl className="space-y-1">
          <DetailRow label="Total Duration" value={`${String(editResult.totalDurationSec)}s`} />
          <DetailRow label="Audio" value={editResult.audioUrl as string || 'none'} />
          <DetailRow label="Format" value={String(editResult.format || 'vertical_9x16')} />
          {Array.isArray(editResult.cutPlan) && (
            <p className="text-fg-faint">{editResult.cutPlan.length} cuts in plan</p>
          )}
          {finalMediaUrl && (
            <div className="pt-2">
              <a
                href={`/clip-editor?pipelineId=${encodeURIComponent(pipelineId)}&mediaUrl=${encodeURIComponent(finalMediaUrl)}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10"
              >
                <Scissors className="h-3 w-3" /> Open in Clip Editor
              </a>
            </div>
          )}
        </dl>
      );
    }
    case 'publish': {
      const publishResult = output.publishResult as Record<string, unknown> | undefined;
      if (!publishResult) return null;
      const results = Array.isArray(publishResult.results) ? (publishResult.results as Array<Record<string, unknown>>) : [];
      return (
        <dl className="space-y-1">
          <DetailRow label="Status" value={String(publishResult.status || '')} />
          <DetailRow label="On Complete" value={String(publishResult.onComplete || '')} />
          {Array.isArray(publishResult.platforms) && (
            <DetailRow label="Platforms" value={(publishResult.platforms as string[]).join(', ')} />
          )}
          {results.length > 0 && (
            <div>
              <p className="font-bold text-fg">Results</p>
              {results.map((r, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">[{String(r.platform)}]</span> {String(r.status)}
                  {typeof r.postUrl === 'string' && r.postUrl && (
                    <a href={r.postUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-accent underline">link</a>
                  )}
                  {typeof r.error === 'string' && r.error && (
                    <span className="text-danger text-xs"> — {r.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </dl>
      );
    }
    default:
      return null;
  }
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="inline font-bold text-fg">{label}:</dt>{' '}
      <dd className="inline text-fg-muted">{value}</dd>
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
