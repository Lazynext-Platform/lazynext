'use client';

import { useState, useCallback } from 'react';
import {
  Smartphone, Monitor, X, Loader2, AlertCircle, Check, Globe,
  Play, Share2, ThumbsUp, Sparkles,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface PlatformAdaptation {
  platform: string;
  format: string;
  aspectRatio: string;
  maxDurationSec: number;
  hook: string;
  scriptSummary: string;
  cta: string;
  visualDirection: string;
  platformSpecificNotes: string;
}

interface AdaptationResult {
  adaptations: PlatformAdaptation[];
  originalPlatform: string;
  notes: string;
}

const PLATFORM_ICONS: Record<string, typeof Smartphone> = {
  tiktok: Smartphone,
  instagram: Share2,
  youtube: Play,
  facebook: ThumbsUp,
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: '#000000',
  instagram: '#E1306C',
  youtube: '#FF0000',
  facebook: '#1877F2',
};

const ALL_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'];

interface MultiPlatformAdapterModalProps {
  open: boolean;
  onClose: () => void;
  brief: unknown;
  script: unknown;
  onApply?: (adaptation: PlatformAdaptation) => void;
}

export function MultiPlatformAdapterModal({
  open, onClose, brief, script, onApply,
}: MultiPlatformAdapterModalProps) {
  const { t } = useI18n();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdaptationResult | null>(null);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const adapt = useCallback(async () => {
    if (!brief || !script || selectedPlatforms.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/adapt-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, script, targetPlatforms: selectedPlatforms }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'failed');
      }
      const data = await res.json();
      setResult(data.result as AdaptationResult);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [brief, script, selectedPlatforms]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('platformAdapter.title')}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-brand-accent" />
            <h2 className="text-lg font-bold">{t('platformAdapter.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-faint hover:bg-app hover:text-fg"
            aria-label={t('platformAdapter.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-fg-faint">{t('platformAdapter.subtitle')}</p>

        {!result && !loading && !error && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-bold text-fg">{t('platformAdapter.selectPlatforms')}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ALL_PLATFORMS.map((platform) => {
                  const Icon = PLATFORM_ICONS[platform] || Smartphone;
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition ${
                        isSelected
                          ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                          : 'border-line bg-app text-fg-faint hover:bg-surface'
                      }`}
                    >
                      <Icon className="h-6 w-6" style={{ color: isSelected ? PLATFORM_COLORS[platform] : undefined }} />
                      <span className="capitalize">{platform}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedPlatforms.length > 0 && (
              <div className="rounded-lg border border-line bg-app p-3 text-xs text-fg-faint">
                {t('platformAdapter.costNote').replace('{0}', String(4 * selectedPlatforms.length))}
              </div>
            )}

            <button
              onClick={adapt}
              disabled={selectedPlatforms.length === 0}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              {t('platformAdapter.adapt')} ({4 * selectedPlatforms.length} {t('platformAdapter.credits')})
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
            <p className="text-sm text-fg-faint">{t('platformAdapter.adapting')}</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('platformAdapter.error')}: {error}</span>
            </div>
            <button onClick={adapt} className="mt-2 text-xs underline">
              {t('platformAdapter.retry')}
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.notes && (
              <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-brand-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('platformAdapter.overallNotes')}
                </div>
                <p className="text-xs text-fg">{result.notes}</p>
              </div>
            )}

            <div className="text-xs font-bold text-fg">
              {t('platformAdapter.originalPlatform')}: <span className="capitalize text-brand-accent">{result.originalPlatform}</span>
            </div>

            {result.adaptations.map((adaptation) => {
              const Icon = PLATFORM_ICONS[adaptation.platform] || Smartphone;
              return (
                <div key={adaptation.platform} className="rounded-xl border border-line bg-app p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color: PLATFORM_COLORS[adaptation.platform] }} />
                      <span className="text-sm font-bold capitalize text-fg">{adaptation.platform}</span>
                      <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium text-fg-faint">
                        {adaptation.aspectRatio}
                      </span>
                      <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium text-fg-faint">
                        {adaptation.maxDurationSec}s max
                      </span>
                    </div>
                    {onApply && (
                      <button
                        onClick={() => { onApply(adaptation); onClose(); }}
                        className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                      >
                        {t('platformAdapter.useThis')} <Sparkles className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-fg">{t('platformAdapter.hook')}:</span>
                      <p className="mt-0.5 text-fg">{adaptation.hook}</p>
                    </div>
                    <div>
                      <span className="font-medium text-fg">{t('platformAdapter.scriptSummary')}:</span>
                      <p className="mt-0.5 text-fg-faint">{adaptation.scriptSummary}</p>
                    </div>
                    <div>
                      <span className="font-medium text-fg">{t('platformAdapter.cta')}:</span>
                      <span className="ml-1 text-fg">{adaptation.cta}</span>
                    </div>
                    <div>
                      <span className="font-medium text-fg">{t('platformAdapter.visualDirection')}:</span>
                      <p className="mt-0.5 text-fg-faint">{adaptation.visualDirection}</p>
                    </div>
                    <div className="rounded-lg border border-brand-accent/20 bg-brand-accent/5 p-2">
                      <span className="font-medium text-brand-accent">{t('platformAdapter.platformNotes')}:</span>
                      <p className="mt-0.5 text-fg-faint">{adaptation.platformSpecificNotes}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={adapt}
              disabled={loading}
              className="w-full rounded-lg border border-line bg-app px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('platformAdapter.readapt')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
