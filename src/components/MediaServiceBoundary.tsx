'use client';

import { useState, useCallback, useEffect } from 'react';
import { Server, Loader2, AlertCircle, Cpu, Mic, Image, Volume2, Scan, Video, AudioLines } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { MediaServiceRegistry, MediaServiceOutput, MediaCapability } from '@/lib/creative/media-service-boundary';

const CAPABILITY_ICONS: Record<MediaCapability, typeof Cpu> = {
  asr: Mic,
  tts: Volume2,
  ocr: Scan,
  image_edit: Image,
  audio_process: Volume2,
  voice_clone: Mic,
  video_gen: Video,
  lip_sync: AudioLines,
};

const STATUS_COLORS: Record<string, string> = {
  available: 'text-success',
  dry_run: 'text-warning',
  unavailable: 'text-danger',
  coming_soon: 'text-fg-muted',
};

export function MediaServiceBoundary() {
  const { t } = useI18n();
  const [registry, setRegistry] = useState<MediaServiceRegistry | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<MediaCapability>('asr');
  const [inputUrl, setInputUrl] = useState('');
  const [inputText, setInputText] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MediaServiceOutput | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/creative/media-service-boundary')
      .then((r) => r.json())
      .then((data) => setRegistry(data.registry))
      .catch(() => {});
  }, []);

  const execute = useCallback(async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/media-service-boundary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: selectedCapability,
          input: { url: inputUrl || undefined, text: inputText || undefined, editInstruction: editInstruction || undefined },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedCapability, inputUrl, inputText, editInstruction]);

  const needsUrl = ['asr', 'ocr', 'image_edit', 'audio_process', 'voice_clone', 'lip_sync'].includes(selectedCapability);
  const needsText = ['tts', 'voice_clone', 'video_gen'].includes(selectedCapability);
  const needsEdit = selectedCapability === 'image_edit';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Server className="w-5 h-5" /> {t('mediaService.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('mediaService.subtitle')}</p>
      </div>

      {/* Service registry */}
      {registry && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('mediaService.registry')}</h3>
            <div className="flex gap-4 text-xs text-fg-muted">
              <span>{t('mediaService.total')}: {registry.totalCapabilities}</span>
              <span className="text-success">{t('mediaService.available')}: {registry.availableCount}</span>
              <span className="text-warning">{t('mediaService.dryRun')}: {registry.dryRunCount}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {registry.services.map((svc) => {
              const Icon = CAPABILITY_ICONS[svc.capability] || Cpu;
              return (
                <button
                  key={svc.capability}
                  onClick={() => setSelectedCapability(svc.capability)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selectedCapability === svc.capability ? 'border-brand-accent bg-brand-accent/5' : 'border-border bg-bg-secondary hover:border-brand-accent/50'
                  }`}
                  aria-label={svc.name}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{svc.name}</span>
                      <span className={`text-xs ${STATUS_COLORS[svc.status]}`}>{svc.status}</span>
                    </div>
                    <p className="text-xs text-fg-muted truncate">{svc.description}</p>
                    <div className="flex gap-3 mt-1 text-xs text-fg-muted">
                      <span>{svc.creditCost} {t('mediaService.credits')}</span>
                      {svc.requirements.gpu && <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> GPU {svc.requirements.minVram}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input form */}
      <div className="space-y-3 rounded-lg border border-border bg-bg-secondary p-4">
        <h3 className="text-sm font-medium">{t('mediaService.testCapability')}</h3>
        {needsUrl && (
          <div>
            <label htmlFor="ms-url" className="block text-xs font-medium mb-1">{t('mediaService.mediaUrl')}</label>
            <input
              id="ms-url" type="url" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://example.com/media.mp4"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
              aria-label={t('mediaService.mediaUrl')}
            />
          </div>
        )}
        {needsText && (
          <div>
            <label htmlFor="ms-text" className="block text-xs font-medium mb-1">{t('mediaService.textInput')}</label>
            <textarea
              id="ms-text" value={inputText} onChange={(e) => setInputText(e.target.value)} rows={3}
              placeholder={t('mediaService.textPlaceholder')}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
              aria-label={t('mediaService.textInput')}
            />
          </div>
        )}
        {needsEdit && (
          <div>
            <label htmlFor="ms-edit" className="block text-xs font-medium mb-1">{t('mediaService.editInstruction')}</label>
            <input
              id="ms-edit" type="text" value={editInstruction} onChange={(e) => setEditInstruction(e.target.value)}
              placeholder={t('mediaService.editPlaceholder')}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
              aria-label={t('mediaService.editInstruction')}
            />
          </div>
        )}
        <button
          onClick={execute} disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          aria-label={t('mediaService.execute')}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
          {t('mediaService.execute')}
        </button>
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
            <span className="text-sm font-medium">{result.capability}</span>
            {result.dryRun && <span className="text-xs text-warning rounded-full bg-warning/10 px-2 py-0.5">{t('mediaService.dryRunBadge')}</span>}
          </div>
          <div className="text-xs text-fg-muted space-y-1">
            <p>{t('mediaService.model')}: {result.metadata.modelUsed}</p>
            <p>{t('mediaService.processingTime')}: {result.metadata.processingTime}ms</p>
            <p>{t('mediaService.version')}: {result.metadata.serviceVersion}</p>
          </div>
          {result.metadata.warnings.length > 0 && (
            <div className="text-xs text-warning">
              {result.metadata.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-fg-muted">{t('mediaService.rawOutput')}</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-bg p-2 text-xs">{JSON.stringify(result.result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
