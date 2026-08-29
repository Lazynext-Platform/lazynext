'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Workflow, Plus, Trash2, GripVertical, Play, Save, Loader2,
  FileText, Clapperboard, Film, Image, Music, Scissors, ShieldCheck, Send,
  ArrowRight, X,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

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

interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  stages: StageId[];
  isBuiltIn: boolean;
}

export default function WorkflowBuilderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [stages, setStages] = useState<StageId[]>(['brief', 'script', 'media_generation', 'publish']);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/creative/workflow-templates');
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user) loadTemplates();
    else setLoading(false);
  }, [session, loadTemplates]);

  const addStage = (stage: StageId) => {
    if (!stages.includes(stage)) {
      setStages([...stages, stage]);
    }
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const moveStage = (from: number, to: number) => {
    if (from === to) return;
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

  const handleSave = async () => {
    if (!name.trim() || stages.length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/creative/workflow-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, stages }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg(t('workflowBuilder.saved'));
        setName('');
        setDescription('');
        loadTemplates();
      } else {
        setSaveMsg(data.error || t('workflowBuilder.saveFailed'));
      }
    } catch {
      setSaveMsg(t('workflowBuilder.saveFailed'));
    }
    setSaving(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/creative/workflow-templates?id=${id}`, { method: 'DELETE' });
      loadTemplates();
    } catch {
      // silent
    }
  };

  const loadTemplate = (template: SavedTemplate) => {
    setStages(template.stages);
    setName(template.name + ' (copy)');
    setDescription(template.description);
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="w-6 h-6" /> {t('workflowBuilder.title')}
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
            <Workflow className="w-6 h-6" /> {t('workflowBuilder.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('workflowBuilder.subtitle')}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Available stages */}
          <section className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold">{t('workflowBuilder.availableStages')}</h2>
            <div className="space-y-2">
              {ALL_STAGES.map((stageId) => {
                const info = STAGE_INFO[stageId];
                const Icon = info.icon;
                const inUse = stages.includes(stageId);
                return (
                  <button
                    key={stageId}
                    onClick={() => addStage(stageId)}
                    disabled={inUse}
                    className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: info.color + '20', color: info.color }}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t(`workflowBuilder.stage.${stageId}`)}</p>
                      <p className="text-xs text-fg-muted truncate">{t(`workflowBuilder.stageDesc.${stageId}`)}</p>
                    </div>
                    {inUse ? (
                      <X className="w-4 h-4 text-fg-muted" />
                    ) : (
                      <Plus className="w-4 h-4 text-accent" />
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
            <div className="rounded-lg border border-border bg-card p-4 min-h-48">
              {stages.length === 0 ? (
                <p className="text-sm text-fg-muted text-center py-8">{t('workflowBuilder.emptyPipeline')}</p>
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
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                          isDragging ? 'opacity-50 border-accent' :
                          isDragOver ? 'border-accent bg-accent/5' :
                          'border-border bg-input'
                        }`}
                      >
                        <GripVertical className="w-4 h-4 text-fg-muted cursor-grab active:cursor-grabbing" />
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: info.color + '20', color: info.color }}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{t(`workflowBuilder.stage.${stageId}`)}</p>
                        </div>
                        <span className="text-xs text-fg-muted">#{index + 1}</span>
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
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('workflowBuilder.namePlaceholder')}
                    className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-muted" htmlFor="wf-desc">{t('workflowBuilder.description')}</label>
                  <input
                    id="wf-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('workflowBuilder.descPlaceholder')}
                    className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || stages.length === 0}
                  className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('workflowBuilder.save')}
                </button>
                {saveMsg && <p role="status" className="text-xs text-fg-muted">{saveMsg}</p>}
              </div>
            </div>

            {/* Saved templates */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t('workflowBuilder.savedTemplates')}</h3>
              {loading ? (
                <div className="grid place-items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-fg-muted py-4">{t('workflowBuilder.noTemplates')}</p>
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
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          aria-label={t('workflowBuilder.delete')}
                          className="p-1 text-danger hover:bg-danger/10 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
