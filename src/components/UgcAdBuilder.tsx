'use client';

import { useCallback, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  MessageSquareQuote,
  Eye,
  PackageOpen,
  ArrowLeftRight,
  GraduationCap,
  Star,
  Scale,
  Music2,
  Video,
  Hash,
  Copy,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

// ── Types matching the backend ──
type UgcFormatType =
  | 'testimonial' | 'reaction' | 'unboxing' | 'before_after'
  | 'tutorial' | 'review' | 'comparison';

type PlatformFormat = 'tiktok' | 'reels' | 'shorts' | 'snapchat' | 'facebook_story';

type CreatorPersona =
  | 'enthusiastic_customer' | 'expert_reviewer' | 'casual_user'
  | 'influencer' | 'everyday_person';

type UgcScene = {
  sceneNumber: number;
  durationSec: number;
  shotType: string;
  description: string;
  textOverlay?: string;
  voiceover?: string;
  bRoll?: string;
};

type UgcAdResult = {
  format: UgcFormatType;
  platform: PlatformFormat;
  persona: CreatorPersona;
  scenes: UgcScene[];
  hookText: string;
  scriptText: string;
  captionText: string;
  hashtags: string[];
  callToAction: string;
  estimatedDurationSec: number;
  visualNotes: string;
  audioNotes: string;
};

type Step = 'idle' | 'loading' | 'done' | 'error';

const UGC_COST = 4;

const FORMAT_OPTIONS: Array<{ value: UgcFormatType; label: string; icon: typeof MessageSquareQuote }> = [
  { value: 'testimonial', label: 'Testimonial', icon: MessageSquareQuote },
  { value: 'reaction', label: 'Reaction', icon: Eye },
  { value: 'unboxing', label: 'Unboxing', icon: PackageOpen },
  { value: 'before_after', label: 'Before / After', icon: ArrowLeftRight },
  { value: 'tutorial', label: 'Tutorial', icon: GraduationCap },
  { value: 'review', label: 'Review', icon: Star },
  { value: 'comparison', label: 'Comparison', icon: Scale },
];

const PLATFORM_OPTIONS: Array<{ value: PlatformFormat; label: string }> = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'reels', label: 'Reels' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'facebook_story', label: 'FB Story' },
];

const PERSONA_OPTIONS: Array<{ value: CreatorPersona; label: string }> = [
  { value: 'enthusiastic_customer', label: 'Enthusiastic Customer' },
  { value: 'expert_reviewer', label: 'Expert Reviewer' },
  { value: 'casual_user', label: 'Casual User' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'everyday_person', label: 'Everyday Person' },
];

// ── Helpers ──
async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail ? `${j.error || 'error'}: ${j.detail}` : (j.error || 'failed'));
  return j as Record<string, unknown>;
}

function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

export function UgcAdBuilder() {
  const { t } = useI18n();

  // Form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [format, setFormat] = useState<UgcFormatType>('testimonial');
  const [platform, setPlatform] = useState<PlatformFormat>('tiktok');
  const [persona, setPersona] = useState<CreatorPersona>('enthusiastic_customer');
  const [durationSec, setDurationSec] = useState(30);
  const [keyBenefits, setKeyBenefits] = useState('');
  const [brandName, setBrandName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Result state
  const [step, setStep] = useState<Step>('idle');
  const [result, setResult] = useState<UgcAdResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback((id: string, text: string) => {
    copyToClipboard(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!productName.trim()) return;
    setStep('loading');
    setError('');
    setResult(null);
    try {
      const benefits = keyBenefits
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = {
        productName: productName.trim(),
        format,
        platform,
        persona,
        durationSec,
      };
      if (productDescription.trim()) body.productDescription = productDescription.trim();
      if (brandName.trim()) body.brandName = brandName.trim();
      if (targetAudience.trim()) body.targetAudience = targetAudience.trim();
      if (benefits.length) body.keyBenefits = benefits;

      const j = await postJson('/api/creative/ugc', body);
      setResult(j.result as UgcAdResult);
      setStep('done');
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setStep('error');
    }
  }, [productName, format, platform, persona, durationSec, productDescription, brandName, targetAudience, keyBenefits]);

  const isLoading = step === 'loading';

  return (
    <div className="space-y-6">
      {/* ── Input form ── */}
      <section
        aria-label="UGC ad configuration"
        className="rounded-2xl border border-line bg-surface p-4 sm:p-6"
      >
        <h2 className="text-base font-bold text-fg">{t('ugcStudio.configTitle')}</h2>
        <p className="mt-1 text-xs text-fg-faint">
          {t('ugcStudio.configDesc')}
        </p>

        <div className="mt-4 space-y-5">
          {/* Product name */}
          <div>
            <label htmlFor="ugc-product-name" className="text-xs font-medium text-fg-faint">
              {t('ugcStudio.productName')} <span className="text-danger">*</span>
            </label>
            <input
              id="ugc-product-name"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              maxLength={300}
              placeholder={t('ugcStudio.phProductName')}
              aria-required="true"
              className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
            />
          </div>

          {/* Product description */}
          <div>
            <label htmlFor="ugc-product-desc" className="text-xs font-medium text-fg-faint">
              {t('ugcStudio.productDescription')}
            </label>
            <textarea
              id="ugc-product-desc"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t('ugcStudio.phProductDescription')}
              className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none resize-y"
            />
          </div>

          {/* Brand + audience */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ugc-brand" className="text-xs font-medium text-fg-faint">
                {t('ugcStudio.brandName')}
              </label>
              <input
                id="ugc-brand"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ugc-audience" className="text-xs font-medium text-fg-faint">
                {t('ugcStudio.targetAudience')}
              </label>
              <input
                id="ugc-audience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                maxLength={300}
                placeholder={t('ugcStudio.phTargetAudience')}
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Key benefits */}
          <div>
            <label htmlFor="ugc-benefits" className="text-xs font-medium text-fg-faint">
              {t('ugcStudio.keyBenefits')}
            </label>
            <input
              id="ugc-benefits"
              type="text"
              value={keyBenefits}
              onChange={(e) => setKeyBenefits(e.target.value)}
              placeholder={t('ugcStudio.phKeyBenefits')}
              className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
            />
          </div>

          {/* Format type selector */}
          <div>
            <span className="text-xs font-medium text-fg-faint" id="ugc-format-label">
              {t('ugcStudio.formatType')}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="ugc-format-label"
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
            >
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = format === opt.value;
                return (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setFormat(opt.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition ${
                      isActive
                        ? 'border-[#00b2fc]/60 bg-[#00b2fc]/10 text-[#00b2fc]'
                        : 'border-line bg-app text-fg-faint hover:border-[#00b2fc]/30 hover:text-fg'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform selector */}
          <div>
            <span className="text-xs font-medium text-fg-faint" id="ugc-platform-label">
              {t('ugcStudio.platform')}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="ugc-platform-label"
              className="mt-2 flex flex-wrap gap-2"
            >
              {PLATFORM_OPTIONS.map((opt) => {
                const isActive = platform === opt.value;
                return (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setPlatform(opt.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'border-[#00b2fc]/60 bg-[#00b2fc]/10 text-[#00b2fc]'
                        : 'border-line bg-app text-fg-faint hover:border-[#00b2fc]/30 hover:text-fg'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persona selector */}
          <div>
            <span className="text-xs font-medium text-fg-faint" id="ugc-persona-label">
              {t('ugcStudio.creatorPersona')}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="ugc-persona-label"
              className="mt-2 flex flex-wrap gap-2"
            >
              {PERSONA_OPTIONS.map((opt) => {
                const isActive = persona === opt.value;
                return (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setPersona(opt.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'border-[#00b2fc]/60 bg-[#00b2fc]/10 text-[#00b2fc]'
                        : 'border-line bg-app text-fg-faint hover:border-[#00b2fc]/30 hover:text-fg'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration slider */}
          <div>
            <label htmlFor="ugc-duration" className="flex items-center justify-between text-xs font-medium text-fg-faint">
              <span>{t('ugcStudio.duration')}</span>
              <span className="text-fg">{durationSec}s</span>
            </label>
            <input
              id="ugc-duration"
              type="range"
              min={15}
              max={90}
              step={5}
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="mt-2 w-full accent-[#00b2fc]"
              aria-valuemin={15}
              aria-valuemax={90}
              aria-valuenow={durationSec}
            />
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !productName.trim()}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
              aria-label={t('ugcStudio.generate')}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('ugcStudio.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('ugcStudio.generate')} ({UGC_COST} {t('ugcStudio.credits')})
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── Error state ── */}
      {step === 'error' && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t('ugcStudio.errorPrefix')}: {error}</span>
        </div>
      )}

      {/* ── Loading state ── */}
      {isLoading && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-6 text-sm text-fg-faint">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('ugcStudio.loadingMessage')}</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {step === 'idle' && !result && (
        <div className="rounded-2xl border border-dashed border-line bg-surface/50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#00b2fc]/10">
            <Video className="h-6 w-6" style={{ color: 'var(--color-brand-accent)' }} />
          </div>
          <p className="mt-3 text-sm font-medium text-fg">
            {t('ugcStudio.emptyTitle')}
          </p>
          <p className="mt-1 text-xs text-fg-faint">
            {t('ugcStudio.emptyDesc')}
          </p>
        </div>
      )}

      {/* ── Results ── */}
      {step === 'done' && result && (
        <div className="space-y-5">
          {/* Hook highlight */}
          {result.hookText && (
            <section
              aria-label="Hook"
              className="rounded-2xl border border-[#00b2fc]/30 bg-[#00b2fc]/5 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" style={{ color: 'var(--color-brand-accent)' }} />
                  <h3 className="text-sm font-bold text-fg">
                    {t('ugcStudio.hook')}
                  </h3>
                </div>
                <button
                  onClick={() => handleCopy('hook', result.hookText)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-faint hover:bg-hover hover:text-fg"
                  aria-label={t('ugcStudio.copyHook')}
                >
                  {copied === 'hook' ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === 'hook' ? t('common.copied') : t('common.copy')}
                </button>
              </div>
              <p className="mt-2 text-base font-semibold text-fg">&ldquo;{result.hookText}&rdquo;</p>
            </section>
          )}

          {/* Scene-by-scene breakdown */}
          <section
            aria-label="Scene breakdown"
            className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
          >
            <h3 className="text-sm font-bold text-fg">
              {t('ugcStudio.sceneBreakdown')}
            </h3>
            <p className="mt-0.5 text-xs text-fg-faint">
              {result.scenes.length} {t('ugcStudio.scenes')} · {result.estimatedDurationSec}s · {result.platform}
            </p>
            <ol className="mt-4 space-y-3">
              {result.scenes.map((scene) => (
                <li
                  key={scene.sceneNumber}
                  className="rounded-xl border border-line bg-app p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00b2fc]/15 text-xs font-bold" style={{ color: 'var(--color-brand-accent)' }}>
                        {scene.sceneNumber}
                      </span>
                      <span className="rounded bg-app px-2 py-0.5 text-xs font-medium text-fg-faint">
                        {scene.shotType}
                      </span>
                    </div>
                    <span className="text-xs text-fg-faint">{scene.durationSec}s</span>
                  </div>
                  <p className="mt-2 text-sm text-fg">{scene.description}</p>
                  <div className="mt-2 grid gap-1.5 text-xs">
                    {scene.textOverlay && (
                      <div className="flex gap-1.5">
                        <span className="font-medium text-fg-faint">{t('ugcStudio.textOverlay')}:</span>
                        <span className="text-fg">{scene.textOverlay}</span>
                      </div>
                    )}
                    {scene.voiceover && (
                      <div className="flex gap-1.5">
                        <span className="font-medium text-fg-faint">{t('ugcStudio.voiceover')}:</span>
                        <span className="text-fg">{scene.voiceover}</span>
                      </div>
                    )}
                    {scene.bRoll && (
                      <div className="flex gap-1.5">
                        <span className="font-medium text-fg-faint">{t('ugcStudio.bRoll')}:</span>
                        <span className="text-fg">{scene.bRoll}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Full script */}
          {result.scriptText && (
            <section
              aria-label="Full script"
              className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-fg">
                  {t('ugcStudio.fullScript')}
                </h3>
                <button
                  onClick={() => handleCopy('script', result.scriptText)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-faint hover:bg-hover hover:text-fg"
                  aria-label={t('ugcStudio.copyScript')}
                >
                  {copied === 'script' ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === 'script' ? t('common.copied') : t('common.copy')}
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{result.scriptText}</p>
            </section>
          )}

          {/* Caption + hashtags */}
          <section
            aria-label="Caption and hashtags"
            className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-fg">
                {t('ugcStudio.captionHashtags')}
              </h3>
              <button
                onClick={() => handleCopy('caption', `${result.captionText}\n\n${result.hashtags.map((h) => `#${h}`).join(' ')}`)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-faint hover:bg-hover hover:text-fg"
                aria-label={t('ugcStudio.copyCaption')}
              >
                {copied === 'caption' ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'caption' ? t('common.copied') : t('common.copy')}
              </button>
            </div>
            {result.captionText && (
              <p className="mt-2 text-sm text-fg">{result.captionText}</p>
            )}
            {result.hashtags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-fg-faint" />
                {result.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#00b2fc]/10 px-2.5 py-1 text-xs font-medium" style={{ color: 'var(--color-brand-accent)' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* CTA */}
          {result.callToAction && (
            <section
              aria-label="Call to action"
              className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
            >
              <h3 className="text-sm font-bold text-fg">
                {t('ugcStudio.callToAction')}
              </h3>
              <p className="mt-2 text-sm text-fg">{result.callToAction}</p>
            </section>
          )}

          {/* Visual + audio notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            {result.visualNotes && (
              <section
                aria-label="Visual notes"
                className="rounded-2xl border border-line bg-surface p-4"
              >
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-fg-faint" />
                  <h3 className="text-sm font-bold text-fg">
                    {t('ugcStudio.visualNotes')}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-fg-faint">{result.visualNotes}</p>
              </section>
            )}
            {result.audioNotes && (
              <section
                aria-label="Audio notes"
                className="rounded-2xl border border-line bg-surface p-4"
              >
                <div className="flex items-center gap-2">
                  <Music2 className="h-4 w-4 text-fg-faint" />
                  <h3 className="text-sm font-bold text-fg">
                    {t('ugcStudio.audioNotes')}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-fg-faint">{result.audioNotes}</p>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
