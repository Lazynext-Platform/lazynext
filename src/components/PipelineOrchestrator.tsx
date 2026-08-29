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
  Zap,
  Share2,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import {
  templatePreApprovalCredits,
  PIPELINE_COSTS,
  type PipelineState,
  type PipelineStage,
  type PipelineStageConfig,
  type PipelineTemplate,
  type StageStatus,
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

  // Live credit cost calculation based on currently enabled stages
  const enabledStageCost = ALL_STAGES
    .filter((s) => stageConfigs[s].enabled)
    .reduce((sum, s) => sum + (PIPELINE_COSTS[s] ?? 0), 0);
  const enabledPreApprovalCost = ALL_STAGES
    .filter((s) => stageConfigs[s].enabled && s !== 'publish')
    .reduce((sum, s) => sum + (PIPELINE_COSTS[s] ?? 0), 0);

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

  // NOTE: Client-side auto-advance timer was removed in U4.
  // The server now handles auto-advancing through stages in a single request
  // (bounded by a 75s deadline). The client only needs to call 'advance'
  // explicitly when the server's auto-advance deadline is hit or when a stage
  // has autoAdvance=false (e.g. the publish stage).

  // Detect when the server auto-advance deadline was hit — moved after isTerminal.
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

  // Detect when the server auto-advance deadline was hit: the pipeline is
  // still running, the current stage is in_progress, and the server returned
  // without completing it. In this case we show a notice and auto-continue.
  const deadlineHit = useMemo(() => {
    if (!activePipeline || isTerminal) return false;
    if (activePipeline.status !== 'running') return false;
    const currentResult = activePipeline.stageResults?.find(
      (r) => r.stage === activePipeline.currentStage,
    );
    return currentResult?.status === 'in_progress';
  }, [activePipeline, isTerminal]);

  // Auto-continue when the server deadline is hit and the current stage has
  // autoAdvance enabled. This retries the advance call once after a short
  // delay so the user doesn't have to click manually.
  const deadlineRetryRef = useRef(false);
  useEffect(() => {
    if (!deadlineHit || deadlineRetryRef.current) return;
    const currentStageConfig = activePipeline?.config.stages.find(
      (s) => s.stage === activePipeline?.currentStage,
    );
    if (!currentStageConfig?.autoAdvance) return;
    deadlineRetryRef.current = true;
    const timer = setTimeout(() => {
      callAction('advance');
      deadlineRetryRef.current = false;
    }, 1500);
    return () => clearTimeout(timer);
  }, [deadlineHit, activePipeline, callAction]);

  // Share state
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!activePipeline) return;
    setShareLoading(true);
    setShareCopied(false);
    try {
      // Find the persisted creative_package asset for this pipeline.
      // The pipelineId is stored inside the asset's metadata JSON.
      const assetRes = await fetch(`/api/creative/assets?type=creative_package`);
      if (!assetRes.ok) throw new Error('Failed to load assets');
      const assetData = await assetRes.json();
      const pkg = (assetData.assets || []).find(
        (a: { metadata?: unknown; id: string }) => {
          const meta = a.metadata;
          if (!meta) return false;
          if (typeof meta === 'string') {
            try { return JSON.parse(meta).pipelineId === activePipeline.pipelineId; } catch { return false; }
          }
          return (meta as Record<string, unknown>)?.pipelineId === activePipeline.pipelineId;
        },
      );
      if (!pkg) throw new Error('No creative package found for this pipeline');

      const res = await fetch('/api/creative/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: pkg.id }),
      });
      if (!res.ok) throw new Error('Failed to create share link');
      const data = await res.json();
      const url = `${window.location.origin}${data.url}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setShareCopied(true);
    } catch {
      setShareUrl('');
    } finally {
      setShareLoading(false);
    }
  }, [activePipeline]);

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
          onShare={handleShare}
          shareLoading={shareLoading}
          shareUrl={shareUrl}
          shareCopied={shareCopied}
          deadlineHit={deadlineHit}
        />
      ) : (
        <>
          {/* Template selector */}
          <section className="rounded-2xl border border-line bg-surface p-5" aria-busy={loadingTemplates}>
            <h2 className="text-sm font-bold text-fg">{t('pipeline.templates')}</h2>
            <p className="mt-1 text-xs text-fg-faint">
              {t('pipeline.templatesDesc')}
            </p>
            {loadingTemplates ? (
              <Loader2 className="mt-4 h-5 w-5 animate-spin text-fg-faint" role="status" aria-label={t('pipeline.loadingTemplates')} />
            ) : templates.length === 0 ? (
              <p className="mt-4 text-xs text-fg-faint">{t('pipeline.noTemplates')}</p>
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
                          <Coins className="h-3 w-3" /> {templatePreApprovalCredits(tmpl.templateId)}–{tmpl.estimatedCredits} {t('pipeline.credits')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> ~{tmpl.estimatedDurationMin} min
                        </span>
                        <span>{tmpl.stages.length} {t('pipeline.stages')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Custom configuration */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-fg">{t('pipeline.configuration')}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('pipeline.pipelineName')} id="pl-name">
                <input
                  id="pl-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Summer Glow Campaign"
                  className="input-base"
                />
              </Field>
              <Field label={t('pipeline.productName')} id="pl-product">
                <input
                  id="pl-product"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Glow Serum"
                  className="input-base"
                />
              </Field>
              <Field label={t('pipeline.productDescription')} id="pl-desc" full>
                <textarea
                  id="pl-desc"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="A vitamin-C brightening serum for dull skin…"
                  rows={3}
                  className="input-base resize-none"
                />
              </Field>
              <Field label={t('pipeline.brandName')} id="pl-brand">
                <input
                  id="pl-brand"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Lumière"
                  className="input-base"
                />
              </Field>
              <Field label={t('pipeline.targetAudience')} id="pl-audience">
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
                {t('pipeline.platforms')}
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
              <span className="text-xs font-medium text-fg-faint">{t('pipeline.stagesLabel')}</span>
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
                          {t('pipeline.autoAdvance')}
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-fg-faint">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={() => toggleStage(s)}
                            aria-label={`Enable ${t(STAGE_I18N_KEYS[s])}`}
                          />
                          {t('pipeline.enabled')}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Live credit cost estimate */}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-fg-faint">
                <Coins className="h-3 w-3" />
                <span>
                  {enabledPreApprovalCost}–{enabledStageCost} {t('pipeline.credits')}
                </span>
                <span className="text-fg-faint/60">({t('pipeline.estimatedCostLive')})</span>
              </div>
            </div>

            {/* On-complete action */}
            <div className="mt-4">
              <label className="text-xs font-medium text-fg-faint" htmlFor="pl-oncomplete">
                {t('pipeline.onComplete')}
              </label>
              <select
                id="pl-oncomplete"
                value={onComplete}
                onChange={(e) => setOnComplete(e.target.value as 'publish' | 'review' | 'export')}
                className="input-base mt-1 max-w-[200px]"
              >
                <option value="publish">{t('pipeline.publish')}</option>
                <option value="review">{t('pipeline.review')}</option>
                <option value="export">{t('pipeline.export')}</option>
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
              {t('pipeline.startPipeline')}
            </button>
          </section>
        </>
      )}

      {/* History */}
      {!activePipeline && (
        <section className="rounded-2xl border border-line bg-surface p-5" aria-busy={loadingHistory}>
          <h2 className="text-sm font-bold text-fg">{t('pipeline.pipelineHistory')}</h2>
          {loadingHistory ? (
            <Loader2
              className="mt-3 h-4 w-4 animate-spin text-fg-faint"
              role="status"
              aria-label={t('pipeline.loadingHistory')}
            />
          ) : history.length === 0 ? (
            <p className="mt-3 text-xs text-fg-faint">{t('pipeline.noPipelines')}</p>
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
  onShare,
  shareLoading,
  shareUrl,
  shareCopied,
  deadlineHit,
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
  onShare: () => void;
  shareLoading: boolean;
  shareUrl: string;
  shareCopied: boolean;
  deadlineHit: boolean;
}) {
  const { t } = useI18n();
  const enabledStages = state.config.stages.filter((s) => s.enabled);
  const minutesLeft = state.estimatedTimeRemaining
    ? Math.max(1, Math.round(state.estimatedTimeRemaining / 60))
    : 0;
  const hasFailedStage = state.stageResults.some((r) => r.status === 'failed');

  return (
    <div className="space-y-5">
      {/* Header + progress */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-fg">{state.config.name}</h2>
            <p className="text-xs text-fg-faint">{state.config.productName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-advancing indicator — shown when the server is chaining stages */}
            {actionLoading && state.status === 'running' && (
              <span
                className="flex shrink-0 items-center gap-1 rounded-full bg-brand-accent/10 px-2.5 py-1 text-[11px] font-bold text-brand-accent"
                role="status"
              >
                <Zap className="h-3 w-3 animate-pulse" />
                {t('pipeline.autoAdvancing')}
              </span>
            )}
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge(state.status)}`}
            >
              {state.status}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-fg-faint">
            <span>{t('pipeline.progress')}</span>
            <span>{state.progress}%</span>
          </div>
          <div
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-app"
            role="progressbar"
            aria-valuenow={state.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('pipeline.progress')}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${state.progress}%`, background: '#00b2fc' }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat icon={Coins} label={t('pipeline.creditsUsed')} value={String(state.totalCreditsUsed)} />
          <Stat icon={Clock} label={t('pipeline.estTimeLeft')} value={isTerminal ? '0 min' : `${minutesLeft} min`} />
          <Stat
            icon={Workflow}
            label={t('pipeline.currentStage')}
            value={state.currentStage && state.currentStage !== 'completed' ? t(STAGE_I18N_KEYS[state.currentStage as PipelineStage]) : '—'}
          />
        </div>

        {/* Deadline notice — server auto-advance stopped at the 75s limit */}
        {deadlineHit && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning"
          >
            <Clock className="h-3.5 w-3.5" />
            {t('pipeline.deadlineNotice')}
          </div>
        )}

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
              {t('pipeline.advance')}
            </button>
          )}
          {!isTerminal && (
            <button
              onClick={onCancel}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
              title={actionLoading ? t('pipeline.cancelDuringAutoAdvanceWarning') : undefined}
            >
              <XOctagon className="h-3.5 w-3.5" /> {t('pipeline.cancel')}
            </button>
          )}
          {!isTerminal && hasFailedStage && (
            <button
              onClick={onCancel}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs font-medium text-warning hover:bg-warning/10 disabled:opacity-50"
              title={t('pipeline.skipAllDescription')}
            >
              <SkipForward className="h-3.5 w-3.5" /> {t('pipeline.skipAll')}
            </button>
          )}
          {isTerminal && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-xs font-medium text-fg hover:bg-hover"
            >
              <RotateCw className="h-3.5 w-3.5" /> {t('pipeline.newPipeline')}
            </button>
          )}
          {isTerminal && state.status === 'completed' && (
            <button
              onClick={onShare}
              disabled={shareLoading}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-xs font-medium text-fg hover:bg-hover disabled:opacity-50"
            >
              {shareLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              {shareCopied && shareUrl ? t('pipeline.shareCopied') : t('pipeline.share')}
            </button>
          )}
          {shareUrl && shareCopied && (
            <span role="status" className="text-[11px] text-success">
              {t('pipeline.shareLinkCopied')}
            </span>
          )}
        </div>

        {/* Auto-advance warning — shown when the server is chaining stages */}
        {actionLoading && state.status === 'running' && (
          <p className="mt-3 text-[11px] text-fg-faint" role="note">
            {t('pipeline.cancelDuringAutoAdvanceWarning')}
          </p>
        )}
      </section>

      {/* Stage timeline */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-sm font-bold text-fg">{t('pipeline.stageTimeline')}</h3>
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

/** Map raw error strings to user-friendly messages. */
function friendlyError(rawError: string, t: (key: string) => string): string {
  const e = rawError.toLowerCase();
  if (e.includes('rate_limited') || e.includes('rate limit') || e.includes('429')) {
    return t('pipeline.errorRateLimited');
  }
  if (e.includes('insufficient') && e.includes('credit')) {
    return t('pipeline.errorInsufficientCredits');
  }
  if (e.includes('timeout') || e.includes('timed out')) {
    return t('pipeline.errorTimeout');
  }
  if (e.includes('network') || e.includes('fetch') || e.includes('econnrefused')) {
    return t('pipeline.errorNetwork');
  }
  if (e.includes('auth') || e.includes('unauthorized') || e.includes('401')) {
    return t('pipeline.errorAuth');
  }
  if (e.includes('server') || e.includes('500') || e.includes('502') || e.includes('503')) {
    return t('pipeline.errorServer');
  }
  // Default: show the raw error but truncated
  return rawError.length > 200 ? rawError.slice(0, 200) + '…' : rawError;
}

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
        <div className="mt-1 text-[11px] text-fg-faint">{t('pipeline.duration')}: {result.duration}s</div>
      )}

      {result.error && (
        <div role="alert" className="mt-2 rounded-lg bg-danger/10 p-2 text-xs text-danger">
          <AlertCircle className="mr-1 inline h-3 w-3" /> {friendlyError(result.error, t)}
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
                    {t('pipeline.view')}
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
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-line pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] font-medium text-brand-accent hover:underline"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? t('pipeline.hideOutput') : t('pipeline.viewOutput')}
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
          <DetailRow label={t('pipeline.objective')} value={brief.objective as string} />
          <DetailRow label={t('pipeline.platform')} value={brief.platform as string} />
          <DetailRow label={t('pipeline.format')} value={brief.format as string} />
          <DetailRow label={t('pipeline.audience')} value={brief.audience as string} />
          <DetailRow label={t('pipeline.product')} value={brief.product as string} />
          <DetailRow label={t('pipeline.hook')} value={brief.hook as string} />
          <DetailRow label={t('pipeline.cta')} value={brief.cta as string} />
          <DetailRow label={t('pipeline.visualDirection')} value={brief.visualDirection as string} />
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
              <p className="font-bold text-fg">{t('pipeline.hooks')} ({hooks.length})</p>
              {hooks.slice(0, 3).map((h, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">[{String(h.type)}]</span> {String(h.text)}
                </div>
              ))}
            </div>
          )}
          {angles && angles.length > 0 && (
            <div>
              <p className="font-bold text-fg">{t('pipeline.angles')} ({angles.length})</p>
              {angles.slice(0, 3).map((a, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">{String(a.name)}:</span> {String(a.description)}
                </div>
              ))}
            </div>
          )}
          {script && (
            <div>
              <p className="font-bold text-fg">{t('pipeline.scriptLabel')}: {script.title as string}</p>
              <p className="text-fg-faint">{t('pipeline.duration')}: {String(script.totalDurationSec)}s · {t('pipeline.cta')}: {script.cta as string}</p>
              {Array.isArray(script.scenes) && (
                <div className="mt-1 space-y-1">
                  {(script.scenes as Array<Record<string, unknown>>).slice(0, 5).map((s, i) => (
                    <div key={i} className="ml-2">
                      <span className="text-fg-faint">{t('pipeline.scene')} {String(s.i)}:</span> {s.visual as string}
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
          <p className="font-bold text-fg">{t('pipeline.ratio')}: {storyboard.ratio as string} · {t('pipeline.duration')}: {String(storyboard.totalDurationSec)}s</p>
          {Array.isArray(storyboard.shots) && (
            <div className="space-y-1">
              {(storyboard.shots as Array<Record<string, unknown>>).slice(0, 6).map((shot, i) => (
                <div key={i} className="ml-2">
                  <span className="text-fg-faint">{t('pipeline.shot')} {String(shot.i)}:</span> {shot.shot as string}
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
          <p className="font-bold text-fg">{mediaUrls.length} {t('pipeline.mediaUrls')}</p>
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
      if (!audioUrl) return <p className="text-fg-faint">{t('pipeline.noAudio')}</p>;
      const isDryRun = audioUrl.startsWith('placeholder://') || audioUrl.startsWith('data:');
      return (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-fg">{t('pipeline.voiceover')}</p>
            {isDryRun && (
              <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                {t('pipeline.dryRunBadge')}
              </span>
            )}
          </div>
          {isDryRun ? (
            <div className="mt-1">
              <audio controls src={audioUrl} className="w-full opacity-60" />
              <p className="mt-1 text-[11px] text-fg-faint">{t('pipeline.dryRunAudioNote')}</p>
            </div>
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
            <DetailRow label={t('creativeStudio.overall')} value={`${overall}/10`} />
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
          <DetailRow label={t('pipeline.status')} value={String(result.overallStatus || '')} />
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
          <DetailRow label={t('pipeline.totalDuration')} value={`${String(editResult.totalDurationSec)}s`} />
          <DetailRow label={t('pipeline.audio')} value={editResult.audioUrl as string || 'none'} />
          <DetailRow label={t('pipeline.format')} value={String(editResult.format || 'vertical_9x16')} />
          {Array.isArray(editResult.cutPlan) && (
            <p className="text-fg-faint">{editResult.cutPlan.length} {t('pipeline.cutsInPlan')}</p>
          )}
          {finalMediaUrl && (
            <div className="pt-2">
              <a
                href={`/clip-editor?pipelineId=${encodeURIComponent(pipelineId)}&mediaUrl=${encodeURIComponent(finalMediaUrl)}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10"
              >
                <Scissors className="h-3 w-3" /> {t('pipeline.openInClipEditor')}
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
          <DetailRow label={t('pipeline.status')} value={String(publishResult.status || '')} />
          <DetailRow label={t('pipeline.onCompleteLabel')} value={String(publishResult.onComplete || '')} />
          {Array.isArray(publishResult.platforms) && (
            <DetailRow label={t('pipeline.platforms')} value={(publishResult.platforms as string[]).join(', ')} />
          )}
          {results.length > 0 && (
            <div>
              <p className="font-bold text-fg">{t('pipeline.results')}</p>
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
