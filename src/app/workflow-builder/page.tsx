'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Workflow, Plus, Trash2, GripVertical, Save, Loader2, AlertCircle,
  FileText, Clapperboard, Film, Image, Music, Scissors, ShieldCheck, Send,
  X, ChevronUp, ChevronDown, Check,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { FeedbackWidget } from '@/components/FeedbackWidget';

type StageId = 'brief' | 'script' | 'storyboard' | 'media_generation' | 'audio' | 'edit' | 'compliance' | 'publish';

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
  publish: { id: 'publish', icon: Send, color: '#6366f1' },
};

const ALL_STAGES: StageId[] = ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'publish'];
const MAX_STAGES = ALL_STAGES.length;
const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 500;

interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  stages: StageId[];
  isBuiltIn: boolean;
  isTeamShared?: boolean;
}

interface Team {
  id: string;
  name: string;
}

export default function WorkflowBuilderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [stages, setStages] = useState<StageId[]>(['brief', 'script', 'media_generation', 'publish']);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [shareWithTeam, setShareWithTeam] = useState<string>('');

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
      // Load user's teams for the sharing selector
      fetch('/api/teams')
        .then(res => res.ok ? res.json() : { teams: [] })
        .then(data => setTeams(data.teams || []))
        .catch(() => setTeams([]));
    } else {
      setLoading(false);
    }
  }, [session, loadTemplates]);

  const addStage = (stage: StageId) => {
    if (!stages.includes(stage) && stages.length < MAX_STAGES) {
      setStages([...stages, stage]);
    }
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const moveStage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= stages.length || to >= stages.length) return;
    const newStages = [...stages];
    const [moved] = newStages.splice(from, 1);
    newStages.splice(to, 0, moved);
    setStages(newStages);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      moveStage(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Keyboard reordering
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      moveStage(index, index - 1);
    } else if (e.key === 'ArrowDown' && index < stages.length - 1) {
      e.preventDefault();
      moveStage(index, index + 1);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || stages.length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/creative/workflow-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, description: description.trim(), stages, teamId: shareWithTeam || undefined }),
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

  const handleDeleteTemplate = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/creative/workflow-templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadTemplates();
      } else {
        setSaveMsg({ type: 'error', text: t('workflowBuilder.deleteFailed') });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('workflowBuilder.deleteFailed') });
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const loadTemplate = (template: SavedTemplate) => {
    // De-duplicate stages and filter to valid builder stages only
    const validStages = template.stages.filter(s => ALL_STAGES.includes(s));
    const uniqueStages = [...new Set(validStages)];
    setStages(uniqueStages.length > 0 ? uniqueStages : ['brief', 'publish']);
    // Strip existing " (copy)" suffix before adding a new one
    const baseName = template.name.replace(/\s*\(copy\)\s*$/, '');
    setName(baseName + ' (copy)');
    setDescription(template.description);
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Available stages */}
          <section className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold">{t('workflowBuilder.availableStages')}</h2>
            <div className="space-y-2">
              {ALL_STAGES.map((stageId) => {
                const info = STAGE_INFO[stageId];
                const Icon = info.icon;
                const inUse = stages.includes(stageId);
                const allUsed = stages.length >= MAX_STAGES;
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
                    {inUse ? (
                      <Check className="w-4 h-4 text-success" aria-hidden="true" />
                    ) : (
                      <Plus className="w-4 h-4 text-accent" aria-hidden="true" />
                    )}
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
              {stages.length === 0 ? (
                <div className="text-center py-8">
                  <Workflow className="w-8 h-8 mx-auto text-fg-muted mb-2" aria-hidden="true" />
                  <p className="text-sm text-fg-muted">{t('workflowBuilder.emptyPipeline')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stages.map((stageId, index) => {
                    const info = STAGE_INFO[stageId];
                    const Icon = info.icon;
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index && draggedIndex !== index;
                    return (
                      <div
                        key={`${stageId}-${index}`}
                        role="listitem"
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        tabIndex={0}
                        aria-grabbed={isDragging}
                        aria-label={`${t(`workflowBuilder.stage.${stageId}`)}, #${index + 1}. ${t('workflowBuilder.keyboardHint')}`}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition outline-none focus:ring-2 focus:ring-accent ${
                          isDragging ? 'opacity-50 border-accent' :
                          isDragOver ? 'border-accent bg-accent/5' :
                          'border-border bg-input'
                        }`}
                      >
                        <GripVertical className="w-4 h-4 text-fg-muted cursor-grab active:cursor-grabbing" aria-hidden="true" />
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: info.color + '20', color: info.color }}>
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{t(`workflowBuilder.stage.${stageId}`)}</p>
                        </div>
                        <span className="text-xs text-fg-muted">#{index + 1}</span>
                        {/* Keyboard reordering buttons */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveStage(index, index - 1)}
                            disabled={index === 0}
                            aria-label={t('workflowBuilder.moveUp')}
                            className="p-0.5 text-fg-muted hover:text-fg disabled:opacity-30"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveStage(index, index + 1)}
                            disabled={index === stages.length - 1}
                            aria-label={t('workflowBuilder.moveDown')}
                            className="p-0.5 text-fg-muted hover:text-fg disabled:opacity-30"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeStage(index)}
                          aria-label={t('workflowBuilder.removeStage')}
                          className="p-1 text-danger hover:bg-danger/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save form */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">{t('workflowBuilder.saveTemplate')}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-fg-muted" htmlFor="wf-name">{t('workflowBuilder.templateName')}</label>
                  <input
                    id="wf-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LEN))}
                    placeholder={t('workflowBuilder.namePlaceholder')}
                    maxLength={MAX_NAME_LEN}
                    className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-muted" htmlFor="wf-desc">{t('workflowBuilder.description')}</label>
                  <input
                    id="wf-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC_LEN))}
                    placeholder={t('workflowBuilder.descPlaceholder')}
                    maxLength={MAX_DESC_LEN}
                    className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || stages.length === 0}
                  aria-busy={saving}
                  className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('workflowBuilder.save')}
                </button>
                {teams.length > 0 && (
                  <select
                    value={shareWithTeam}
                    onChange={(e) => setShareWithTeam(e.target.value)}
                    aria-label={t('workflowBuilder.shareWithTeam')}
                    className="text-xs rounded-md border border-border bg-input px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">{t('workflowBuilder.personal')}</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{t('workflowBuilder.shareWith')} {team.name}</option>
                    ))}
                  </select>
                )}
                {saveMsg && (
                  <p
                    role={saveMsg.type === 'error' ? 'alert' : 'status'}
                    className={`text-xs ${saveMsg.type === 'error' ? 'text-danger' : 'text-success'}`}
                  >
                    {saveMsg.text}
                  </p>
                )}
              </div>
            </div>

            {/* Saved templates */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t('workflowBuilder.savedTemplates')}</h3>
              {loading ? (
                <div className="grid place-items-center py-8" aria-busy="true" aria-label={t('workflowBuilder.loading')}>
                  <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Workflow className="w-8 h-8 mx-auto text-fg-muted mb-2" aria-hidden="true" />
                  <p className="text-sm text-fg-muted">{t('workflowBuilder.noTemplates')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((tmpl) => (
                    <div key={tmpl.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {tmpl.name}
                          {tmpl.isBuiltIn && <span className="ml-2 text-xs text-fg-muted">({t('workflowBuilder.builtIn')})</span>}
                        </p>
                        <p className="text-xs text-fg-muted truncate">{tmpl.description || tmpl.stages.join(' → ')}</p>
                      </div>
                      <button
                        onClick={() => loadTemplate(tmpl)}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-hover"
                      >
                        {t('workflowBuilder.load')}
                      </button>
                      {!tmpl.isBuiltIn && (
                        confirmDeleteId === tmpl.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteTemplate(tmpl.id)}
                              disabled={deletingId === tmpl.id}
                              className="text-xs px-2 py-1 rounded bg-danger text-white hover:opacity-90"
                            >
                              {deletingId === tmpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('workflowBuilder.confirm')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2 py-1 rounded border border-border hover:bg-hover"
                            >
                              {t('workflowBuilder.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(tmpl.id)}
                            aria-label={t('workflowBuilder.delete')}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                          >
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
