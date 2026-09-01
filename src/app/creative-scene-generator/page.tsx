'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Clapperboard,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CreativeSceneGeneratorResult,
  SceneDescription,
  ShotType,
  CameraAngle,
  Lighting,
  Location,
} from '@/lib/creative/creative-scene-generator';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const LOCATIONS: Location[] = ['studio', 'outdoor', 'home', 'office', 'retail'];

const SHOT_TYPE_COLORS: Record<ShotType, string> = {
  wide: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  'close-up': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  overhead: 'bg-success/20 text-success border-success/30',
  panning: 'bg-warning/20 text-warning border-warning/30',
};

const LIGHTING_COLORS: Record<Lighting, string> = {
  natural: 'bg-success/20 text-success border-success/30',
  studio: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dramatic: 'bg-danger/20 text-danger border-danger/30',
  soft: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function CreativeSceneGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [concept, setConcept] = useState('');
  const [sceneCount, setSceneCount] = useState<number>(5);
  const [location, setLocation] = useState<Location | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreativeSceneGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    if (!concept.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-scene-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          concept,
          sceneCount,
          location: location || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeSceneGenerator.error'));
      setResult(data.result as CreativeSceneGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, concept, sceneCount, location, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('creativeSceneGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clapperboard className="w-6 h-6" /> {t('creativeSceneGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeSceneGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeSceneGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clapperboard className="w-6 h-6" /> {t('creativeSceneGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeSceneGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="csgProduct" className="block text-sm font-medium mb-1">
              {t('creativeSceneGenerator.productOrBrand')}
            </label>
            <textarea
              id="csgProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeSceneGenerator.platform')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    platform === p
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="csgConcept" className="block text-sm font-medium mb-1">
              {t('creativeSceneGenerator.concept')}
            </label>
            <textarea
              id="csgConcept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g., A before-and-after transformation showing the product's real results"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="csgSceneCount" className="block text-sm font-medium mb-1">
                {t('creativeSceneGenerator.sceneCount')}
              </label>
              <input
                id="csgSceneCount"
                type="number"
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                min={3}
                max={8}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('creativeSceneGenerator.location')}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLocation('')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    location === ''
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {t('creativeSceneGenerator.anyLocation')}
                </button>
                {LOCATIONS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLocation(l)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      location === l
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !concept.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeSceneGenerator.generating') : `${t('creativeSceneGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeSceneGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeSceneGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeSceneGenerator.dryRunNotice')}
              </div>
            )}

            {/* Total duration summary */}
            <div className="rounded-lg border border-border bg-bg-card px-4 py-3 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-brand-accent" />
              <span className="text-fg-muted">{t('creativeSceneGenerator.totalDuration')}:</span>{' '}
              <span className="font-medium">{result.totalDuration}s</span>
              <span className="text-fg-muted ml-2">({result.scenes.length} {t('creativeSceneGenerator.scenes')})</span>
            </div>

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('creativeSceneGenerator.copied') : t('creativeSceneGenerator.copy')}
              </button>
            </div>

            {/* Scene cards */}
            <div className="space-y-3">
              {result.scenes.map((scene: SceneDescription, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold">
                      {scene.sceneNumber}
                    </span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SHOT_TYPE_COLORS[scene.shotType] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {scene.shotType}
                    </span>
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                      {scene.cameraAngle}
                    </span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${LIGHTING_COLORS[scene.lighting] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {scene.lighting}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-fg-muted">
                      <Clock className="w-3 h-3" /> {scene.duration}s
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-fg-muted">{t('creativeSceneGenerator.setting')}:</span>{' '}
                      <span className="font-medium">{scene.setting}</span>
                    </div>
                    {scene.props.length > 0 && (
                      <div>
                        <span className="text-fg-muted">{t('creativeSceneGenerator.props')}:</span>{' '}
                        <span className="font-medium">{scene.props.join(', ')}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-fg-muted">{t('creativeSceneGenerator.actorNotes')}:</span>{' '}
                      <span className="font-medium">{scene.actorNotes}</span>
                    </div>
                    {scene.dialogue && (
                      <div>
                        <span className="text-fg-muted">{t('creativeSceneGenerator.dialogue')}:</span>{' '}
                        <span className="font-medium italic">&ldquo;{scene.dialogue}&rdquo;</span>
                      </div>
                    )}
                    <div>
                      <span className="text-fg-muted">{t('creativeSceneGenerator.mood')}:</span>{' '}
                      <span className="font-medium">{scene.mood}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
