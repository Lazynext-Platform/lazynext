'use client';

import { useState, useCallback } from 'react';
import { ImageIcon, X, Loader2, AlertCircle, Download, Sparkles, Wand2, Crop, Palette, Sun, Layers } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { getEnhancementTypes, ENHANCEMENT_COSTS, type ImageEnhancementType, type ProductImageResult } from '@/lib/creative/product-image';

const ENHANCEMENT_ICONS: Record<ImageEnhancementType, React.ComponentType<{ className?: string }>> = {
  background_removal: Sparkles,
  scene_generation: ImageIcon,
  lifestyle_context: Layers,
  multi_angle: Wand2,
  color_correction: Palette,
  shadow_addition: Sun,
  reflection: Sun,
  resize_crop: Crop,
};

export function ProductImageStudio() {
  const { t } = useI18n();
  const [imageUrl, setImageUrl] = useState('');
  const [enhancementType, setEnhancementType] = useState<ImageEnhancementType>('background_removal');
  const [sceneDescription, setSceneDescription] = useState('');
  const [lifestyleContext, setLifestyleContext] = useState('kitchen');
  const [angleType, setAngleType] = useState('front');
  const [outputFormat, setOutputFormat] = useState('png');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProductImageResult | null>(null);

  const enhancementTypes = getEnhancementTypes();

  const enhance = useCallback(async () => {
    if (!imageUrl.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/product-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          enhancementType,
          sceneDescription: sceneDescription || undefined,
          lifestyleContext: lifestyleContext || undefined,
          angleType: angleType || undefined,
          outputFormat,
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
  }, [imageUrl, enhancementType, sceneDescription, lifestyleContext, angleType, outputFormat]);

  const cost = ENHANCEMENT_COSTS[enhancementType];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          {t('productImage.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('productImage.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">{t('productImage.imageUrl')}</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('productImage.enhancementType')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t('productImage.enhancementType')}>
            {enhancementTypes.map((et) => {
              const Icon = ENHANCEMENT_ICONS[et.type] || Sparkles;
              return (
                <button
                  key={et.type}
                  role="radio"
                  aria-checked={enhancementType === et.type}
                  onClick={() => setEnhancementType(et.type)}
                  className={`rounded-lg border p-3 text-left text-xs ${enhancementType === et.type ? 'border-brand-accent bg-brand-accent/10' : 'border-border hover:bg-bg-secondary'}`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <div className="font-medium">{et.name}</div>
                  <div className="text-fg-muted mt-0.5">{et.cost} {t('productImage.credits')}</div>
                </button>
              );
            })}
          </div>
        </div>

        {enhancementType === 'scene_generation' && (
          <div>
            <label htmlFor="sceneDesc" className="block text-sm font-medium mb-1">{t('productImage.sceneDescription')}</label>
            <textarea
              id="sceneDesc"
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              placeholder="e.g., Modern minimalist studio with soft lighting..."
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>
        )}

        {enhancementType === 'lifestyle_context' && (
          <div>
            <label htmlFor="lifestyleCtx" className="block text-sm font-medium mb-1">{t('productImage.lifestyleContext')}</label>
            <select
              id="lifestyleCtx"
              value={lifestyleContext}
              onChange={(e) => setLifestyleContext(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            >
              <option value="kitchen">Kitchen</option>
              <option value="office">Office</option>
              <option value="outdoor">Outdoor</option>
              <option value="studio">Studio</option>
              <option value="retail">Retail</option>
              <option value="home">Home</option>
            </select>
          </div>
        )}

        {enhancementType === 'multi_angle' && (
          <div>
            <label htmlFor="angleType" className="block text-sm font-medium mb-1">{t('productImage.angleType')}</label>
            <select
              id="angleType"
              value={angleType}
              onChange={(e) => setAngleType(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            >
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="top">Top</option>
              <option value="detail">Detail</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="outputFormat" className="block text-sm font-medium mb-1">{t('productImage.outputFormat')}</label>
          <select
            id="outputFormat"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="w-32 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <button
          onClick={enhance}
          disabled={loading || !imageUrl.trim()}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? t('productImage.enhancing') : `${t('productImage.enhance')} (${cost} ${t('productImage.credits')})`}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium mb-3">{t('productImage.result')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-fg-muted mb-1">{t('productImage.original')}</p>
                <img src={result.originalUrl} alt="Original" className="w-full rounded-lg border border-border" />
              </div>
              <div>
                <p className="text-xs text-fg-muted mb-1">{t('productImage.enhanced')}</p>
                <img src={result.enhancedImageUrl} alt="Enhanced" className="w-full rounded-lg border border-border" />
              </div>
            </div>
            <div className="mt-3 text-sm space-y-1">
              <p><span className="font-medium">{t('productImage.dimensions')}:</span> {result.metadata.width}x{result.metadata.height}</p>
              <p><span className="font-medium">{t('productImage.format')}:</span> {result.metadata.format}</p>
              <p className="text-fg-muted">{result.processingNotes}</p>
            </div>
            <a href={result.enhancedImageUrl} download className="mt-3 inline-flex items-center gap-1 text-sm text-brand-accent hover:opacity-80">
              <Download className="w-4 h-4" /> {t('productImage.download')}
            </a>
          </div>

          {result.variants && result.variants.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('productImage.variants')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {result.variants.map((v, i) => (
                  <div key={i} className="text-center">
                    <img src={v.url} alt={v.angle} className="w-full rounded-lg border border-border" />
                    <p className="text-xs mt-1 font-medium">{v.angle}</p>
                    <p className="text-xs text-fg-muted">{v.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
