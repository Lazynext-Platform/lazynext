'use client';

import { useState, useCallback } from 'react';
import { BookOpen, Loader2, AlertCircle, Copy, Film, Users, Heart, Target, Clapperboard } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { NARRATIVE_STRUCTURES, GENRES, NARRATIVE_COST, type NarrativeStructure, type Genre, type NarrativeAdResult } from '@/lib/creative/narrative';

export function NarrativeAdBuilder() {
  const { t } = useI18n();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [structure, setStructure] = useState<NarrativeStructure>('three_act');
  const [genre, setGenre] = useState<Genre>('drama');
  const [targetAudience, setTargetAudience] = useState('');
  const [durationSec, setDurationSec] = useState(60);
  const [keyMessage, setKeyMessage] = useState('');
  const [tone, setTone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<NarrativeAdResult | null>(null);

  const generate = useCallback(async () => {
    if (!productName.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription: productDescription || undefined,
          brandName: brandName || undefined,
          structure,
          genre,
          targetAudience: targetAudience || undefined,
          durationSec,
          keyMessage: keyMessage || undefined,
          tone: tone || undefined,
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
  }, [productName, productDescription, brandName, structure, genre, targetAudience, durationSec, keyMessage, tone]);

  const copyScript = () => {
    if (result?.script) navigator.clipboard.writeText(result.script);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('narrative.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('narrative.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium mb-1">{t('narrative.productName')}</label>
          <input
            id="productName"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="productDesc" className="block text-sm font-medium mb-1">{t('narrative.productDescription')}</label>
          <textarea
            id="productDesc"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('narrative.structure')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t('narrative.structure')}>
            {NARRATIVE_STRUCTURES.map((s) => (
              <button
                key={s.type}
                role="radio"
                aria-checked={structure === s.type}
                onClick={() => setStructure(s.type)}
                className={`rounded-lg border p-2 text-left text-xs ${structure === s.type ? 'border-brand-accent bg-brand-accent/10' : 'border-border hover:bg-bg-secondary'}`}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-fg-muted mt-0.5 line-clamp-2">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('narrative.genre')}</label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('narrative.genre')}>
            {GENRES.map((g) => (
              <button
                key={g.type}
                role="radio"
                aria-checked={genre === g.type}
                onClick={() => setGenre(g.type)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${genre === g.type ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-border hover:bg-bg-secondary'}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="audience" className="block text-sm font-medium mb-1">{t('narrative.targetAudience')}</label>
            <input
              id="audience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium mb-1">{t('narrative.duration')}: {durationSec}s</label>
            <input
              id="duration"
              type="range"
              min="30"
              max="180"
              step="15"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="w-full"
              disabled={loading}
            />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !productName.trim()}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {loading ? t('narrative.generating') : `${t('narrative.generate')} (${NARRATIVE_COST} ${t('narrative.credits')})`}
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
            <h3 className="text-lg font-bold">{result.title}</h3>
            <p className="text-sm italic text-fg-muted mt-1">{result.logline}</p>
            <p className="text-xs text-fg-muted mt-2"><span className="font-medium">{t('narrative.theme')}:</span> {result.theme}</p>
            <p className="text-xs text-fg-muted"><span className="font-medium">{t('narrative.moral')}:</span> {result.moral}</p>
          </div>

          {result.characters.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Users className="w-4 h-4" /> {t('narrative.characters')}</h3>
              <div className="space-y-2">
                {result.characters.map((c, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{c.name}</span> <span className="text-xs text-fg-muted">({c.role})</span>
                    <p className="text-xs text-fg-muted">{c.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium">Motivation:</span> {c.motivation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3"><Film className="w-4 h-4" /> {t('narrative.scenes')}</h3>
            <div className="space-y-3">
              {result.scenes.map((s, i) => (
                <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('narrative.act')} {s.act} — {t('narrative.scene')} {s.sceneNumber}: {s.title}</span>
                    <span className="text-xs text-fg-muted">{s.durationSec}s</span>
                  </div>
                  <p className="text-xs text-fg-muted mt-1">{s.description}</p>
                  <p className="text-xs mt-1"><span className="text-fg-muted">Setting:</span> {s.setting} | <span className="text-fg-muted">Mood:</span> {s.mood}</p>
                  {s.dialogue && s.dialogue.length > 0 && (
                    <div className="text-xs mt-1 space-y-0.5">
                      {s.dialogue.map((d, j) => <p key={j}><span className="font-medium">{d.character}:</span> &ldquo;{d.line}&rdquo;</p>)}
                    </div>
                  )}
                  {s.voiceover && <p className="text-xs italic mt-1">VO: {s.voiceover}</p>}
                  <p className="text-xs text-fg-muted mt-1">Camera: {s.cameraAngle} → {s.transitionTo}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium flex items-center gap-2 mb-2"><Target className="w-4 h-4" /> {t('narrative.productIntegration')}</h3>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Placement:</span> {result.productIntegration.placement}</p>
              <p><span className="font-medium">Reveal:</span> {result.productIntegration.revealType}</p>
              <p><span className="font-medium">CTA:</span> {result.productIntegration.ctaPlacement}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium flex items-center gap-2"><Clapperboard className="w-4 h-4" /> {t('narrative.script')}</h3>
              <button onClick={copyScript} className="text-xs text-brand-accent hover:opacity-80 flex items-center gap-1">
                <Copy className="w-3 h-3" /> {t('narrative.copyScript')}
              </button>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-bg-secondary p-3 rounded-lg max-h-96 overflow-y-auto">{result.script}</pre>
          </div>

          {result.adaptationNotes && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-2">{t('narrative.adaptationNotes')}</h3>
              <p className="text-sm text-fg-muted">{result.adaptationNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
