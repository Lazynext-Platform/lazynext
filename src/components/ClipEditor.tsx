'use client';

import { useState, useCallback, useEffect } from 'react';
import { Scissors, Loader2, AlertCircle, Plus, Trash2, Mic, Volume2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import {
  createClip,
  formatTimecode,
  calculateTotalDuration,
  type Clip,
  type ClipEditResult,
} from '@/lib/creative/clip-editor';

export function ClipEditor({ initialMediaUrl, pipelineId }: { initialMediaUrl?: string; pipelineId?: string } = {}) {
  const { t } = useI18n();
  const [clips, setClips] = useState<Clip[]>([
    createClip({ name: 'Intro', type: 'video', duration: 5 }),
    createClip({ name: 'Product Demo', type: 'video', duration: 10 }),
    createClip({ name: 'CTA', type: 'video', duration: 3 }),
  ]);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ClipEditResult | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaResult, setMediaResult] = useState<string>('');

  // Pre-load media from pipeline handoff (e.g. /clip-editor?pipelineId=...&mediaUrl=...)
  useEffect(() => {
    if (initialMediaUrl) {
      setMediaResult(initialMediaUrl);
      setMediaLoading(false);
    }
  }, [initialMediaUrl]);

  // Load the pipeline EDL/cutPlan when pipelineId is provided
  useEffect(() => {
    if (!pipelineId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/creative/pipeline/${pipelineId}`);
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 404) setError(t('common.errNotFound'));
          else if (res.status === 401) setError(t('common.errUnauthorized'));
          else if (res.status === 403) setError(t('common.errForbidden'));
          else setError(t('common.errGeneric'));
          return;
        }
        const j = await res.json().catch(() => ({}));
        const state = j?.state;
        if (!state || cancelled) return;
        // Find the edit stage result
        const editResult = state.stageResults?.find(
          (r: { stage: string; status: string; output?: { editResult?: Record<string, unknown> } }) =>
            r.stage === 'edit' && r.status === 'completed',
        )?.output?.editResult;
        if (!editResult || cancelled) return;
        // Load the media URL from the edit result if not already set
        if (!initialMediaUrl && editResult.finalMediaUrl) {
          setMediaResult(editResult.finalMediaUrl as string);
        }
        // Transform the cutPlan into clips
        const cutPlan = editResult.cutPlan;
        if (Array.isArray(cutPlan) && cutPlan.length > 0) {
          const loadedClips = cutPlan.map((cut: Record<string, unknown>, idx: number) =>
            createClip({
              name: (cut.label as string) || (cut.name as string) || `Cut ${idx + 1}`,
              type: (cut.mediaType as 'video' | 'audio' | 'image' | 'text' | 'transition' | 'effect') || 'video',
              duration: (cut.durationSec as number) || (cut.duration as number) || 5,
              source: (cut.mediaUrl as string) || (editResult.finalMediaUrl as string) || '',
            }),
          );
          if (!cancelled && loadedClips.length > 0) {
            setClips(loadedClips);
          }
        }
      } catch {
        if (!cancelled) setError(t('common.errNetwork'));
      }
    })();
    return () => { cancelled = true; };
  }, [pipelineId, initialMediaUrl, t]);

  const executeCommand = useCallback(async () => {
    if (!command.trim()) { setError(t('clipEditor.commandRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/clip-editor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, clips }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
      if (data.result.clips) setClips(data.result.clips);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [command, clips, t]);

  const addClip = useCallback(() => {
    setClips((prev) => [...prev, createClip({ name: `Clip ${prev.length + 1}`, type: 'video', duration: 5 })]);
  }, []);

  const removeClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Cross-feature integration: clip-editor → media-service-boundary (ASR/TTS)
  const transcribeClips = useCallback(async () => {
    setMediaLoading(true); setMediaResult(''); setError('');
    try {
      const res = await fetch('/api/creative/media-service-boundary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability: 'asr', input: { text: clips.map((c) => c.label || c.name).join(' ') } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMediaResult(`ASR: ${data.result?.result?.transcript || 'No transcript'}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMediaLoading(false);
    }
  }, [clips]);

  const generateVoiceover = useCallback(async () => {
    setMediaLoading(true); setMediaResult(''); setError('');
    try {
      const text = clips.map((c) => c.label || c.name).join('. ');
      const res = await fetch('/api/creative/media-service-boundary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability: 'tts', input: { text } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMediaResult(`TTS: ${data.result?.result?.duration || 0}s audio generated (dry-run)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMediaLoading(false);
    }
  }, [clips]);

  const totalDuration = calculateTotalDuration(clips);
  const clipTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'text-brand-accent';
      case 'audio': return 'text-success';
      case 'image': return 'text-warning';
      case 'text': return 'text-info';
      case 'transition': return 'text-fg-muted';
      case 'effect': return 'text-danger';
      default: return 'text-fg';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Scissors className="w-5 h-5" /> {t('clipEditor.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('clipEditor.subtitle')}</p>
      </div>

      {/* Clip timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('clipEditor.timeline')}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">{t('clipEditor.totalDuration')}: {formatTimecode(totalDuration)}</span>
            <button onClick={addClip} className="inline-flex items-center gap-1 rounded-lg bg-brand-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90" aria-label={t('clipEditor.addClip')}>
              <Plus className="w-3 h-3" /> {t('clipEditor.addClip')}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {clips.map((clip, i) => (
            <div key={clip.id} className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2">
              <span className="text-xs font-mono text-fg-muted w-6">{i + 1}</span>
              <span className={`text-xs font-medium ${clipTypeColor(clip.type)} uppercase`}>{clip.type}</span>
              <span className="text-sm flex-1 truncate">{clip.label || clip.name}</span>
              <span className="text-xs font-mono text-fg-muted">{formatTimecode(clip.startTime)}–{formatTimecode(clip.endTime)}</span>
              <span className="text-xs text-fg-muted">{clip.duration.toFixed(1)}s</span>
              <button onClick={() => removeClip(clip.id)} className="text-fg-muted hover:text-danger" aria-label={`${t('clipEditor.removeClip')} ${clip.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {clips.length === 0 && (
            <p className="text-sm text-fg-muted text-center py-4">{t('clipEditor.noClips')}</p>
          )}
        </div>
      </div>

      {/* Command input */}
      <div className="space-y-2">
        <label htmlFor="ce-command" className="block text-sm font-medium">{t('clipEditor.commandLabel')}</label>
        <div className="flex gap-2">
          <input
            id="ce-command"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) executeCommand(); }}
            placeholder={t('clipEditor.commandPlaceholder')}
            className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
            aria-label={t('clipEditor.commandLabel')}
          />
          <button
            onClick={executeCommand}
            disabled={loading || !command.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            aria-label={t('clipEditor.execute')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
            {t('clipEditor.execute')}
          </button>
        </div>
        <p className="text-xs text-fg-muted">{t('clipEditor.commandHint')}</p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3 rounded-lg border border-border bg-bg-secondary p-4">
          <div className="flex items-center gap-2">
            {result.success ? (
              <span className="text-success text-sm font-medium">{t('clipEditor.applied')}</span>
            ) : (
              <span className="text-warning text-sm font-medium">{t('clipEditor.failed')}</span>
            )}
          </div>
          <p className="text-sm">{result.description}</p>
          {result.affectedClipIds.length > 0 && (
            <p className="text-xs text-fg-muted">{t('clipEditor.affectedClips')}: {result.affectedClipIds.length}</p>
          )}
        </div>
      )}

      {/* Example commands */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('clipEditor.examples')}</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'trim first 2 seconds',
            'split at 0:05',
            'delete clip 2',
            'merge all clips',
            'duplicate clip 1',
            'speed up clip 2 by 2x',
          ].map((ex) => (
            <button
              key={ex}
              onClick={() => setCommand(ex)}
              className="rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs text-fg-muted hover:border-brand-accent hover:text-brand-accent"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Cross-feature integration: media service boundary (ASR/TTS) */}
      <div className="space-y-3 rounded-lg border border-border bg-bg-secondary p-4">
        <h3 className="text-sm font-medium">{t('clipEditor.mediaServices')}</h3>
        <p className="text-xs text-fg-muted">{t('clipEditor.mediaServicesHint')}</p>
        <div className="flex gap-2">
          <button
            onClick={transcribeClips}
            disabled={mediaLoading || clips.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium hover:border-brand-accent disabled:opacity-50"
            aria-label={t('clipEditor.transcribe')}
          >
            {mediaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
            {t('clipEditor.transcribe')}
          </button>
          <button
            onClick={generateVoiceover}
            disabled={mediaLoading || clips.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium hover:border-brand-accent disabled:opacity-50"
            aria-label={t('clipEditor.voiceover')}
          >
            {mediaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
            {t('clipEditor.voiceover')}
          </button>
        </div>
        {mediaResult && (
          <div role="status" className="text-xs text-success rounded bg-success/10 px-2 py-1.5">
            {mediaResult}
          </div>
        )}
      </div>
    </div>
  );
}
