'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Workflow, Plus, Trash2, GripVertical, Save, Loader2, AlertCircle,
  FileText, Clapperboard, Film, Image, Music, Scissors, ShieldCheck, Send, Star,
  X, ChevronUp, ChevronDown, Check, GitBranch, Layers, Eye, Settings2, Users,
  Play,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import {
  type StageId, type ConditionalStage, type StageCondition, type ConditionField, type ConditionOperator,
  type WorkflowDefinition, type WorkflowExecutionContext,
  resolveStages, planExecutionWaves, evaluateCondition,
} from '@/lib/creative/workflow-conditions';

interface StageInfo {
  id: StageId;
  icon: typeof FileText;
  color: string;
}

const STAGE_INFO: Record<StageId, StageInfo> = {
  brief: { id: 'brief', icon: FileText, color: '#3b82f6' },
  script: { id: 'script', icon: Clapperboard, color: '#8b5cf6' },
  storyboard: { id: 'storyboard', icon: Film, color: '#ec4899' },
  media_generation: { id: 'media_generation', icon: Image, color: '#f59e0b' },
  audio: { id: 'audio', icon: Music, color: '#10b981' },
  edit: { id: 'edit', icon: Scissors, color: '#06b6d4' },
  compliance: { id: 'compliance', icon: ShieldCheck, color: '#ef4444' },
  score: { id: 'score', icon: Star, color: '#f97316' },
  publish: { id: 'publish', icon: Send, color: '#6366f1' },
};

const ALL_STAGES: StageId[] = ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'score', 'publish'];
const MAX_STAGES = ALL_STAGES.length;
const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 500;

const CONDITION_FIELDS: ConditionField[] = ['platform', 'contentType', 'hasVoiceover', 'hasMusic', 'complianceRequired', 'budgetTier'];
const CONDITION_OPERATORS: ConditionOperator[] = ['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists'];

interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  stages: StageId[];
  workflow?: { stages: ConditionalStage[]; flags: Record<string, unknown> };
  isBuiltIn: boolean;
  isTeamShared?: boolean;
  ownerId?: string;
}

interface Team {
  id: string;
  name: string;
}

export default function WorkflowBuilderPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session } = useSession();
  // v2 state: full conditional stage configs
  const [stageConfigs, setStageConfigs] = useState<ConditionalStage[]>([
    { stage: 'brief', enabled: true },
    { stage: 'script', enabled: true },
    { stage: 'media_generation', enabled: true },
    { stage: 'publish', enabled: true },
  ]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  // Execution context for preview
  const [execCtx, setExecCtx] = useState<WorkflowExecutionContext>({
    platform: 'meta',
    contentType: 'video',
    hasVoiceover: true,
    hasMusic: false,
    complianceRequired: false,
    budgetTier: 'pro',
  });
  const [showPreview, setShowPreview] = useState(false);

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [shareWithTeam, setShareWithTeam] = useState<string>('');
  // Template filter: all / personal / team-shared / built-in
  const [templateFilter, setTemplateFilter] = useState<'all' | 'personal' | 'team' | 'builtin'>('all');
  const [unsharingId, setUnsharingId] = useState<string | null>(null);

  // Derived: simple stage list for backwards compatibility
  const stages = useMemo(() => stageConfigs.map(c => c.stage), [stageConfigs]);

  // Derived: workflow definition for preview
  const workflowDef = useMemo<WorkflowDefinition>(() => ({
    stages: stageConfigs,
    flags: {},
  }), [stageConfigs]);

  // Derived: resolved stages and execution waves for preview
  const resolvedStages = useMemo(() => resolveStages(workflowDef, execCtx), [workflowDef, execCtx]);
  const executionWaves = useMemo(() => planExecutionWaves(workflowDef, execCtx), [workflowDef, execCtx]);

  // Derived: templates filtered by the current filter selection
  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return templates;
    if (templateFilter === 'builtin') return templates.filter(t => t.isBuiltIn);
    if (templateFilter === 'team') return templates.filter(t => t.isTeamShared);
    // personal: user-owned, not built-in, not team-shared
    return templates.filter(t => !t.isBuiltIn && !t.isTeamShared);
  }, [templates, templateFilter]);

  const loadTemplates = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/creative/workflow-templates');
      if (!res.ok) {
        setLoadError(t('workflowBuilder.loadFailed'));
        setTemplates([]);
      } else {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      setLoadError(t('workflowBuilder.loadFailed'));
      setTemplates([]);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (session?.user) {
      loadTemplates();
      fetch('/api/teams')
        .then(res => res.ok ? res.json() : { teams: [] })
        .then(data => setTeams(data.teams || []))
        .catch(() => setTeams([]));
    } else {
      setLoading(false);
    }
  }, [session, loadTemplates]);

  const addStage = (stage: StageId) => {
    if (!stages.includes(stage) && stageConfigs.length < MAX_STAGES) {
      setStageConfigs([...stageConfigs, { stage, enabled: true }]);
    }
  };

  const removeStage = (index: number) => {
    setStageConfigs(stageConfigs.filter((_, i) => i !== index));
  };

  const moveStage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= stageConfigs.length || to >= stageConfigs.length) return;
    const newConfigs = [...stageConfigs];
    const [moved] = newConfigs.splice(from, 1);
    newConfigs.splice(to, 0, moved);
    setStageConfigs(newConfigs);
  };

  const updateStageConfig = (index: number, updates: Partial<ConditionalStage>) => {
    setStageConfigs(configs => configs.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const toggleCondition = (index: number) => {
    const config = stageConfigs[index];
    if (config.condition) {
      updateStageConfig(index, { condition: undefined });
    } else {
      updateStageConfig(index, {
        condition: { field: 'platform', operator: 'equals', value: 'meta' },
      });
    }
  };

  const updateCondition = (index: number, updates: Partial<StageCondition>) => {
    const config = stageConfigs[index];
    if (!config.condition) return;
    updateStageConfig(index, { condition: { ...config.condition, ...updates } });
  };

  const toggleParallelWithNext = (index: number) => {
    const config = stageConfigs[index];
    const nextStage = stageConfigs[index + 1]?.stage;
    if (!nextStage) return;
    const currentParallel = config.parallelWith || [];
    if (currentParallel.includes(nextStage)) {
      // Remove parallel link (both directions)
      const newParallel = currentParallel.filter(s => s !== nextStage);
      updateStageConfig(index, { parallelWith: newParallel.length > 0 ? newParallel : undefined });
      const nextConfig = stageConfigs[index + 1];
      if (nextConfig?.parallelWith) {
        const nextNewParallel = nextConfig.parallelWith.filter(s => s !== config.stage);
        updateStageConfig(index + 1, { parallelWith: nextNewParallel.length > 0 ? nextNewParallel : undefined });
      }
    } else {
      // Add parallel link (both directions)
      updateStageConfig(index, { parallelWith: [...currentParallel, nextStage] });
      const nextParallel = stageConfigs[index + 1]?.parallelWith || [];
      updateStageConfig(index + 1, { parallelWith: [...nextParallel, config.stage] });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null) moveStage(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null); };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowUp' && index > 0) { e.preventDefault(); moveStage(index, index - 1); }
    else if (e.key === 'ArrowDown' && index < stageConfigs.length - 1) { e.preventDefault(); moveStage(index, index + 1); }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || stageConfigs.length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // Save both the simple stages array (for backwards compat) and the full workflow definition
      const payload: any = { stages };
      if (advancedMode) {
        payload.workflow = { stages: stageConfigs, flags: {} };
      }
      const res = await fetch('/api/creative/workflow-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, description: description.trim(), stages, teamId: shareWithTeam || undefined, workflow: advancedMode ? { stages: stageConfigs, flags: {} } : undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('workflowBuilder.saved') });
        setName('');
        setDescription('');
        loadTemplates();
      } else {
        setSaveMsg({ type: 'error', text: data.error || t('workflowBuilder.saveFailed') });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('workflowBuilder.saveFailed') });
    }
    setSaving(false);
  };

  // Run the workflow as a pipeline via POST /api/creative/pipeline
  const handleRunAsPipeline = async () => {
    if (stageConfigs.length === 0) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch('/api/creative/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: workflowDef,
          context: execCtx,
          config: {
            name: name || 'Workflow Builder Pipeline',
            productName: productName || name || 'Workflow Builder Pipeline',
            productDescription: productDescription || description || '',
            platforms: execCtx.platform ? [execCtx.platform] : ['tiktok'],
            onComplete: 'publish',
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || j.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const pipelineId = data.state?.pipelineId;
      if (pipelineId) {
        setRunMsg({ type: 'success', text: t('workflowBuilder.runSuccess') });
        // Navigate to the pipeline page to see execution
        router.push(`/pipeline?id=${pipelineId}`);
      } else {
        setRunMsg({ type: 'success', text: t('workflowBuilder.runSuccess') });
      }
    } catch (e) {
      setRunMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) });
    }
    setRunning(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/creative/workflow-templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) loadTemplates();
      else setSaveMsg({ type: 'error', text: t('workflowBuilder.deleteFailed') });
    } catch {
      setSaveMsg({ type: 'error', text: t('workflowBuilder.deleteFailed') });
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const loadTemplate = (template: SavedTemplate) => {
    const validStages = template.stages.filter(s => ALL_STAGES.includes(s));
    const uniqueStages = [...new Set(validStages)];

    // If the template has a workflow definition (v2), load it with conditions/parallel
    if (template.workflow && Array.isArray(template.workflow.stages) && template.workflow.stages.length > 0) {
      const wfConfigs: ConditionalStage[] = template.workflow.stages
        .filter((s: any) => s && typeof s.stage === 'string' && ALL_STAGES.includes(s.stage as StageId))
        .map((s: any) => ({
          stage: s.stage as StageId,
          enabled: s.enabled !== false,
          condition: s.condition,
          parallelWith: s.parallelWith,
        }));
      if (wfConfigs.length > 0) {
        setStageConfigs(wfConfigs);
        setAdvancedMode(true); // Switch to advanced mode to show loaded conditions
      } else {
        // Fallback to simple stages
        const newConfigs: ConditionalStage[] = (uniqueStages.length > 0 ? uniqueStages : ['brief', 'publish'] as StageId[]).map(s => ({ stage: s, enabled: true }));
        setStageConfigs(newConfigs);
      }
    } else {
      // No workflow definition — load simple stages
      const newConfigs: ConditionalStage[] = (uniqueStages.length > 0 ? uniqueStages : ['brief', 'publish'] as StageId[]).map(s => ({ stage: s, enabled: true }));
      setStageConfigs(newConfigs);
    }

    const baseName = template.name.replace(/\s*\(copy\)\s*$/, '');
    setName(baseName + ' (copy)');
    setDescription(template.description);
  };

  const handleUnshare = async (id: string) => {
    setUnsharingId(id);
    try {
      const res = await fetch(`/api/creative/workflow-templates?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unshare' }),
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('workflowBuilder.unshared') });
        loadTemplates();
      } else {
        setSaveMsg({ type: 'error', text: t('workflowBuilder.unshareFailed') });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('workflowBuilder.unshareFailed') });
    }
    setUnsharingId(null);
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="w-6 h-6" aria-hidden="true" /> {t('workflowBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('workflowBuilder.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="w-6 h-6" aria-hidden="true" /> {t('workflowBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('workflowBuilder.subtitle')}</p>
        </header>

        {/* Error banner */}
        {loadError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4 flex items-center gap-2 text-danger">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{loadError}</p>
            <button onClick={() => loadTemplates()} className="ml-auto text-xs underline">
              {t('workflowBuilder.retry')}
            </button>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Settings2 className="w-4 h-4 text-fg-muted" aria-hidden="true" />
          <span className="text-sm font-medium">{t('workflowBuilder.mode')}</span>
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            role="switch"
            aria-checked={advancedMode}
            aria-label={t('workflowBuilder.advancedMode')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${advancedMode ? 'bg-accent' : 'bg-border'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${advancedMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-xs text-fg-muted">{advancedMode ? t('workflowBuilder.advancedMode') : t('workflowBuilder.simpleMode')}</span>
          {advancedMode && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-hover"
            >
              <Eye className="w-3 h-3" /> {showPreview ? t('workflowBuilder.hidePreview') : t('workflowBuilder.showPreview')}
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Available stages */}
          <section className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold">{t('workflowBuilder.availableStages')}</h2>
            <div className="space-y-2">
              {ALL_STAGES.map((stageId) => {
                const info = STAGE_INFO[stageId];
                const Icon = info.icon;
                const inUse = stages.includes(stageId);
                const allUsed = stageConfigs.length >= MAX_STAGES;
                return (
                  <button
                    key={stageId}
                    onClick={() => addStage(stageId)}
                    disabled={inUse || allUsed}
                    aria-label={t(`workflowBuilder.stage.${stageId}`)}
                    className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: info.color + '20', color: info.color }}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t(`workflowBuilder.stage.${stageId}`)}</p>
                      <p className="text-xs text-fg-muted truncate">{t(`workflowBuilder.stageDesc.${stageId}`)}</p>
                    </div>
                    {inUse ? <Check className="w-4 h-4 text-success" aria-hidden="true" /> : <Plus className="w-4 h-4 text-accent" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right: Pipeline builder */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold">{t('workflowBuilder.yourPipeline')}</h2>

            {/* Pipeline flow */}
            <div className="rounded-lg border border-border bg-card p-4 min-h-48" role="list" aria-label={t('workflowBuilder.yourPipeline')}>
              {stageConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <Workflow className="w-8 h-8 mx-auto text-fg-muted mb-2" aria-hidden="true" />
                  <p className="text-sm text-fg-muted">{t('workflowBuilder.emptyPipeline')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stageConfigs.map((config, index) => {
                    const info = STAGE_INFO[config.stage];
                    const Icon = info.icon;
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index && draggedIndex !== index;
                    const isExpanded = expandedStage === index;
                    const hasCondition = !!config.condition;
                    const isParallel = config.parallelWith && config.parallelWith.length > 0;
                    const isResolved = resolvedStages.includes(config.stage);
                    const nextStage = stageConfigs[index + 1]?.stage;
                    const isParallelWithNext = isParallel && nextStage && config.parallelWith!.includes(nextStage);
                    return (
                      <div key={`${config.stage}-${index}`}>
                        <div
                          role="listitem"
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          tabIndex={0}
                          aria-grabbed={isDragging}
                          aria-label={`${t(`workflowBuilder.stage.${config.stage}`)}, #${index + 1}. ${t('workflowBuilder.keyboardHint')}`}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition outline-none focus:ring-2 focus:ring-accent ${
                            isDragging ? 'opacity-50 border-accent' :
                            isDragOver ? 'border-accent bg-accent/5' :
                            advancedMode && !isResolved ? 'border-border bg-input opacity-60' :
                            'border-border bg-input'
                          }`}
                        >
                          <GripVertical className="w-4 h-4 text-fg-muted cursor-grab active:cursor-grabbing" aria-hidden="true" />
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: info.color + '20', color: info.color }}>
                            <Icon className="w-4 h-4" aria-hidden="true" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{t(`workflowBuilder.stage.${config.stage}`)}</p>
                            {advancedMode && (hasCondition || isParallel) && (
                              <div className="flex items-center gap-2 mt-0.5">
                                {hasCondition && (
                                  <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                                    <GitBranch className="w-3 h-3" /> {t('workflowBuilder.conditional')}
                                  </span>
                                )}
                                {isParallel && (
                                  <span className="inline-flex items-center gap-0.5 text-xs text-accent">
                                    <Layers className="w-3 h-3" /> {t('workflowBuilder.parallel')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-fg-muted">#{index + 1}</span>
                          {/* Keyboard reordering buttons */}
                          <div className="flex flex-col">
                            <button onClick={() => moveStage(index, index - 1)} disabled={index === 0} aria-label={t('workflowBuilder.moveUp')} className="p-0.5 text-fg-muted hover:text-fg disabled:opacity-30">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => moveStage(index, index + 1)} disabled={index === stageConfigs.length - 1} aria-label={t('workflowBuilder.moveDown')} className="p-0.5 text-fg-muted hover:text-fg disabled:opacity-30">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          {advancedMode && (
                            <button
                              onClick={() => setExpandedStage(isExpanded ? null : index)}
                              aria-label={t('workflowBuilder.configureStage')}
                              aria-expanded={isExpanded}
                              className={`p-1 rounded ${isExpanded ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:text-fg'}`}
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => removeStage(index)} aria-label={t('workflowBuilder.removeStage')} className="p-1 text-danger hover:bg-danger/10 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Expanded config panel */}
                        {advancedMode && isExpanded && (
                          <div className="ml-8 mr-2 mb-2 rounded-lg border border-border bg-app p-3 space-y-3">
                            {/* Condition editor */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
                                <span className="text-xs font-medium">{t('workflowBuilder.condition')}</span>
                                <button
                                  onClick={() => toggleCondition(index)}
                                  className="ml-auto text-xs px-2 py-0.5 rounded border border-border hover:bg-hover"
                                >
                                  {hasCondition ? t('workflowBuilder.removeCondition') : t('workflowBuilder.addCondition')}
                                </button>
                              </div>
                              {hasCondition && config.condition && (
                                <div className="grid grid-cols-3 gap-2">
                                  <select
                                    value={config.condition.field}
                                    onChange={(e) => updateCondition(index, { field: e.target.value as ConditionField })}
                                    aria-label={t('workflowBuilder.conditionField')}
                                    className="text-xs rounded border border-border bg-input px-2 py-1"
                                  >
                                    {CONDITION_FIELDS.map(f => (
                                      <option key={f} value={f}>{t(`workflowBuilder.field.${f}`)}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={config.condition.operator}
                                    onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
                                    aria-label={t('workflowBuilder.conditionOperator')}
                                    className="text-xs rounded border border-border bg-input px-2 py-1"
                                  >
                                    {CONDITION_OPERATORS.map(o => (
                                      <option key={o} value={o}>{t(`workflowBuilder.operator.${o}`)}</option>
                                    ))}
                                  </select>
                                  {!['exists', 'not_exists'].includes(config.condition.operator) && (
                                    <input
                                      type="text"
                                      value={config.condition.value || ''}
                                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                                      placeholder={t('workflowBuilder.conditionValue')}
                                      aria-label={t('workflowBuilder.conditionValue')}
                                      className="text-xs rounded border border-border bg-input px-2 py-1"
                                    />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Parallel grouping */}
                            {nextStage && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                                  <span className="text-xs font-medium">{t('workflowBuilder.parallelGroup')}</span>
                                  <button
                                    onClick={() => toggleParallelWithNext(index)}
                                    className="ml-auto text-xs px-2 py-0.5 rounded border border-border hover:bg-hover"
                                  >
                                    {isParallelWithNext ? t('workflowBuilder.disableParallel') : t('workflowBuilder.enableParallel')}
                                  </button>
                                </div>
                                {isParallelWithNext && (
                                  <p className="text-xs text-fg-muted">
                                    {t(`workflowBuilder.stage.${config.stage}`)} ∥ {t(`workflowBuilder.stage.${nextStage}`)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Parallel connector visual */}
                        {isParallelWithNext && (
                          <div className="ml-6 border-l-2 border-accent/40 h-3" aria-hidden="true" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Execution preview */}
            {advancedMode && showPreview && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" aria-hidden="true" /> {t('workflowBuilder.executionPreview')}
                </h3>
                {/* Execution context controls */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-fg-muted" htmlFor="ctx-platform">{t('workflowBuilder.field.platform')}</label>
                    <select id="ctx-platform" value={execCtx.platform || ''} onChange={(e) => setExecCtx({ ...execCtx, platform: e.target.value })} className="w-full text-xs rounded border border-border bg-input px-2 py-1">
                      <option value="meta">Meta</option>
                      <option value="google">Google</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-fg-muted" htmlFor="ctx-content">{t('workflowBuilder.field.contentType')}</label>
                    <select id="ctx-content" value={execCtx.contentType || ''} onChange={(e) => setExecCtx({ ...execCtx, contentType: e.target.value })} className="w-full text-xs rounded border border-border bg-input px-2 py-1">
                      <option value="video">Video</option>
                      <option value="image">Image</option>
                      <option value="carousel">Carousel</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-fg-muted" htmlFor="ctx-budget">{t('workflowBuilder.field.budgetTier')}</label>
                    <select id="ctx-budget" value={execCtx.budgetTier || ''} onChange={(e) => setExecCtx({ ...execCtx, budgetTier: e.target.value as 'free' | 'starter' | 'pro' | 'elite' })} className="w-full text-xs rounded border border-border bg-input px-2 py-1">
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="elite">Elite</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={execCtx.hasVoiceover || false} onChange={(e) => setExecCtx({ ...execCtx, hasVoiceover: e.target.checked })} />
                      {t('workflowBuilder.field.hasVoiceover')}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={execCtx.hasMusic || false} onChange={(e) => setExecCtx({ ...execCtx, hasMusic: e.target.checked })} />
                      {t('workflowBuilder.field.hasMusic')}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={execCtx.complianceRequired || false} onChange={(e) => setExecCtx({ ...execCtx, complianceRequired: e.target.checked })} />
                      {t('workflowBuilder.field.complianceRequired')}
                    </label>
                  </div>
                </div>

                {/* Execution waves */}
                <div className="space-y-1">
                  <p className="text-xs text-fg-muted">{t('workflowBuilder.executionWaves')}</p>
                  {executionWaves.length === 0 ? (
                    <p className="text-xs text-danger">{t('workflowBuilder.noStagesResolved')}</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {executionWaves.map((wave, wi) => (
                        <div key={wi} className="flex items-center gap-1">
                          <div className={`flex gap-1 ${wave.length > 1 ? 'rounded-lg border border-accent/40 bg-accent/10 px-2 py-1' : ''}`}>
                            {wave.map((s, si) => {
                              const info = STAGE_INFO[s];
                              const Icon = info.icon;
                              return (
                                <span key={si} className="flex items-center gap-1 text-xs" title={t(`workflowBuilder.stage.${s}`)}>
                                  <Icon className="w-3 h-3" style={{ color: info.color }} aria-hidden="true" />
                                  {wave.length > 1 && <span>{t(`workflowBuilder.stage.${s}`)}</span>}
                                </span>
                              );
                            })}
                          </div>
                          {wi < executionWaves.length - 1 && <span className="text-fg-muted">→</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-fg-muted mt-1">
                    {resolvedStages.length} / {stageConfigs.length} {t('workflowBuilder.stagesWillRun')}
                  </p>
                </div>
              </div>
            )}

            {/* Save form */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">{t('workflowBuilder.saveTemplate')}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-fg-muted" htmlFor="wf-name">{t('workflowBuilder.templateName')}</label>
                  <input id="wf-name" type="text" value={name} onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LEN))} placeholder={t('workflowBuilder.namePlaceholder')} maxLength={MAX_NAME_LEN} className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="text-xs text-fg-muted" htmlFor="wf-desc">{t('workflowBuilder.description')}</label>
                  <input id="wf-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC_LEN))} placeholder={t('workflowBuilder.descPlaceholder')} maxLength={MAX_DESC_LEN} className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 border-t border-border pt-3">
                <div>
                  <label className="text-xs text-fg-muted" htmlFor="wf-product-name">{t('workflowBuilder.productNameLabel')}</label>
                  <input id="wf-product-name" type="text" value={productName} onChange={(e) => setProductName(e.target.value.slice(0, MAX_NAME_LEN))} placeholder={t('workflowBuilder.productNamePlaceholder')} maxLength={MAX_NAME_LEN} className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="text-xs text-fg-muted" htmlFor="wf-product-desc">{t('workflowBuilder.productDescLabel')}</label>
                  <input id="wf-product-desc" type="text" value={productDescription} onChange={(e) => setProductDescription(e.target.value.slice(0, MAX_DESC_LEN))} placeholder={t('workflowBuilder.productDescPlaceholder')} maxLength={MAX_DESC_LEN} className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={handleSave} disabled={saving || !name.trim() || stageConfigs.length === 0} aria-busy={saving} className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('workflowBuilder.save')}
                </button>
                <button onClick={handleRunAsPipeline} disabled={running || stageConfigs.length === 0} aria-busy={running} className="flex items-center gap-2 rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition disabled:opacity-50">
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {t('workflowBuilder.runAsPipeline')}
                </button>
                {teams.length > 0 && (
                  <select value={shareWithTeam} onChange={(e) => setShareWithTeam(e.target.value)} aria-label={t('workflowBuilder.shareWithTeam')} className="text-xs rounded-md border border-border bg-input px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="">{t('workflowBuilder.personal')}</option>
                    {teams.map(team => <option key={team.id} value={team.id}>{t('workflowBuilder.shareWith')} {team.name}</option>)}
                  </select>
                )}
                {saveMsg && <p role={saveMsg.type === 'error' ? 'alert' : 'status'} className={`text-xs ${saveMsg.type === 'error' ? 'text-danger' : 'text-success'}`}>{saveMsg.text}</p>}
                {runMsg && <p role={runMsg.type === 'error' ? 'alert' : 'status'} className={`text-xs ${runMsg.type === 'error' ? 'text-danger' : 'text-success'}`}>{runMsg.text}</p>}
              </div>
            </div>

            {/* Saved templates */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-sm font-semibold">{t('workflowBuilder.savedTemplates')}</h3>
                {/* Template filter dropdown */}
                <label className="ml-auto flex items-center gap-1.5 text-xs text-fg-muted" htmlFor="tmpl-filter">
                  {t('workflowBuilder.filter')}
                  <select
                    id="tmpl-filter"
                    value={templateFilter}
                    onChange={(e) => setTemplateFilter(e.target.value as 'all' | 'personal' | 'team' | 'builtin')}
                    aria-label={t('workflowBuilder.filter')}
                    className="text-xs rounded-md border border-border bg-input px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="all">{t('workflowBuilder.filterAll')}</option>
                    <option value="personal">{t('workflowBuilder.filterPersonal')}</option>
                    <option value="team">{t('workflowBuilder.filterTeam')}</option>
                    <option value="builtin">{t('workflowBuilder.filterBuiltin')}</option>
                  </select>
                </label>
              </div>
              {loading ? (
                <div className="grid place-items-center py-8" aria-busy="true" aria-label={t('workflowBuilder.loading')}>
                  <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Workflow className="w-8 h-8 mx-auto text-fg-muted mb-2" aria-hidden="true" />
                  <p className="text-sm text-fg-muted">{t('workflowBuilder.noTemplates')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((tmpl) => (
                    <div key={tmpl.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                          {tmpl.name}
                          {tmpl.isBuiltIn && <span className="text-xs text-fg-muted">({t('workflowBuilder.builtIn')})</span>}
                          {tmpl.isTeamShared && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent" title={t('workflowBuilder.teamShared')}>
                              <Users className="w-3 h-3" aria-hidden="true" /> {t('workflowBuilder.teamTag')}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-fg-muted truncate">{tmpl.description || tmpl.stages.join(' → ')}</p>
                      </div>
                      <button onClick={() => loadTemplate(tmpl)} className="text-xs px-2 py-1 rounded border border-border hover:bg-hover">{t('workflowBuilder.load')}</button>
                      {/* Unshare button for team-shared templates owned by the current user */}
                      {tmpl.isTeamShared && tmpl.ownerId === session.user.id && (
                        <button
                          onClick={() => handleUnshare(tmpl.id)}
                          disabled={unsharingId === tmpl.id}
                          aria-label={t('workflowBuilder.unshare')}
                          title={t('workflowBuilder.unshare')}
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-hover disabled:opacity-50 flex items-center gap-1"
                        >
                          {unsharingId === tmpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          {t('workflowBuilder.unshare')}
                        </button>
                      )}
                      {!tmpl.isBuiltIn && (
                        confirmDeleteId === tmpl.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDeleteTemplate(tmpl.id)} disabled={deletingId === tmpl.id} className="text-xs px-2 py-1 rounded bg-danger text-white hover:opacity-90">
                              {deletingId === tmpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('workflowBuilder.confirm')}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 rounded border border-border hover:bg-hover">{t('workflowBuilder.cancel')}</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(tmpl.id)} aria-label={t('workflowBuilder.delete')} className="p-1 text-danger hover:bg-danger/10 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <FeedbackWidget feature="workflow-builder" />
    </div>
  );
}
