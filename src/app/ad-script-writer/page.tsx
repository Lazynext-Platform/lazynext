'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Clapperboard, Loader2, AlertCircle, Sparkles, Copy, Check, Clock, Eye, Mic, Film, Type } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { AdScriptWriterResult, AdScriptPlatform, AdScriptScene } from '@/lib/creative/ad-script-writer';

const CREDIT_COST = 5;

const PLATFORMS: AdScriptPlatform[] = ['tiktok', 'youtube', 'instagram'];

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [text]);
  if (!text) return null;
  return (
    <button
      onClick={onCopy}
      aria-label={`${t('adScriptWriter.copy')} ${label}`}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-hover transition"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? t('adScriptWriter.copied') : t('adScriptWriter.copy')}
    </button>
  );
}

function SceneCard({ scene }: { scene: AdScriptScene }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent text-xs font-bold w-6 h-6">
            {scene.id}
          </span>
          {t('adScriptWriter.scene')} {scene.id}
        </h3>
        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
          <Clock className="w-3 h-3" /> {scene.durationSec}s
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-fg-muted flex items-center gap-1"><Eye className="w-3 h-3" /> {t('adScriptWriter.visualDescription')}</span>
            <CopyButton text={scene.visualDescription} label={t('adScriptWriter.visualDescription')} />
          </div>
          <p className="text-sm whitespace-pre-wrap">{scene.visualDescription}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-fg-muted flex items-center gap-1"><Mic className="w-3 h-3" /> {t('adScriptWriter.voiceover')}</span>
            <CopyButton text={scene.voiceover} label={t('adScriptWriter.voiceover')} />
          </div>
          <p className="text-sm whitespace-pre-wrap">{scene.voiceover}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-fg-muted flex items-center gap-1"><Film className="w-3 h-3" /> {t('adScriptWriter.brollNotes')}</span>
            <CopyButton text={scene.brollNotes} label={t('adScriptWriter.brollNotes')} />
          </div>
          <p className="text-sm whitespace-pre-wrap">{scene.brollNotes}</p>
        </div>

        {scene.onScreenText && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-fg-muted flex items-center gap-1"><Type className="w-3 h-3" /> {t('adScriptWriter.onScreenText')}</span>
              <CopyButton text={scene.onScreenText} label={t('adScriptWriter.onScreenText')} />
            </div>
            <p className="text-sm whitespace-pre-wrap">{scene.onScreenText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdScriptWriterPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [source, setSource] = useState('');
  const [platform, setPlatform] = useState<AdScriptPlatform>('tiktok');
  const [durationSec, setDurationSec] = useState(30);
  const [useDuration, setUseDuration] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [tone, setTone] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdScriptWriterResult | null>(null);

  const generate = useCallback(async () => {
    if (!source.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const brandKit = {
        brandName: brandName.trim() || undefined,
        tone: tone.trim() ? tone.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        keywords: keywords.trim() ? keywords.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      const res = await fetch('/api/creative/ad-script-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          platform,
          durationSec: useDuration ? durationSec : undefined,
          brandKit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adScriptWriter.generate'));
      setResult(data.result as AdScriptWriterResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [source, platform, durationSec, useDuration, brandName, tone, keywords, t]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="skip-link">{t('common.skipToContent')}</a>
        <main id="main-content" className="mx-auto max-w-5xl px-4 py-8" tabIndex={-1}>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clapperboard className="w-6 h-6" /> {t('adScriptWriter.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('adScriptWriter.signInPrompt')}</p>
        </main>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  const fullScriptText = result
    ? [
        `${result.script.platform.toUpperCase()} AD SCRIPT`,
        `Hook: ${result.script.hook}`,
        `CTA: ${result.script.cta}`,
        `Total: ${result.script.totalDurationSec}s`,
        '',
        ...result.script.scenes.map(
          (s) =>
            `--- Scene ${s.id} (${s.durationSec}s) ---\nVisual: ${s.visualDescription}\nVO: ${s.voiceover}\nB-roll: ${s.brollNotes}\nOn-screen: ${s.onScreenText}`,
        ),
      ].join('\n')
    : '';

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="skip-link">{t('common.skipToContent')}</a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6" tabIndex={-1}>
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clapperboard className="w-6 h-6" /> {t('adScriptWriter.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('adScriptWriter.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aswSource" className="block text-sm font-medium mb-1">{t('adScriptWriter.productUrl')} / {t('adScriptWriter.briefText')}</label>
            <textarea id="aswSource" value={source} onChange={(e) => setSource(e.target.value)} placeholder={t('adScriptWriter.briefPlaceholder')} rows={4} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y" disabled={loading} />
          </div>

          <div>
            <label htmlFor="aswPlatform" className="block text-sm font-medium mb-1">{t('adScriptWriter.platform')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  disabled={loading}
                  aria-pressed={platform === p}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    platform === p
                      ? 'border-brand-accent bg-brand-accent/15 text-brand-accent'
                      : 'border-border bg-bg-card text-fg-muted hover:text-fg hover:bg-hover'
                  }`}
                >
                  {t(`adScriptWriter.${p}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('adScriptWriter.duration')}</label>
            <label className="flex items-center gap-2 text-sm text-fg-muted mb-2">
              <input
                type="checkbox"
                checked={useDuration}
                onChange={(e) => setUseDuration(e.target.checked)}
                disabled={loading}
                className="rounded border-border"
              />
              {t('adScriptWriter.setDuration')}
            </label>
            {useDuration && (
              <div className="flex items-center gap-3">
                <input
                  id="aswDuration"
                  type="range"
                  min={5}
                  max={120}
                  step={1}
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                  disabled={loading}
                  className="flex-1 accent-brand-accent"
                  aria-label={t('adScriptWriter.duration')}
                />
                <span className="text-sm font-medium w-16 text-right">{durationSec}s</span>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold">{t('adScriptWriter.brandKit')}</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="aswBrandName" className="block text-sm font-medium mb-1">{t('adScriptWriter.brandName')}</label>
                <input id="aswBrandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g., Acme" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="aswTone" className="block text-sm font-medium mb-1">{t('adScriptWriter.tone')}</label>
                <input id="aswTone" type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g., playful, bold" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="aswKeywords" className="block text-sm font-medium mb-1">{t('adScriptWriter.keywords')}</label>
                <input id="aswKeywords" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., quality, affordable" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={loading || !source.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adScriptWriter.generating') : `${t('adScriptWriter.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adScriptWriter.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adScriptWriter.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-bg-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-fg-muted">{t('adScriptWriter.hook')}</span>
                  <CopyButton text={result.script.hook} label={t('adScriptWriter.hook')} />
                </div>
                <p className="text-sm font-medium">{result.script.hook}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-fg-muted">{t('adScriptWriter.cta')}</span>
                  <CopyButton text={result.script.cta} label={t('adScriptWriter.cta')} />
                </div>
                <p className="text-sm">{result.script.cta}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-fg-muted"><Clock className="w-3 h-3" /> {result.script.totalDurationSec}s · {result.script.scenes.length} {t('adScriptWriter.scenes')}</span>
                <CopyButton text={fullScriptText} label={t('adScriptWriter.fullScript')} />
              </div>
            </div>

            <div className="space-y-3">
              {result.script.scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
