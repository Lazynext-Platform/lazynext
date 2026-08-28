'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  Scissors, Sparkles, Film, Loader2, AlertCircle, Clock,
  Download, CheckCircle2, Layers, Filter,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { VisualTimeline } from '@/components/editor/VisualTimeline';
import type { Timeline as TimelineModel, Track as TrackModel, Clip as ClipModel } from '@/lib/editor/types';

type Step = 'idle' | 'loading' | 'done' | 'error';

interface CutSegment {
  startSec: number;
  endSec: number;
  durationSec: number;
  text: string;
  reason: string;
  label: string;
}

interface RoughCutPlan {
  sourceSegments: Array<{ start: number; end: number; text: string }>;
  cuts: CutSegment[];
  totalDurationSec: number;
  sourceDurationSec: number;
  compressionRatio: number;
  transitions: Array<{ fromIndex: number; toIndex: number; type: string }>;
  notes: string[];
}

interface EditingSkill {
  id: string;
  name: string;
  description: string;
  contentTypes: string[];
  platforms: string[];
  steps: Array<{ order: number; action: string; trigger: string; description: string; params?: Record<string, unknown> }>;
  estimatedTimeMin: number;
  tags: string[];
  source: string;
}

const CONTENT_TYPES = ['talking-head', 'product-demo', 'ugc', 'drama', 'tutorial', 'testimonial', 'unboxing', 'before-after', 'story'];
const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'];

const SAMPLE_TRANSCRIPT = JSON.stringify({
  text: 'Hey guys today I want to show you this amazing product.',
  duration: 30,
  segments: [
    { start: 0, end: 3, text: 'Hey guys today I want to show you this amazing product.' },
    { start: 3.5, end: 7, text: 'It has really cool features you will love.' },
    { start: 7.5, end: 11, text: 'The first thing is the design, it looks premium.' },
    { start: 11.5, end: 15, text: 'The second thing is the battery life, it lasts all day.' },
    { start: 15.5, end: 19, text: 'And the third thing is the price, it is very affordable.' },
    { start: 19.5, end: 22, text: 'So check it out, link in bio.' },
  ],
}, null, 2);

export default function EditorPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);

  const [tab, setTab] = useState<'roughCut' | 'skills' | 'timeline'>('roughCut');

  // Rough cut state — initialize from URL query param if present (e.g., from Creative Director)
  const [transcript, setTranscript] = useState(() => {
    const queryTranscript = searchParams.get('transcript');
    if (queryTranscript) {
      try {
        // Validate it's valid JSON, then return the pretty-printed version
        const parsed = JSON.parse(queryTranscript);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return SAMPLE_TRANSCRIPT;
      }
    }
    return SAMPLE_TRANSCRIPT;
  });
  const [targetDuration, setTargetDuration] = useState('');
  const [minSegment, setMinSegment] = useState('1.5');
  const [maxPause, setMaxPause] = useState('2');
  const [removeFillers, setRemoveFillers] = useState(true);
  const [rcStep, setRcStep] = useState<Step>('idle');
  const [plan, setPlan] = useState<RoughCutPlan | null>(null);
  const [rcError, setRcError] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'edl'>('json');

  // Skills state
  const [skills, setSkills] = useState<EditingSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');

  // Skill CRUD state
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<EditingSkill | null>(null);
  const [skillForm, setSkillForm] = useState({
    name: '',
    description: '',
    contentTypes: [] as string[],
    platforms: [] as string[],
    estimatedTimeMin: 5,
    tags: [] as string[],
    steps: [] as Array<{ order: number; action: string; trigger: string; description: string; params?: Record<string, unknown> }>,
  });
  const [skillFormStep, setSkillFormStep] = useState<Step>('idle');
  const [skillFormError, setSkillFormError] = useState('');
  const [skillTagInput, setSkillTagInput] = useState('');

  // Timeline state
  const [tlName, setTlName] = useState('My Timeline');
  const [tlFps, setTlFps] = useState('30');
  const [tlRatio, setTlRatio] = useState('16:9');
  const [tlStep, setTlStep] = useState<Step>('idle');
  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);
  const [tlError, setTlError] = useState('');

  // Transcribe state
  const [videoUrl, setVideoUrl] = useState('');
  const [trStep, setTrStep] = useState<Step>('idle');
  const [trError, setTrError] = useState('');

  // OCR state
  const [ocrImageUrl, setOcrImageUrl] = useState('');
  const [ocrStep, setOcrStep] = useState<Step>('idle');
  const [ocrError, setOcrError] = useState('');
  const [ocrResult, setOcrResult] = useState<{ text: string; confidence?: number; dryRun?: boolean } | null>(null);

  // Timeline persistence state
  const [savedTimelines, setSavedTimelines] = useState<Array<{ id: string; name: string; updatedAt: string }>>([]);
  const [tlListLoading, setTlListLoading] = useState(false);
  const [tlSaveStep, setTlSaveStep] = useState<Step>('idle');
  const [tlSaveError, setTlSaveError] = useState('');

  // Visual timeline playhead position (seconds).
  const [tlPlayhead, setTlPlayhead] = useState(0);

  const loadSkills = useCallback(async () => {
    if (!session?.user) return;
    setSkillsLoading(true);
    setSkillsError('');
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('contentType', filterType);
      if (filterPlatform) params.set('platform', filterPlatform);
      const res = await fetch(`/api/editor/skills?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json().catch(() => ({}));
      setSkills(j.skills || []);
    } catch (e) {
      setSkillsError(e instanceof TypeError ? t('common.errNetwork') : t('editor.skErrFailed'));
    } finally {
      setSkillsLoading(false);
    }
  }, [session?.user, filterType, filterPlatform, t]);

  useEffect(() => {
    if (session?.user && tab === 'skills') loadSkills();
  }, [session?.user, tab, loadSkills]);

  // ── Skill CRUD helpers ──

  const resetSkillForm = useCallback(() => {
    setSkillForm({
      name: '', description: '', contentTypes: [], platforms: [],
      estimatedTimeMin: 5, tags: [], steps: [],
    });
    setEditingSkill(null);
    setSkillFormError('');
    setSkillFormStep('idle');
    setSkillTagInput('');
  }, []);

  const startEditSkill = useCallback((skill: EditingSkill) => {
    setEditingSkill(skill);
    setSkillForm({
      name: skill.name,
      description: skill.description,
      contentTypes: skill.contentTypes,
      platforms: skill.platforms,
      estimatedTimeMin: skill.estimatedTimeMin,
      tags: skill.tags,
      steps: skill.steps,
    });
    setShowSkillForm(true);
    setSkillFormError('');
    setSkillFormStep('idle');
  }, []);

  const saveSkill = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    if (!skillForm.name.trim()) { setSkillFormError('Name is required'); return; }
    setSkillFormStep('loading');
    setSkillFormError('');
    try {
      const body = {
        name: skillForm.name.trim(),
        description: skillForm.description,
        contentTypes: skillForm.contentTypes,
        platforms: skillForm.platforms,
        steps: skillForm.steps,
        estimatedTimeMin: skillForm.estimatedTimeMin,
        tags: skillForm.tags,
      };
      const res = editingSkill
        ? await fetch(`/api/editor/skills?id=${editingSkill.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/editor/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setSkillFormStep('done');
      setShowSkillForm(false);
      resetSkillForm();
      loadSkills();
    } catch (e) {
      setSkillFormError(e instanceof Error ? e.message : String(e));
      setSkillFormStep('error');
    }
  }, [session?.user, editingSkill, skillForm, resetSkillForm, loadSkills]);

  const deleteSkill = useCallback(async (skill: EditingSkill) => {
    if (skill.source === 'builtin') return;
    if (!confirm(`Delete "${skill.name}"?`)) return;
    try {
      const res = await fetch(`/api/editor/skills?id=${skill.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadSkills();
    } catch (e) {
      setSkillsError(e instanceof Error ? e.message : String(e));
    }
  }, [loadSkills]);

  const addSkillStep = useCallback(() => {
    setSkillForm(prev => ({
      ...prev,
      steps: [...prev.steps, { order: prev.steps.length + 1, action: 'cut', trigger: '', description: '', params: {} }],
    }));
  }, []);

  const removeSkillStep = useCallback((idx: number) => {
    setSkillForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  }, []);

  const updateSkillStep = useCallback((idx: number, field: 'action' | 'trigger' | 'description', value: string) => {
    setSkillForm(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  }, []);

  const addSkillTag = useCallback(() => {
    const tag = skillTagInput.trim();
    if (!tag || skillForm.tags.includes(tag)) return;
    setSkillForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setSkillTagInput('');
  }, [skillTagInput, skillForm.tags]);

  const removeSkillTag = useCallback((tag: string) => {
    setSkillForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  }, []);

  const generateRoughCut = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    setRcStep('loading');
    setRcError('');
    setPlan(null);
    try {
      const parsed = JSON.parse(transcript);
      const res = await fetch('/api/editor/rough-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: parsed,
          options: {
            targetDurationSec: targetDuration ? Number(targetDuration) : undefined,
            minSegmentSec: Number(minSegment),
            maxPauseSec: Number(maxPause),
            removeFillers,
          },
          format: exportFormat,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json().catch(() => ({}));
      setPlan(j.plan);
      setRcStep('done');
    } catch (e) {
      setRcError(e instanceof SyntaxError ? 'Invalid JSON transcript' : t('editor.rcErrFailed'));
      setRcStep('error');
    }
  }, [session?.user, transcript, targetDuration, minSegment, maxPause, removeFillers, exportFormat, t]);

  const createTimeline = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    setTlStep('loading');
    setTlError('');
    setTimeline(null);
    try {
      const res = await fetch('/api/editor/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: tlName,
          fps: Number(tlFps),
          ratio: tlRatio,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json().catch(() => ({}));
      setTimeline(j.timeline);
      setTlStep('done');
    } catch (e) {
      setTlError(e instanceof TypeError ? t('common.errNetwork') : t('editor.tlErrFailed'));
      setTlStep('error');
    }
  }, [session?.user, tlName, tlFps, tlRatio, t]);

  const transcribeVideo = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    setTrStep('loading');
    setTrError('');
    try {
      const res = await fetch('/api/editor/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json().catch(() => ({}));
      if (j.transcript) {
        setTranscript(JSON.stringify(j.transcript, null, 2));
        setTrStep('done');
      } else {
        throw new Error('no_transcript');
      }
    } catch (e) {
      setTrError(e instanceof TypeError ? t('common.errNetwork') : t('editor.trErrFailed'));
      setTrStep('error');
    }
  }, [session?.user, videoUrl, t]);

  const runOCR = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    setOcrStep('loading');
    setOcrError('');
    setOcrResult(null);
    try {
      const res = await fetch('/api/editor/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: ocrImageUrl }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json().catch(() => ({}));
      setOcrResult({ text: j.text || '', confidence: j.confidence, dryRun: j.dryRun });
      setOcrStep('done');
    } catch (e) {
      setOcrError(e instanceof TypeError ? t('common.errNetwork') : t('editor.ocrErrFailed'));
      setOcrStep('error');
    }
  }, [session?.user, ocrImageUrl, t]);

  const loadSavedTimelines = useCallback(async () => {
    if (!session?.user) return;
    setTlListLoading(true);
    try {
      const res = await fetch('/api/editor/timeline');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json().catch(() => ({}));
      setSavedTimelines(j.timelines || []);
    } catch {
      // silently fail — list is optional
    } finally {
      setTlListLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user && tab === 'timeline') loadSavedTimelines();
  }, [session?.user, tab, loadSavedTimelines]);

  const saveTimeline = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    if (!timeline) return;
    setTlSaveStep('loading');
    setTlSaveError('');
    try {
      const res = await fetch('/api/editor/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', timeline }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setTlSaveStep('done');
      loadSavedTimelines();
    } catch (e) {
      setTlSaveError(e instanceof TypeError ? t('common.errNetwork') : t('editor.tlSaveFailed'));
      setTlSaveStep('error');
    }
  }, [session?.user, timeline, t, loadSavedTimelines]);

  const loadTimeline = useCallback(async (id: string) => {
    if (!session?.user) return;
    setTlStep('loading');
    setTlError('');
    try {
      const res = await fetch('/api/editor/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json().catch(() => ({}));
      if (j.timeline) {
        setTimeline(j.timeline);
        setTlName(j.timeline.name || 'Loaded');
        setTlFps(String(j.timeline.fps || 30));
        setTlRatio(j.timeline.ratio || '16:9');
        setTlStep('done');
      }
    } catch (e) {
      setTlError(e instanceof TypeError ? t('common.errNetwork') : t('editor.tlErrFailed'));
      setTlStep('error');
    }
  }, [session?.user, t]);

  const deleteTimeline = useCallback(async (id: string) => {
    if (!session?.user) return;
    try {
      await fetch('/api/editor/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      loadSavedTimelines();
    } catch {
      // silently fail
    }
  }, [session?.user, loadSavedTimelines]);

  // Update a clip's startSec in the current timeline state (visual editor drag).
  const handleClipUpdate = useCallback((trackId: string, clipId: string, newStartSec: number) => {
    setTimeline((prev) => {
      if (!prev) return prev;
      const model = prev as unknown as TimelineModel;
      const updatedTracks: TrackModel[] = model.tracks.map((tr) => {
        if (tr.id !== trackId) return tr;
        const clips: ClipModel[] = tr.clips.map((cl) => {
          if (cl.id !== clipId) return cl;
          const durationSec = cl.durationSec;
          return {
            ...cl,
            startSec: newStartSec,
            endSec: newStartSec + durationSec,
          };
        });
        return { ...tr, clips };
      });
      // Recompute total duration from the latest clip end.
      let maxEnd = 0;
      for (const tr of updatedTracks) {
        for (const cl of tr.clips) {
          if (cl.endSec > maxEnd) maxEnd = cl.endSec;
        }
      }
      return {
        ...prev,
        tracks: updatedTracks as unknown as typeof prev.tracks,
        durationSec: Math.max(model.durationSec, maxEnd),
        updatedAt: new Date().toISOString(),
      } as typeof prev;
    });
  }, []);

  return (
    <main id="main-content" className="min-h-screen bg-bg text-fg">
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-12 safe-top">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('editor.title')}</h1>
        <p className="text-fg-muted mb-6">{t('editor.subtitle')}</p>

        {!session?.user && (
          <div className="rounded-lg border border-border bg-bg-card p-4 mb-6 text-fg-muted">
            {t('editor.signInPrompt')}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'roughCut'}
            onClick={() => setTab('roughCut')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'roughCut' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Scissors className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('editor.tabRoughCut')}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'skills'}
            onClick={() => setTab('skills')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'skills' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Sparkles className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('editor.tabSkills')}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'timeline'}
            onClick={() => setTab('timeline')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'timeline' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Film className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('editor.tabTimeline')}
          </button>
        </div>

        {/* Rough Cut Tab */}
        {tab === 'roughCut' && (
          <section aria-busy={rcStep === 'loading' || trStep === 'loading'} className="space-y-4">
            {/* Transcribe from video URL */}
            <div className="rounded-lg border border-border bg-bg-card p-3">
              <label htmlFor="videoUrl" className="block text-sm font-medium mb-1">
                {t('editor.trTitle')}
              </label>
              <p className="text-xs text-fg-muted mb-2">{t('editor.trHint')}</p>
              <div className="flex gap-2">
                <input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.trTitle')}
                />
                <button
                  onClick={transcribeVideo}
                  disabled={trStep === 'loading' || !videoUrl.trim()}
                  className="px-3 py-2 rounded-lg bg-fg-muted/20 text-fg text-sm font-medium hover:bg-fg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {trStep === 'loading' ? (
                    <><Loader2 className="inline w-4 h-4 mr-1 animate-spin" aria-hidden="true" />{t('editor.trTranscribing')}</>
                  ) : (
                    <>{t('editor.trTranscribe')}</>
                  )}
                </button>
              </div>
              {trError && (
                <div role="alert" className="mt-2 text-xs text-danger">
                  <AlertCircle className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  {trError}
                </div>
              )}
              {trStep === 'done' && (
                <div role="status" className="mt-2 text-xs text-success">
                  <CheckCircle2 className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  {t('editor.trDone')}
                </div>
              )}
            </div>

            {/* OCR from image URL */}
            <div className="rounded-lg border border-border bg-bg-card p-3">
              <label htmlFor="ocrImageUrl" className="block text-sm font-medium mb-1">
                {t('editor.ocrTitle')}
              </label>
              <p className="text-xs text-fg-muted mb-2">{t('editor.ocrHint')}</p>
              <div className="flex gap-2">
                <input
                  id="ocrImageUrl"
                  type="url"
                  value={ocrImageUrl}
                  onChange={(e) => setOcrImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.ocrTitle')}
                />
                <button
                  onClick={runOCR}
                  disabled={ocrStep === 'loading' || !ocrImageUrl.trim()}
                  className="px-3 py-2 rounded-lg bg-fg-muted/20 text-fg text-sm font-medium hover:bg-fg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {ocrStep === 'loading' ? (
                    <><Loader2 className="inline w-4 h-4 mr-1 animate-spin" aria-hidden="true" />{t('editor.ocrRunning')}</>
                  ) : (
                    <>{t('editor.ocrRun')}</>
                  )}
                </button>
              </div>
              {ocrError && (
                <div role="alert" className="mt-2 text-xs text-danger">
                  <AlertCircle className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  {ocrError}
                </div>
              )}
              {ocrResult && ocrStep === 'done' && (
                <div role="status" className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    <span>{t('editor.ocrDone')}</span>
                    {ocrResult.dryRun && <span className="text-fg-muted">(dry-run)</span>}
                  </div>
                  {ocrResult.text && (
                    <p className="text-xs text-fg bg-bg rounded p-2 border border-border">{ocrResult.text}</p>
                  )}
                  {ocrResult.confidence !== undefined && (
                    <p className="text-xs text-fg-muted">Confidence: {(ocrResult.confidence * 100).toFixed(0)}%</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="transcript" className="block text-sm font-medium mb-1">
                {t('editor.rcTranscript')}
              </label>
              <p className="text-xs text-fg-muted mb-2">{t('editor.rcTranscriptHint')}</p>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-accent"
                aria-label={t('editor.rcTranscript')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="targetDuration" className="block text-sm font-medium mb-1">
                  {t('editor.rcTargetDuration')}
                </label>
                <input
                  id="targetDuration"
                  type="number"
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(e.target.value)}
                  min="1"
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.rcTargetDuration')}
                />
              </div>
              <div>
                <label htmlFor="minSegment" className="block text-sm font-medium mb-1">
                  {t('editor.rcMinSegment')}
                </label>
                <input
                  id="minSegment"
                  type="number"
                  value={minSegment}
                  onChange={(e) => setMinSegment(e.target.value)}
                  min="0.1"
                  step="0.1"
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.rcMinSegment')}
                />
              </div>
              <div>
                <label htmlFor="maxPause" className="block text-sm font-medium mb-1">
                  {t('editor.rcMaxPause')}
                </label>
                <input
                  id="maxPause"
                  type="number"
                  value={maxPause}
                  onChange={(e) => setMaxPause(e.target.value)}
                  min="0.1"
                  step="0.1"
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.rcMaxPause')}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={removeFillers}
                  onChange={(e) => setRemoveFillers(e.target.checked)}
                  className="rounded"
                />
                {t('editor.rcRemoveFillers')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                />
                JSON
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'edl'}
                  onChange={() => setExportFormat('edl')}
                />
                EDL
              </label>
            </div>

            <button
              onClick={generateRoughCut}
              disabled={rcStep === 'loading' || !transcript.trim()}
              className="px-4 py-2 rounded-lg bg-brand-accent text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rcStep === 'loading' ? (
                <><Loader2 className="inline w-4 h-4 mr-1.5 animate-spin" aria-hidden="true" />{t('editor.rcGenerating')}</>
              ) : (
                <><Scissors className="inline w-4 h-4 mr-1.5" aria-hidden="true" />{t('editor.rcGenerate')}</>
              )}
            </button>

            {rcError && (
              <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
                {rcError}
              </div>
            )}

            {plan && rcStep === 'done' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">{t('editor.rcResult')}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border bg-bg-card p-3">
                    <div className="text-xs text-fg-muted">{t('editor.rcSourceDuration')}</div>
                    <div className="text-lg font-bold">{plan.sourceDurationSec.toFixed(1)}s</div>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-card p-3">
                    <div className="text-xs text-fg-muted">{t('editor.rcCutDuration')}</div>
                    <div className="text-lg font-bold">{plan.totalDurationSec.toFixed(1)}s</div>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-card p-3">
                    <div className="text-xs text-fg-muted">{t('editor.rcCompression')}</div>
                    <div className="text-lg font-bold">{plan.compressionRatio.toFixed(1)}x</div>
                  </div>
                </div>

                {plan.notes.length > 0 && (
                  <div className="rounded-lg border border-border bg-bg-card p-3">
                    <div className="text-xs font-medium text-fg-muted mb-1">{t('editor.rcNotes')}</div>
                    <ul className="text-sm space-y-1">
                      {plan.notes.map((note, i) => (
                        <li key={i} className="text-fg-muted">• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-2">{t('editor.rcCuts')} ({plan.cuts.length})</h3>
                  <div className="space-y-2">
                    {plan.cuts.map((cut, i) => (
                      <div key={i} className="rounded-lg border border-border bg-bg-card p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate min-w-0">{cut.label}</span>
                          <span className="text-xs text-fg-muted shrink-0 ml-2">{cut.startSec.toFixed(1)}s–{cut.endSec.toFixed(1)}s ({cut.durationSec.toFixed(1)}s)</span>
                        </div>
                        <p className="text-xs text-fg-muted">{cut.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.transitions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('editor.rcTransitions')} ({plan.transitions.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {plan.transitions.map((tr, i) => (
                        <span key={i} className="text-xs rounded-full bg-bg-card border border-border px-2 py-1">
                          {tr.fromIndex} → {tr.toIndex}: {tr.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {rcStep === 'idle' && !plan && (
              <p className="text-sm text-fg-muted">{t('editor.rcNoResult')}</p>
            )}
          </section>
        )}

        {/* Skills Tab */}
        {tab === 'skills' && (
          <section aria-busy={skillsLoading} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">{t('editor.skTitle')}</h2>
              <p className="text-sm text-fg-muted">{t('editor.skSubtitle')}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <label htmlFor="filterType" className="block text-xs font-medium mb-1">
                  <Filter className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  {t('editor.skFilterType')}
                </label>
                <select
                  id="filterType"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.skFilterType')}
                >
                  <option value="">{t('editor.skAllTypes')}</option>
                  {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="filterPlatform" className="block text-xs font-medium mb-1">
                  <Filter className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  {t('editor.skFilterPlatform')}
                </label>
                <select
                  id="filterPlatform"
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.skFilterPlatform')}
                >
                  <option value="">{t('editor.skAllPlatforms')}</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Create / Cancel skill button */}
            <div className="flex gap-2">
              {!showSkillForm ? (
                <button
                  onClick={() => { resetSkillForm(); setShowSkillForm(true); }}
                  className="px-3 py-1.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90"
                >
                  <Sparkles className="inline w-4 h-4 mr-1" aria-hidden="true" />
                  {t('editor.skCreate')}
                </button>
              ) : (
                <button
                  onClick={() => { setShowSkillForm(false); resetSkillForm(); }}
                  className="px-3 py-1.5 rounded-lg border border-border text-fg text-sm font-medium hover:bg-bg-card"
                >
                  {t('editor.skCancel')}
                </button>
              )}
            </div>

            {/* Skill create/edit form */}
            {showSkillForm && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <h3 className="font-medium text-sm">{editingSkill ? t('editor.skEdit') : t('editor.skCreate')}</h3>

                {skillFormError && (
                  <div role="alert" className="text-xs text-danger">
                    <AlertCircle className="inline w-3 h-3 mr-1" aria-hidden="true" />
                    {skillFormError}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="skillName" className="block text-xs font-medium mb-1">{t('editor.skName')}</label>
                  <input
                    id="skillName"
                    type="text"
                    value={skillForm.name}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    aria-label={t('editor.skName')}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="skillDesc" className="block text-xs font-medium mb-1">{t('editor.skDesc')}</label>
                  <textarea
                    id="skillDesc"
                    value={skillForm.description}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    aria-label={t('editor.skDesc')}
                  />
                </div>

                {/* Content types */}
                <div>
                  <span className="block text-xs font-medium mb-1">{t('editor.skContentTypes')}</span>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPES.map(ct => (
                      <label key={ct} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={skillForm.contentTypes.includes(ct)}
                          onChange={(e) => setSkillForm(prev => ({
                            ...prev,
                            contentTypes: e.target.checked
                              ? [...prev.contentTypes, ct]
                              : prev.contentTypes.filter(c => c !== ct),
                          }))}
                        />
                        {ct}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <span className="block text-xs font-medium mb-1">{t('editor.skPlatforms')}</span>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p => (
                      <label key={p} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={skillForm.platforms.includes(p)}
                          onChange={(e) => setSkillForm(prev => ({
                            ...prev,
                            platforms: e.target.checked
                              ? [...prev.platforms, p]
                              : prev.platforms.filter(x => x !== p),
                          }))}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <span className="block text-xs font-medium mb-1">{t('editor.skTags')}</span>
                  <div className="flex gap-2 mb-1">
                    <input
                      type="text"
                      value={skillTagInput}
                      onChange={(e) => setSkillTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkillTag(); } }}
                      placeholder={t('editor.skTagPlaceholder')}
                      className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      aria-label={t('editor.skTags')}
                    />
                    <button onClick={addSkillTag} className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-bg-card">
                      {t('editor.skAddTag')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skillForm.tags.map(tag => (
                      <span key={tag} className="text-xs rounded-full bg-bg border border-border px-2 py-0.5 flex items-center gap-1">
                        {tag}
                        <button onClick={() => removeSkillTag(tag)} className="text-fg-muted hover:text-danger" aria-label={`Remove ${tag}`}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Estimated time */}
                <div>
                  <label htmlFor="skillEstTime" className="block text-xs font-medium mb-1">{t('editor.skEstTime')}</label>
                  <input
                    id="skillEstTime"
                    type="number"
                    min="1"
                    max="120"
                    value={skillForm.estimatedTimeMin}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, estimatedTimeMin: Number(e.target.value) || 5 }))}
                    className="w-24 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    aria-label={t('editor.skEstTime')}
                  />
                </div>

                {/* Steps */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{t('editor.skSteps')}</span>
                    <button onClick={addSkillStep} className="text-xs text-brand-accent hover:underline">
                      + {t('editor.skAddStep')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {skillForm.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <span className="text-xs text-fg-muted mt-2 shrink-0">{idx + 1}.</span>
                        <select
                          value={step.action}
                          onChange={(e) => updateSkillStep(idx, 'action', e.target.value)}
                          className="rounded border border-border bg-bg px-2 py-1 text-xs"
                          aria-label={`Step ${idx + 1} action`}
                        >
                          {['cut', 'trim', 'speed-ramp', 'zoom', 'pan', 'text-overlay', 'caption', 'transition', 'color-grade', 'audio-duck', 'audio-boost', 'b-roll', 'freeze-frame', 'split-screen'].map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={step.trigger}
                          onChange={(e) => updateSkillStep(idx, 'trigger', e.target.value)}
                          placeholder={t('editor.skStepTrigger')}
                          className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs"
                          aria-label={`Step ${idx + 1} trigger`}
                        />
                        <input
                          type="text"
                          value={step.description}
                          onChange={(e) => updateSkillStep(idx, 'description', e.target.value)}
                          placeholder={t('editor.skStepDesc')}
                          className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs"
                          aria-label={`Step ${idx + 1} description`}
                        />
                        <button onClick={() => removeSkillStep(idx)} className="text-fg-muted hover:text-danger text-sm shrink-0" aria-label={`Remove step ${idx + 1}`}>×</button>
                      </div>
                    ))}
                    {skillForm.steps.length === 0 && (
                      <p className="text-xs text-fg-muted">{t('editor.skNoSteps')}</p>
                    )}
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={saveSkill}
                  disabled={skillFormStep === 'loading' || !skillForm.name.trim()}
                  className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {skillFormStep === 'loading' ? (
                    <><Loader2 className="inline w-4 h-4 mr-1.5 animate-spin" aria-hidden="true" />{t('common.saving')}</>
                  ) : (
                    <>{t('editor.skSave')}</>
                  )}
                </button>
                {skillFormStep === 'done' && (
                  <span className="text-xs text-success ml-2"><CheckCircle2 className="inline w-3 h-3" aria-hidden="true" /> {t('editor.skSaved')}</span>
                )}
              </div>
            )}

            {skillsLoading && (
              <div role="status" className="flex items-center gap-2 text-fg-muted">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">{t('common.loadingDots')}</span>
              </div>
            )}

            {skillsError && (
              <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
                {skillsError}
              </div>
            )}

            {!skillsLoading && !skillsError && skills.length === 0 && (
              <p className="text-sm text-fg-muted">{t('editor.skNoSkills')}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skills.map(skill => (
                <div key={skill.id} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm truncate min-w-0">{skill.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      skill.source === 'builtin' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-fg-muted/10 text-fg-muted'
                    }`}>
                      {skill.source === 'builtin' ? t('editor.skBuiltin') : t('editor.skUser')}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted mb-2">{skill.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {skill.contentTypes.map(ct => (
                      <span key={ct} className="text-xs rounded-full bg-bg border border-border px-2 py-0.5">{ct}</span>
                    ))}
                    {skill.platforms.map(p => (
                      <span key={p} className="text-xs rounded-full bg-bg border border-border px-2 py-0.5">{p}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-fg-muted">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" aria-hidden="true" />
                      {t('editor.skSteps')}: {skill.steps.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {t('editor.skEstTime')}: {skill.estimatedTimeMin} {t('editor.skMin')}
                    </span>
                  </div>
                  {skill.steps.length > 0 && (
                    <ol className="mt-2 space-y-1">
                      {skill.steps.map(step => (
                        <li key={step.order} className="text-xs text-fg-muted">
                          <span className="font-medium">{step.order}.</span> {step.description}
                        </li>
                      ))}
                    </ol>
                  )}
                  {skill.source === 'user' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => startEditSkill(skill)}
                        className="text-xs px-2 py-1 rounded border border-border text-fg hover:bg-bg"
                        aria-label={`Edit ${skill.name}`}
                      >
                        {t('editor.skEditBtn')}
                      </button>
                      <button
                        onClick={() => deleteSkill(skill)}
                        className="text-xs px-2 py-1 rounded border border-danger/30 text-danger hover:bg-danger/10"
                        aria-label={`Delete ${skill.name}`}
                      >
                        {t('editor.skDeleteBtn')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline Tab */}
        {tab === 'timeline' && (
          <section aria-busy={tlStep === 'loading'} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">{t('editor.tlTitle')}</h2>
              <p className="text-sm text-fg-muted">{t('editor.tlSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="tlName" className="block text-sm font-medium mb-1">{t('editor.tlName')}</label>
                <input
                  id="tlName"
                  type="text"
                  value={tlName}
                  onChange={(e) => setTlName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.tlName')}
                />
              </div>
              <div>
                <label htmlFor="tlFps" className="block text-sm font-medium mb-1">{t('editor.tlFps')}</label>
                <input
                  id="tlFps"
                  type="number"
                  value={tlFps}
                  onChange={(e) => setTlFps(e.target.value)}
                  min="1"
                  max="120"
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.tlFps')}
                />
              </div>
              <div>
                <label htmlFor="tlRatio" className="block text-sm font-medium mb-1">{t('editor.tlRatio')}</label>
                <select
                  id="tlRatio"
                  value={tlRatio}
                  onChange={(e) => setTlRatio(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  aria-label={t('editor.tlRatio')}
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                  <option value="4:3">4:3</option>
                  <option value="21:9">21:9</option>
                </select>
              </div>
            </div>

            <button
              onClick={createTimeline}
              disabled={tlStep === 'loading' || !tlName.trim()}
              className="px-4 py-2 rounded-lg bg-brand-accent text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tlStep === 'loading' ? (
                <><Loader2 className="inline w-4 h-4 mr-1.5 animate-spin" aria-hidden="true" />{t('common.loadingDots')}</>
              ) : (
                <><Film className="inline w-4 h-4 mr-1.5" aria-hidden="true" />{t('editor.tlCreate')}</>
              )}
            </button>

            {tlError && (
              <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
                {tlError}
              </div>
            )}

            {timeline && tlStep === 'done' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">{t('editor.tlCreated')}</span>
                </div>
                {/* Visual timeline editor */}
                <VisualTimeline
                  timeline={timeline as unknown as TimelineModel}
                  onUpdateClip={handleClipUpdate}
                  onSeek={setTlPlayhead}
                  currentTimeSec={tlPlayhead}
                />
                <pre className="rounded-lg border border-border bg-bg-card p-3 text-xs font-mono overflow-x-auto" role="status">
                  {JSON.stringify(timeline, null, 2)}
                </pre>
                {/* Save to D1 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveTimeline}
                    disabled={tlSaveStep === 'loading'}
                    className="px-3 py-1.5 rounded-lg bg-fg-muted/20 text-fg text-sm font-medium hover:bg-fg-muted/30 disabled:opacity-50"
                  >
                    {tlSaveStep === 'loading' ? (
                      <><Loader2 className="inline w-4 h-4 mr-1 animate-spin" aria-hidden="true" />{t('common.loadingDots')}</>
                    ) : (
                      <>{t('editor.tlSave')}</>
                    )}
                  </button>
                  {tlSaveStep === 'done' && (
                    <span className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      {t('editor.tlSaved')}
                    </span>
                  )}
                  {tlSaveError && (
                    <span className="text-xs text-danger">{tlSaveError}</span>
                  )}
                </div>
              </div>
            )}

            {/* Saved timelines list */}
            <div>
              <h3 className="text-sm font-medium mb-2">{t('editor.tlSavedList')}</h3>
              {tlListLoading && (
                <div role="status" className="flex items-center gap-2 text-fg-muted">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="text-sm">{t('common.loadingDots')}</span>
                </div>
              )}
              {!tlListLoading && savedTimelines.length === 0 && (
                <p className="text-xs text-fg-muted">{t('editor.tlNoSaved')}</p>
              )}
              {savedTimelines.length > 0 && (
                <div className="space-y-1">
                  {savedTimelines.map(tl => (
                    <div key={tl.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-card p-2">
                      <span className="text-sm truncate min-w-0">{tl.name}</span>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => loadTimeline(tl.id)}
                          className="text-xs px-2 py-1 rounded text-brand-accent hover:underline"
                          aria-label={t('editor.tlLoad')}
                        >
                          {t('editor.tlLoad')}
                        </button>
                        <button
                          onClick={() => deleteTimeline(tl.id)}
                          className="text-xs px-2 py-1 rounded text-danger hover:underline"
                          aria-label={t('editor.tlDelete')}
                        >
                          {t('editor.tlDelete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {tlStep === 'idle' && !timeline && (
              <p className="text-sm text-fg-muted">{t('editor.tlNoTimeline')}</p>
            )}
          </section>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
