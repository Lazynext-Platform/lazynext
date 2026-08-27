'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircle, CheckCircle2, Loader2, Sparkles, Link2, Lightbulb, Film,
  Copy, ChevronRight, Globe, Target, MessageSquare, Clapperboard,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

// ── Types matching the backend ──
type BrandExtraction = {
  company: string; domain: string; industry: string; positioning: string;
  audience: string; slogan: string;
  products: Array<{ name: string; description: string; priceRange?: string; keyFeatures: string[] }>;
  features: string[]; benefits: string[]; claims: string[]; proofPoints: string[];
  colors: string[]; fonts: string[]; visualStyle: string; tone: string;
  prohibitedClaims: string[]; brandVocabulary: string[];
  sourceUrls: string[]; evidenceSnippets: string[];
};

type ProductExtraction = {
  productName: string; productUrl: string; category: string; price: string;
  description: string; benefits: string[]; painPoints: string[]; proofPoints: string[];
  features: string[]; offer: string; images: string[]; brandName: string;
};

type CreativeBrief = {
  objective: string; platform: string; format: string; audience: string;
  product: string; productName: string; offer: string; painPoint: string;
  benefit: string; mechanism: string; proof: string; angle: string; hook: string;
  cta: string; visualDirection: string; soundDirection: string;
  complianceConstraints: string[]; language: string;
};

type HookCandidate = {
  id: string; type: string; text: string; rationale: string; estimatedRetention: number;
};

type CreativeAngle = {
  id: string; name: string; description: string; emotionalTrigger: string;
  targetAudience: string; rationale: string;
};

type ScriptScene = {
  i: number; durationSec: number; visual: string; voiceover: string; onScreenText: string;
};

type ScriptCandidate = {
  id: string; angleId: string; hookId: string; title: string;
  scenes: ScriptScene[]; totalDurationSec: number; cta: string; language: string;
};

type StoryboardShot = {
  i: number; shot: string; prompt: string; durationSec: number; ratio: string;
};

type StoryboardCandidate = {
  id: string; scriptId: string; shots: StoryboardShot[];
  ratio: string; totalDurationSec: number;
};

// ── Costs (must match backend) ──
const COSTS = {
  brandExtract: 5, productExtract: 3,
  brief: 3, hooks: 2, angles: 2, script: 3, storyboard: 3,
};

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

type Step = 'idle' | 'loading' | 'done' | 'error';

// ── Main page ──
export default function CreativeStudioPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  // Brand extraction state
  const [brandUrl, setBrandUrl] = useState('');
  const [brandStep, setBrandStep] = useState<Step>('idle');
  const [brand, setBrand] = useState<BrandExtraction | null>(null);
  const [brandError, setBrandError] = useState('');
  const [brandKitId, setBrandKitId] = useState('');

  // Product extraction state
  const [productUrl, setProductUrl] = useState('');
  const [productStep, setProductStep] = useState<Step>('idle');
  const [product, setProduct] = useState<ProductExtraction | null>(null);
  const [productError, setProductError] = useState('');

  // Creative brief state
  const [productText, setProductText] = useState('');
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [format, setFormat] = useState('ugc');
  const [briefStep, setBriefStep] = useState<Step>('idle');
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [briefError, setBriefError] = useState('');

  // Hooks state
  const [hooksStep, setHooksStep] = useState<Step>('idle');
  const [hooks, setHooks] = useState<HookCandidate[]>([]);
  const [hooksError, setHooksError] = useState('');
  const [selectedHook, setSelectedHook] = useState<HookCandidate | null>(null);

  // Angles state
  const [anglesStep, setAnglesStep] = useState<Step>('idle');
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [anglesError, setAnglesError] = useState('');
  const [selectedAngle, setSelectedAngle] = useState<CreativeAngle | null>(null);

  // Script state
  const [scriptStep, setScriptStep] = useState<Step>('idle');
  const [script, setScript] = useState<ScriptCandidate | null>(null);
  const [scriptError, setScriptError] = useState('');

  // Storyboard state
  const [ratio, setRatio] = useState('9:16');
  const [storyboardStep, setStoryboardStep] = useState<Step>('idle');
  const [storyboard, setStoryboard] = useState<StoryboardCandidate | null>(null);
  const [storyboardError, setStoryboardError] = useState('');

  // ── Actions ──
  const doBrandExtract = useCallback(async () => {
    if (!brandUrl.trim()) return;
    setBrandStep('loading'); setBrandError(''); setBrand(null);
    try {
      const j = await postJson('/api/brand/extract', { url: brandUrl.trim() });
      setBrand(j.extraction as BrandExtraction);
      setBrandKitId(j.brandKitId as string);
      setBrandStep('done');
    } catch (e) {
      setBrandError(String(e instanceof Error ? e.message : e));
      setBrandStep('error');
    }
  }, [brandUrl]);

  const doProductExtract = useCallback(async () => {
    if (!productUrl.trim()) return;
    setProductStep('loading'); setProductError(''); setProduct(null);
    try {
      const j = await postJson('/api/brand/product-extract', { url: productUrl.trim() });
      setProduct(j.extraction as ProductExtraction);
      // Auto-fill the brief form from extraction
      if (j.extraction && typeof j.extraction === 'object') {
        const p = j.extraction as ProductExtraction;
        setProductName(p.productName);
        setProductText(`${p.productName}: ${p.description} Benefits: ${p.benefits.join(', ')}. Pain points: ${p.painPoints.join(', ')}. Offer: ${p.offer}`);
      }
      setProductStep('done');
    } catch (e) {
      setProductError(String(e instanceof Error ? e.message : e));
      setProductStep('error');
    }
  }, [productUrl]);

  const doBrief = useCallback(async () => {
    if (!productText.trim()) return;
    setBriefStep('loading'); setBriefError(''); setBrief(null);
    setHooks([]); setAngles([]); setScript(null); setStoryboard(null);
    setSelectedHook(null); setSelectedAngle(null);
    try {
      const j = await postJson('/api/creative/brief', {
        product: productText.trim(),
        productName: productName.trim() || undefined,
        platform, format,
        brandKitId: brandKitId || undefined,
      });
      setBrief(j.brief as CreativeBrief);
      setBriefStep('done');
    } catch (e) {
      setBriefError(String(e instanceof Error ? e.message : e));
      setBriefStep('error');
    }
  }, [productText, productName, platform, format, brandKitId]);

  const doHooks = useCallback(async () => {
    if (!brief) return;
    setHooksStep('loading'); setHooksError(''); setHooks([]);
    try {
      const j = await postJson('/api/creative/hooks', { brief, count: 5 });
      setHooks(j.hooks as HookCandidate[]);
      setHooksStep('done');
    } catch (e) {
      setHooksError(String(e instanceof Error ? e.message : e));
      setHooksStep('error');
    }
  }, [brief]);

  const doAngles = useCallback(async () => {
    if (!brief) return;
    setAnglesStep('loading'); setAnglesError(''); setAngles([]);
    try {
      const j = await postJson('/api/creative/angles', { brief, count: 3 });
      setAngles(j.angles as CreativeAngle[]);
      setAnglesStep('done');
    } catch (e) {
      setAnglesError(String(e instanceof Error ? e.message : e));
      setAnglesStep('error');
    }
  }, [brief]);

  const doScript = useCallback(async () => {
    if (!brief || !selectedAngle || !selectedHook) return;
    setScriptStep('loading'); setScriptError(''); setScript(null); setStoryboard(null);
    try {
      const j = await postJson('/api/creative/script', {
        brief, angle: selectedAngle, hook: selectedHook,
      });
      setScript(j.script as ScriptCandidate);
      setScriptStep('done');
    } catch (e) {
      setScriptError(String(e instanceof Error ? e.message : e));
      setScriptStep('error');
    }
  }, [brief, selectedAngle, selectedHook]);

  const doStoryboard = useCallback(async () => {
    if (!brief || !script) return;
    setStoryboardStep('loading'); setStoryboardError(''); setStoryboard(null);
    try {
      const j = await postJson('/api/creative/storyboard', { brief, script, ratio });
      setStoryboard(j.storyboard as StoryboardCandidate);
      setStoryboardStep('done');
    } catch (e) {
      setStoryboardError(String(e instanceof Error ? e.message : e));
      setStoryboardStep('error');
    }
  }, [brief, script, ratio]);

  // ── Render ──
  if (status === 'loading') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center py-32"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center gap-4 py-32 text-center">
          <div className="text-5xl">🔐</div>
          <p className="text-fg-faint">{t('creativeStudio.signInPrompt')}</p>
          <button onClick={() => setAuthOpen(true)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('common.signIn')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-24">
        {/* Header */}
        <div className="pt-6 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('creativeStudio.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-faint">{t('creativeStudio.subtitle')}</p>
        </div>

        {/* Step 1: Brand & Product Intelligence */}
        <Section
          icon={Globe}
          title={t('creativeStudio.step1Title')}
          subtitle={t('creativeStudio.step1Subtitle')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Brand extraction */}
            <div className="rounded-2xl border border-line bg-surface p-4">
              <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.brandUrl')}</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={brandUrl}
                  onChange={(e) => setBrandUrl(e.target.value)}
                  placeholder="https://yourbrand.com"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
                />
                <button
                  onClick={doBrandExtract}
                  disabled={brandStep === 'loading' || !brandUrl.trim()}
                  className="shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: '#0064d9' }}
                >
                  {brandStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.extract')} (${COSTS.brandExtract})`}
                </button>
              </div>
              {brandStep === 'error' && <ErrorNote text={brandError} />}
              {brandStep === 'done' && brand && (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t('creativeStudio.brandSaved')}</div>
                  <Field label="Company" value={brand.company} />
                  <Field label="Industry" value={brand.industry} />
                  <Field label="Positioning" value={brand.positioning} />
                  <Field label="Audience" value={brand.audience} />
                  <Field label="Tone" value={brand.tone} />
                  {brand.benefits.length > 0 && <Field label="Benefits" value={brand.benefits.join(', ')} />}
                  {brand.prohibitedClaims.length > 0 && <Field label="Prohibited claims" value={brand.prohibitedClaims.join(', ')} danger />}
                </div>
              )}
            </div>

            {/* Product extraction */}
            <div className="rounded-2xl border border-line bg-surface p-4">
              <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.productUrl')}</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://shop.example.com/products/led-mask"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
                />
                <button
                  onClick={doProductExtract}
                  disabled={productStep === 'loading' || !productUrl.trim()}
                  className="shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: '#0064d9' }}
                >
                  {productStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.extract')} (${COSTS.productExtract})`}
                </button>
              </div>
              {productStep === 'error' && <ErrorNote text={productError} />}
              {productStep === 'done' && product && (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t('creativeStudio.productExtracted')}</div>
                  <Field label="Product" value={product.productName} />
                  <Field label="Category" value={product.category} />
                  <Field label="Price" value={product.price} />
                  {product.benefits.length > 0 && <Field label="Benefits" value={product.benefits.join(', ')} />}
                  {product.painPoints.length > 0 && <Field label="Pain points" value={product.painPoints.join(', ')} />}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Step 2: Creative Brief */}
        <Section
          icon={Target}
          title={t('creativeStudio.step2Title')}
          subtitle={t('creativeStudio.step2Subtitle')}
        >
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.productName')}</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="GlowPatch LED Face Mask"
                  className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.platform')}</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg focus:border-[#00b2fc]/40 focus:outline-none"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.format')}</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg focus:border-[#00b2fc]/40 focus:outline-none"
                  >
                    <option value="ugc">UGC</option>
                    <option value="commercial">Commercial</option>
                    <option value="drama">Drama</option>
                    <option value="skit">Skit</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.productDesc')}</label>
              <textarea
                value={productText}
                onChange={(e) => setProductText(e.target.value)}
                placeholder={t('creativeStudio.productDescPlaceholder')}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
              />
            </div>
            <button
              onClick={doBrief}
              disabled={briefStep === 'loading' || !productText.trim()}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              {briefStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.generateBrief')} (${COSTS.brief} ${t('creativeStudio.credits')})`}
            </button>
            {briefStep === 'error' && <ErrorNote text={briefError} />}
            {briefStep === 'done' && brief && (
              <div className="mt-2 space-y-2 rounded-xl border border-line bg-app p-3 text-xs">
                <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t('creativeStudio.briefGenerated')}</div>
                <Field label="Objective" value={brief.objective} />
                <Field label="Audience" value={brief.audience} />
                <Field label="Pain point" value={brief.painPoint} />
                <Field label="Benefit" value={brief.benefit} />
                <Field label="Angle" value={brief.angle} />
                <Field label="CTA" value={brief.cta} />
                <Field label="Visual direction" value={brief.visualDirection} />
                <Field label="Sound direction" value={brief.soundDirection} />
                {brief.complianceConstraints.length > 0 && <Field label="Compliance" value={brief.complianceConstraints.join(', ')} danger />}
                <Field label="Language" value={brief.language} />
              </div>
            )}
          </div>
        </Section>

        {/* Step 3: Hooks & Angles */}
        {brief && (
          <Section
            icon={Lightbulb}
            title={t('creativeStudio.step3Title')}
            subtitle={t('creativeStudio.step3Subtitle')}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Hooks */}
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t('creativeStudio.hooks')}</span>
                  <button
                    onClick={doHooks}
                    disabled={hooksStep === 'loading'}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: '#0064d9' }}
                  >
                    {hooksStep === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : `${t('creativeStudio.generate')} (${COSTS.hooks})`}
                  </button>
                </div>
                {hooksStep === 'error' && <ErrorNote text={hooksError} />}
                {hooks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {hooks.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => setSelectedHook(h)}
                        className={`w-full rounded-xl border p-3 text-left text-xs transition ${selectedHook?.id === h.id ? 'border-[#00b2fc]/60 bg-[#00b2fc]/5' : 'border-line bg-app hover:border-[#00b2fc]/30'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{h.type}</span>
                          <span className="text-[10px] text-fg-faint">{t('creativeStudio.retention')}: {h.estimatedRetention}/10</span>
                        </div>
                        <p className="mt-1.5 text-fg">{h.text}</p>
                        <p className="mt-1 text-fg-faint">{h.rationale}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Angles */}
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t('creativeStudio.angles')}</span>
                  <button
                    onClick={doAngles}
                    disabled={anglesStep === 'loading'}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: '#0064d9' }}
                  >
                    {anglesStep === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : `${t('creativeStudio.generate')} (${COSTS.angles})`}
                  </button>
                </div>
                {anglesStep === 'error' && <ErrorNote text={anglesError} />}
                {angles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {angles.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAngle(a)}
                        className={`w-full rounded-xl border p-3 text-left text-xs transition ${selectedAngle?.id === a.id ? 'border-[#00b2fc]/60 bg-[#00b2fc]/5' : 'border-line bg-app hover:border-[#00b2fc]/30'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-fg">{a.name}</span>
                          <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{a.emotionalTrigger}</span>
                        </div>
                        <p className="mt-1 text-fg">{a.description}</p>
                        <p className="mt-1 text-fg-faint">{a.rationale}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Step 4: Script */}
        {brief && selectedAngle && selectedHook && (
          <Section
            icon={MessageSquare}
            title={t('creativeStudio.step4Title')}
            subtitle={t('creativeStudio.step4Subtitle')}
          >
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="mb-3 flex items-center gap-2 text-xs text-fg-faint">
                <span className="rounded bg-[#00b2fc]/15 px-2 py-0.5 font-medium" style={{ color: 'var(--color-brand-accent)' }}>{selectedAngle.name}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="rounded bg-[#00b2fc]/15 px-2 py-0.5 font-medium" style={{ color: 'var(--color-brand-accent)' }}>{selectedHook.type}</span>
              </div>
              <button
                onClick={doScript}
                disabled={scriptStep === 'loading'}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#0064d9' }}
              >
                {scriptStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.generateScript')} (${COSTS.script} ${t('creativeStudio.credits')})`}
              </button>
              {scriptStep === 'error' && <ErrorNote text={scriptError} />}
              {script && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> {script.title} ({script.totalDurationSec}s, {script.language})</div>
                  {script.scenes.map((s) => (
                    <div key={s.i} className="rounded-xl border border-line bg-app p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-fg">{t('creativeStudio.scene')} {s.i}</span>
                        <span className="text-fg-faint">{s.durationSec}s</span>
                      </div>
                      <p className="mt-1 text-fg-faint"><span className="text-fg-secondary">{t('creativeStudio.visual')}:</span> {s.visual}</p>
                      <p className="mt-1 text-fg"><span className="text-fg-secondary">{t('creativeStudio.voiceover')}:</span> {s.voiceover}</p>
                      {s.onScreenText && <p className="mt-1 text-fg"><span className="text-fg-secondary">{t('creativeStudio.onScreen')}:</span> {s.onScreenText}</p>}
                    </div>
                  ))}
                  <p className="text-xs font-medium text-fg">CTA: {script.cta}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Step 5: Storyboard */}
        {brief && script && (
          <Section
            icon={Clapperboard}
            title={t('creativeStudio.step5Title')}
            subtitle={t('creativeStudio.step5Subtitle')}
          >
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.ratio')}</label>
                <select
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                  className="rounded-lg border border-line bg-app px-2 py-1 text-xs text-fg focus:border-[#00b2fc]/40 focus:outline-none"
                >
                  <option value="9:16">9:16 (TikTok/Reels)</option>
                  <option value="16:9">16:9 (YouTube)</option>
                  <option value="1:1">1:1 (Feed)</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                </select>
              </div>
              <button
                onClick={doStoryboard}
                disabled={storyboardStep === 'loading'}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#0064d9' }}
              >
                {storyboardStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.generateStoryboard')} (${COSTS.storyboard} ${t('creativeStudio.credits')})`}
              </button>
              {storyboardStep === 'error' && <ErrorNote text={storyboardError} />}
              {storyboard && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> {storyboard.shots.length} shots · {storyboard.totalDurationSec}s · {storyboard.ratio}</div>
                  {storyboard.shots.map((s) => (
                    <div key={s.i} className="rounded-xl border border-line bg-app p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-fg">{t('creativeStudio.shot')} {s.i}</span>
                        <span className="text-fg-faint">{s.durationSec}s · {s.ratio}</span>
                      </div>
                      <p className="mt-1 text-fg-faint"><span className="text-fg-secondary">{t('creativeStudio.shot')}:</span> {s.shot}</p>
                      <div className="mt-1 rounded-lg bg-black/20 p-2">
                        <p className="text-fg"><span className="text-fg-secondary">{t('creativeStudio.prompt')}:</span> {s.prompt}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(s.prompt)}
                        className="mt-1 flex items-center gap-1 text-[10px] text-brand-accent hover:underline"
                      >
                        <Copy className="h-3 w-3" /> {t('creativeStudio.copyPrompt')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Footer note */}
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-hover p-4 text-center text-xs text-fg-faint">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-fg-placeholder" />
          {t('creativeStudio.footerNote')}
        </div>
      </div>
    </div>
  );
}

// ── Reusable UI components ──

function Section({ icon: Icon, title, subtitle, children }: {
  icon: typeof Globe; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-fg">{title}</h2>
          <p className="text-xs text-fg-faint">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-fg-faint">{label}: </span>
      <span className={danger ? 'text-danger' : 'text-fg'}>{value}</span>
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div role="alert" className="mt-2 flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
      <AlertCircle className="h-3 w-3 shrink-0" /> {text}
    </div>
  );
}
