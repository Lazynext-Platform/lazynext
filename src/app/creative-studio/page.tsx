'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import {
  AlertCircle, CheckCircle2, Loader2, Sparkles, Link2, Lightbulb, Film,
  Copy, ChevronRight, Globe, Target, MessageSquare, Clapperboard,
  Video, ArrowRight, Wand2, StopCircle, Grid, FlaskConical, RefreshCw,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { CostEstimator, type CostEstimateItem } from '@/components/CostEstimator';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';

// Code-split modals — only loaded when opened (reduces initial bundle by ~200KB)
const BriefAssistantModal = dynamic(() => import('@/components/BriefAssistantModal').then(m => ({ default: m.BriefAssistantModal })), { ssr: false });
const AutoVariantsModal = dynamic(() => import('@/components/AutoVariantsModal').then(m => ({ default: m.AutoVariantsModal })), { ssr: false });
const RegenerationModal = dynamic(() => import('@/components/RegenerationModal').then(m => ({ default: m.RegenerationModal })), { ssr: false });
const MultiPlatformAdapterModal = dynamic(() => import('@/components/MultiPlatformAdapterModal').then(m => ({ default: m.MultiPlatformAdapterModal })), { ssr: false });
const BrandVoiceCheckerModal = dynamic(() => import('@/components/BrandVoiceCheckerModal').then(m => ({ default: m.BrandVoiceCheckerModal })), { ssr: false });
const UrlToBriefModal = dynamic(() => import('@/components/UrlToBriefModal').then(m => ({ default: m.UrlToBriefModal })), { ssr: false });

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

type ReferenceCreativeAnalysis = {
  source: string; duration: number; format: string; platform: string;
  hook: string; hookDuration: number; narrativeStructure: string;
  scenes: Array<{ i: number; durationSec: number; description: string; shotType: string }>;
  shotTypes: string[]; pacing: string; transitions: string[];
  captions: string; cta: string; talent: string; productPlacement: string;
  music: string; soundEffects: string[]; emotionalTone: string;
  persuasionMechanisms: string[]; adaptationRecommendations: string[];
  originalityConstraints: string[];
};

type CreativeScore = {
  hookStrength: number; clarity: number; productVisibility: number;
  brandConsistency: number; emotionalImpact: number; novelty: number;
  platformFit: number; ctaStrength: number; audioQuality: number;
  visualQuality: number; complianceRisk: number; overall: number; notes: string;
};

type CreativeVariant = {
  id: string; parentCreativeId: string; variationType: string;
  hook: string; script: string; visual: string; cta: string; rationale: string;
};

// ── Costs (must match backend) ──
const COSTS = {
  brandExtract: 5, productExtract: 3,
  brief: 3, hooks: 2, angles: 2, script: 3, storyboard: 3,
  referenceAnalysis: 5, score: 2, variants: 3,
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
  const [credits, setCredits] = useState<number | null>(null);

  // Fetch credit balance
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/me').then(r => r.json()).then(j => setCredits(j.credits ?? 0)).catch(() => {});
  }, [status]);

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
  const [briefAssistantOpen, setBriefAssistantOpen] = useState(false);
  const [autoVariantsOpen, setAutoVariantsOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenType, setRegenType] = useState<'hook' | 'angle' | 'script' | 'brief'>('hook');
  const [regenElement, setRegenElement] = useState<Record<string, unknown> | null>(null);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [brandCheckOpen, setBrandCheckOpen] = useState(false);
  const [urlToBriefOpen, setUrlToBriefOpen] = useState(false);

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

  // Reference analysis state
  const [refUrl, setRefUrl] = useState('');
  const [refStep, setRefStep] = useState<Step>('idle');
  const [refAnalysis, setRefAnalysis] = useState<ReferenceCreativeAnalysis | null>(null);
  const [refError, setRefError] = useState('');

  // Remix state (viral2viral)
  const [remixStep, setRemixStep] = useState<Step>('idle');
  const [remixError, setRemixError] = useState('');

  // Score state
  const [scoreStep, setScoreStep] = useState<Step>('idle');
  const [score, setScore] = useState<CreativeScore | null>(null);
  const [scoreError, setScoreError] = useState('');

  // Variants state
  const [variantsStep, setVariantsStep] = useState<Step>('idle');
  const [variants, setVariants] = useState<CreativeVariant[]>([]);
  const [variantsError, setVariantsError] = useState('');

  // Chain workflow state
  const [chainMode, setChainMode] = useState(false);
  const [chainStep, setChainStep] = useState(0); // 0=not started, 1-6=steps, 7=done
  const [chainRunning, setChainRunning] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [chainPaused, setChainPaused] = useState(false); // true when waiting for user to continue

  // Batch generation state
  const [batchMode, setBatchMode] = useState(false);
  const [batchTool, setBatchTool] = useState<'hooks' | 'angles' | 'scripts'>('hooks');
  const [batchCount, setBatchCount] = useState(3);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchScores, setBatchScores] = useState<Record<number, number>>({});
  const [batchScoring, setBatchScoring] = useState<Set<number>>(new Set());
  const [batchPartial, setBatchPartial] = useState(false); // true if some variants failed

  // A/B test workflow state
  const [abTestMode, setAbTestMode] = useState(false);
  const [abPlatform, setAbPlatform] = useState<'meta' | 'google'>('meta');
  const [abCampaignName, setAbCampaignName] = useState('');
  const [abBudgetDaily, setAbBudgetDaily] = useState('');
  const [abDryRun, setAbDryRun] = useState(true);
  const [abLoading, setAbLoading] = useState(false);
  const [abResult, setAbResult] = useState<{
    campaignName: string; platform: string; dryRun: boolean;
    totalVariants: number; succeeded: number; failed: number;
    adSets: Array<{ variantIndex: number; name: string; score?: number; error?: string }>;
  } | null>(null);
  const [abError, setAbError] = useState('');

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

  const doRefAnalysis = useCallback(async () => {
    if (!refUrl.trim()) return;
    setRefStep('loading'); setRefError(''); setRefAnalysis(null);
    try {
      const j = await postJson('/api/creative/reference-analysis', { url: refUrl.trim() });
      setRefAnalysis(j.analysis as ReferenceCreativeAnalysis);
      setRefStep('done');
    } catch (e) {
      setRefError(String(e instanceof Error ? e.message : e));
      setRefStep('error');
    }
  }, [refUrl]);

  // viral2viral remix: adapt reference structure for current product
  const doRemix = useCallback(async () => {
    if (!refAnalysis || !brief) return;
    setRemixStep('loading'); setRemixError('');
    try {
      const j = await postJson('/api/creative/remix', {
        analysis: refAnalysis,
        product: brief.product,
        productName: brief.productName,
        platform: brief.platform,
        format: brief.format,
      });
      // Replace the current brief with the remixed one
      setBrief(j.brief as CreativeBrief);
      setRemixStep('done');
    } catch (e) {
      setRemixError(String(e instanceof Error ? e.message : e));
      setRemixStep('error');
    }
  }, [refAnalysis, brief]);

  const doScore = useCallback(async () => {
    if (!brief || !script) return;
    setScoreStep('loading'); setScoreError(''); setScore(null);
    try {
      const j = await postJson('/api/creative/score', { brief, script, storyboard });
      setScore(j.score as CreativeScore);
      setScoreStep('done');
    } catch (e) {
      setScoreError(String(e instanceof Error ? e.message : e));
      setScoreStep('error');
    }
  }, [brief, script, storyboard]);

  const doVariants = useCallback(async () => {
    if (!brief || !script) return;
    setVariantsStep('loading'); setVariantsError(''); setVariants([]);
    try {
      const j = await postJson('/api/creative/variants', { brief, script, count: 3 });
      setVariants(j.variants as CreativeVariant[]);
      setVariantsStep('done');
    } catch (e) {
      setVariantsError(String(e instanceof Error ? e.message : e));
      setVariantsStep('error');
    }
  }, [brief, script]);

  // ── Chain workflow ──
  const CHAIN_TOTAL_COST = COSTS.brief + COSTS.hooks + COSTS.angles + COSTS.script + COSTS.storyboard + COSTS.score;

  const runChainStep = useCallback(async (step: number) => {
    setChainError(null);
    setChainRunning(true);
    setChainPaused(false);
    try {
      if (step === 1) {
        // Brief
        if (!productText.trim()) throw new Error('Product text required');
        setBriefStep('loading'); setBriefError(''); setBrief(null);
        setHooks([]); setAngles([]); setScript(null); setStoryboard(null); setScore(null);
        setSelectedHook(null); setSelectedAngle(null);
        const j = await postJson('/api/creative/brief', {
          product: productText.trim(),
          productName: productName.trim() || undefined,
          platform, format,
          brandKitId: brandKitId || undefined,
        });
        setBrief(j.brief as CreativeBrief);
        setBriefStep('done');
      } else if (step === 2) {
        // Hooks
        if (!brief) throw new Error('Brief required');
        setHooksStep('loading'); setHooksError(''); setHooks([]);
        const j = await postJson('/api/creative/hooks', { brief, count: 5 });
        setHooks(j.hooks as HookCandidate[]);
        // Auto-select best hook (highest retention)
        const best = (j.hooks as HookCandidate[]).sort((a, b) => b.estimatedRetention - a.estimatedRetention)[0];
        if (best) setSelectedHook(best);
        setHooksStep('done');
      } else if (step === 3) {
        // Angles
        if (!brief) throw new Error('Brief required');
        setAnglesStep('loading'); setAnglesError(''); setAngles([]);
        const j = await postJson('/api/creative/angles', { brief, count: 3 });
        setAngles(j.angles as CreativeAngle[]);
        // Auto-select first angle
        const arr = j.angles as CreativeAngle[];
        if (arr.length > 0) setSelectedAngle(arr[0]);
        setAnglesStep('done');
      } else if (step === 4) {
        // Script
        if (!brief || !selectedAngle || !selectedHook) throw new Error('Brief, angle, and hook required');
        setScriptStep('loading'); setScriptError(''); setScript(null); setStoryboard(null);
        const j = await postJson('/api/creative/script', {
          brief, angle: selectedAngle, hook: selectedHook,
        });
        setScript(j.script as ScriptCandidate);
        setScriptStep('done');
      } else if (step === 5) {
        // Storyboard
        if (!brief || !script) throw new Error('Brief and script required');
        setStoryboardStep('loading'); setStoryboardError(''); setStoryboard(null);
        const j = await postJson('/api/creative/storyboard', { brief, script, ratio });
        setStoryboard(j.storyboard as StoryboardCandidate);
        setStoryboardStep('done');
      } else if (step === 6) {
        // Score
        if (!brief || !script) throw new Error('Brief and script required');
        setScoreStep('loading'); setScoreError(''); setScore(null);
        const j = await postJson('/api/creative/score', { brief, script, storyboard });
        setScore(j.score as CreativeScore);
        setScoreStep('done');
      }
      setChainStep(step);
      // Pause for user confirmation between steps (except after the last step)
      if (step < 6) {
        setChainPaused(true);
      } else {
        setChainStep(7); // done
        setChainRunning(false);
      }
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      setChainError(msg);
      setChainRunning(false);
      setChainPaused(false);
    }
  }, [productText, productName, platform, format, brandKitId, brief, selectedAngle, selectedHook, script, ratio, storyboard]);

  const startChain = useCallback(() => {
    if (!productText.trim()) return;
    setChainError(null);
    setChainStep(0);
    setChainRunning(true);
    setChainPaused(false);
    runChainStep(1);
  }, [productText, runChainStep]);

  const continueChain = useCallback(() => {
    if (chainStep >= 6) return;
    setChainPaused(false);
    runChainStep(chainStep + 1);
  }, [chainStep, runChainStep]);

  const stopChain = useCallback(() => {
    setChainRunning(false);
    setChainPaused(false);
    setChainStep(0);
    setChainError(null);
  }, []);

  // ── Batch generation ──
  const runBatch = useCallback(async () => {
    if (!brief) return;
    setBatchLoading(true);
    setBatchProgress(0);
    setBatchResults([]);
    setBatchScores({});
    setBatchScoring(new Set());
    setBatchPartial(false);

    const endpoint =
      batchTool === 'hooks' ? '/api/creative/hooks' :
      batchTool === 'angles' ? '/api/creative/angles' :
      '/api/creative/script';

    // For scripts, we need angle + hook; for hooks/angles just brief
    const baseBody: Record<string, unknown> = { brief };
    if (batchTool === 'scripts') {
      if (!selectedAngle || !selectedHook) return;
      baseBody.angle = selectedAngle;
      baseBody.hook = selectedHook;
    }

    const promises = Array.from({ length: batchCount }, (_, _i) =>
      postJson(endpoint, baseBody).then((j) => {
        // increment progress as each resolves
        setBatchProgress((p) => p + 1);
        return j;
      }),
    );

    const settled = await Promise.allSettled(promises);
    const ok: any[] = [];
    let failCount = 0;
    settled.forEach((s) => {
      if (s.status === 'fulfilled') {
        if (batchTool === 'hooks' && Array.isArray(s.value.hooks)) {
          ok.push({ kind: 'hooks', data: s.value.hooks[0] || s.value.hooks });
        } else if (batchTool === 'angles' && Array.isArray(s.value.angles)) {
          ok.push({ kind: 'angles', data: s.value.angles[0] || s.value.angles });
        } else if (batchTool === 'scripts' && s.value.script) {
          ok.push({ kind: 'scripts', data: s.value.script });
        }
      } else {
        failCount++;
      }
    });

    setBatchResults(ok);
    if (failCount > 0) setBatchPartial(true);
    setBatchLoading(false);
  }, [brief, batchTool, batchCount, selectedAngle, selectedHook]);

  const scoreBatchVariant = useCallback(async (idx: number) => {
    const variant = batchResults[idx];
    if (!variant || !brief) return;
    setBatchScoring((prev) => new Set(prev).add(idx));
    try {
      // The score API requires a script; for hooks/angles we synthesize a minimal script
      let scriptObj: ScriptCandidate | undefined;
      if (variant.kind === 'scripts') {
        scriptObj = variant.data as ScriptCandidate;
      } else if (variant.kind === 'hooks') {
        const h = variant.data as HookCandidate;
        scriptObj = {
          id: h.id, angleId: 'batch', hookId: h.id, title: h.text.slice(0, 40),
          scenes: [{ i: 1, durationSec: 5, visual: '', voiceover: h.text, onScreenText: h.text }],
          totalDurationSec: 5, cta: brief.cta, language: brief.language,
        };
      } else if (variant.kind === 'angles') {
        const a = variant.data as CreativeAngle;
        scriptObj = {
          id: a.id, angleId: a.id, hookId: 'batch', title: a.name,
          scenes: [{ i: 1, durationSec: 5, visual: '', voiceover: a.description, onScreenText: a.name }],
          totalDurationSec: 5, cta: brief.cta, language: brief.language,
        };
      }
      if (!scriptObj) return;
      const j = await postJson('/api/creative/score', { brief, script: scriptObj });
      const sc = j.score as CreativeScore;
      setBatchScores((prev) => ({ ...prev, [idx]: sc.overall }));
    } catch {
      // ignore score errors silently
    } finally {
      setBatchScoring((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  }, [batchResults, brief]);

  const applyBatchVariant = useCallback((idx: number) => {
    const variant = batchResults[idx];
    if (!variant) return;
    if (variant.kind === 'hooks') {
      setSelectedHook(variant.data as HookCandidate);
    } else if (variant.kind === 'angles') {
      setSelectedAngle(variant.data as CreativeAngle);
    } else if (variant.kind === 'scripts') {
      setScript(variant.data as ScriptCandidate);
      setScriptStep('done');
    }
  }, [batchResults]);

  // ── A/B test workflow ──
  const runAbTest = useCallback(async () => {
    if (status !== 'authenticated') { setAuthOpen(true); return; }
    if (batchResults.length < 2) { setAbError('Generate at least 2 batch variants first'); return; }
    if (!abCampaignName.trim()) { setAbError('Campaign name is required'); return; }
    setAbLoading(true);
    setAbError('');
    setAbResult(null);
    try {
      // Build variants from batch results — only those with creation IDs can be deployed
      // For now, use the batch results as creative variants with their scores
      const variants = batchResults.map((r, i) => ({
        creationId: r.data?.id || `batch-${Date.now()}-${i}`,
        name: r.kind === 'hooks' ? (r.data as HookCandidate)?.text || `Variant ${i + 1}`
              : r.kind === 'angles' ? (r.data as CreativeAngle)?.name || `Variant ${i + 1}`
              : (r.data as ScriptCandidate)?.title || `Variant ${i + 1}`,
        score: batchScores[i] || undefined,
      }));
      const res = await fetch('/api/creative/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants,
          platform: abPlatform,
          campaignName: abCampaignName.trim(),
          budgetDaily: abBudgetDaily ? Number(abBudgetDaily) : undefined,
          dryRun: abDryRun,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || j.detail || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setAbResult(j);
    } catch (e) {
      setAbError(e instanceof Error ? e.message : String(e));
    } finally {
      setAbLoading(false);
    }
  }, [status, batchResults, batchScores, abPlatform, abCampaignName, abBudgetDaily, abDryRun]);

  // ── Keyboard shortcuts ──
  const shortcuts = useMemo(() => [
    {
      key: 'Enter',
      description: 'Continue chain (when paused between steps)',
      handler: () => { if (chainPaused && chainStep >= 1 && chainStep <= 5) continueChain(); },
    },
    { key: 'b', description: 'Toggle batch mode', handler: () => setBatchMode(prev => !prev) },
    {
      key: 'c',
      description: 'Toggle chain mode',
      handler: () => {
        setChainMode(prev => {
          const next = !prev;
          if (!next) stopChain();
          return next;
        });
      },
    },
  ], [chainPaused, chainStep, continueChain, stopChain]);

  const { showHelp, setShowHelp } = useKeyboardShortcuts(shortcuts, 'Keyboard Shortcuts');

  // Escape → stop chain when running (the hook reserves Escape for closing the
  // help overlay, so we listen separately here). Works even while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (chainRunning || chainPaused)) {
        e.preventDefault();
        stopChain();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chainRunning, chainPaused, stopChain]);

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
          <button
            onClick={() => setShowHelp(true)}
            className="mt-2 text-xs text-fg-faint hover:text-fg underline"
          >
            Keyboard shortcuts (?)
          </button>
        </div>

        {/* Chain Workflow */}
        <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-fg">{t('creativeStudio.chainMode')}</h2>
                <p className="text-xs text-fg-faint">{t('creativeStudio.chainModeDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => { setChainMode(!chainMode); if (chainMode) stopChain(); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${chainMode ? 'bg-danger/10 text-danger' : 'text-white'}`}
              style={chainMode ? {} : { background: '#0064d9' }}
            >
              {chainMode ? t('creativeStudio.stopChain') : t('creativeStudio.enableChain')}
            </button>
          </div>

          {chainMode && (
            <div className="mt-4 space-y-4">
              {/* Cost estimate */}
              <CostEstimator
                items={[
                  { tool: 'brief', label: t('creativeStudio.chainStepBrief'), credits: 3 },
                  { tool: 'hooks', label: t('creativeStudio.chainStepHooks'), credits: 2 },
                  { tool: 'angles', label: t('creativeStudio.chainStepAngles'), credits: 2 },
                  { tool: 'script', label: t('creativeStudio.chainStepScript'), credits: 3 },
                  { tool: 'storyboard', label: t('creativeStudio.chainStepStoryboard'), credits: 3 },
                  { tool: 'score', label: t('creativeStudio.chainStepScore'), credits: 2 },
                ]}
                balance={credits}
              />

              {/* Step indicators */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { n: 1, label: t('creativeStudio.chainStepBrief') },
                  { n: 2, label: t('creativeStudio.chainStepHooks') },
                  { n: 3, label: t('creativeStudio.chainStepAngles') },
                  { n: 4, label: t('creativeStudio.chainStepScript') },
                  { n: 5, label: t('creativeStudio.chainStepStoryboard') },
                  { n: 6, label: t('creativeStudio.chainStepScore') },
                ].map((s, idx) => {
                  const isDone = chainStep > s.n || chainStep === 7;
                  const isRunning = chainStep === s.n && chainRunning && !chainPaused;
                  const isError = chainError && chainStep === s.n;
                  const isPaused = chainStep === s.n && chainPaused;
                  return (
                    <div key={s.n} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                        isDone ? 'bg-success/10 text-success' :
                        isRunning ? 'bg-[#00b2fc]/10' : isPaused ? 'bg-[#00b2fc]/10' :
                        isError ? 'bg-danger/10 text-danger' :
                        'bg-app text-fg-faint'
                      }`}>
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                         isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                         isError ? <AlertCircle className="h-3.5 w-3.5" /> :
                         <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px]">{s.n}</span>}
                        <span>{s.label}</span>
                      </div>
                      {idx < 5 && <ArrowRight className="h-3 w-3 text-fg-placeholder" />}
                    </div>
                  );
                })}
              </div>

              {/* Start button + cost */}
              {chainStep === 0 && !chainRunning && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={startChain}
                    disabled={!productText.trim()}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: '#0064d9' }}
                  >
                    {t('creativeStudio.startChain')} ({CHAIN_TOTAL_COST} {t('creativeStudio.credits')})
                  </button>
                  <span className="text-xs text-fg-faint">{t('creativeStudio.chainTotalCost')}: {CHAIN_TOTAL_COST} {t('creativeStudio.credits')}</span>
                </div>
              )}

              {/* Error display */}
              {chainError && (
                <div role="alert" className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {t('creativeStudio.chainErrorOccurred')}: {chainError}
                </div>
              )}

              {/* Paused: intermediate result + continue/edit/stop */}
              {chainPaused && chainStep >= 1 && chainStep <= 5 && (
                <div className="rounded-xl border border-line bg-app p-3 space-y-3">
                  {/* Compact intermediate result */}
                  {chainStep === 1 && brief && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t('creativeStudio.briefGenerated')}</div>
                      <Field label={t('cstudio.fldObjective')} value={brief.objective} />
                      <Field label={t('cstudio.fldAudience')} value={brief.audience} />
                      <Field label={t('cstudio.fldAngle')} value={brief.angle} />
                      <Field label={t('cstudio.fldCta')} value={brief.cta} />
                    </div>
                  )}
                  {chainStep === 2 && hooks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-fg-faint">{t('creativeStudio.chainSelectHook')}</p>
                      {hooks.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => setSelectedHook(h)}
                          className={`w-full rounded-lg border p-2 text-left text-xs transition ${selectedHook?.id === h.id ? 'border-[#00b2fc]/60 bg-[#00b2fc]/5' : 'border-line bg-surface hover:border-[#00b2fc]/30'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{h.type}</span>
                            <span className="text-[10px] text-fg-faint">{t('creativeStudio.retention')}: {h.estimatedRetention}/10</span>
                          </div>
                          <p className="mt-1 text-fg">{h.text}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {chainStep === 3 && angles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-fg-faint">{t('creativeStudio.chainSelectAngle')}</p>
                      {angles.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAngle(a)}
                          className={`w-full rounded-lg border p-2 text-left text-xs transition ${selectedAngle?.id === a.id ? 'border-[#00b2fc]/60 bg-[#00b2fc]/5' : 'border-line bg-surface hover:border-[#00b2fc]/30'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-fg">{a.name}</span>
                            <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{a.emotionalTrigger}</span>
                          </div>
                          <p className="mt-1 text-fg">{a.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {chainStep === 4 && script && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {script.title} ({script.totalDurationSec}s)</div>
                      <p className="text-fg-faint">{script.scenes.length} {t('creativeStudio.scene')}s · {t('cstudio.lblCta')}{script.cta}</p>
                    </div>
                  )}
                  {chainStep === 5 && storyboard && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {storyboard.shots.length} {t('creativeStudio.shot')}s · {storyboard.totalDurationSec}s · {storyboard.ratio}</div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 border-t border-line pt-2">
                    <button
                      onClick={continueChain}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                      style={{ background: '#0064d9' }}
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> {t('creativeStudio.chainContinue')}
                    </button>
                    <span className="text-[10px] text-fg-faint">{t('creativeStudio.chainEditContinue')}: {t('creativeStudio.chainSelectHook')}/{t('creativeStudio.chainSelectAngle')}</span>
                    <button
                      onClick={stopChain}
                      className="ml-auto flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger"
                    >
                      <StopCircle className="h-3.5 w-3.5" /> {t('creativeStudio.stopChain')}
                    </button>
                  </div>
                </div>
              )}

              {/* Running indicator */}
              {chainRunning && !chainPaused && (
                <div className="flex items-center gap-2 text-xs text-fg-faint">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('creativeStudio.chainRunning')}…
                </div>
              )}

              {/* Summary card */}
              {chainStep === 7 && score && (
                <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <h3 className="text-sm font-bold text-fg">{t('creativeStudio.chainSummary')}</h3>
                      <p className="text-xs text-fg-faint">{t('creativeStudio.chainSummaryDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-lg font-bold text-success">
                    {t('creativeStudio.chainFinalScore')}: {score.overall}/10
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {brief && (
                      <div className="rounded-lg border border-line bg-surface p-2 text-xs">
                        <span className="font-bold text-fg">{t('creativeStudio.chainStepBrief')}</span>
                        <p className="mt-0.5 text-fg-faint">{brief.objective} · {brief.audience}</p>
                      </div>
                    )}
                    {script && (
                      <div className="rounded-lg border border-line bg-surface p-2 text-xs">
                        <span className="font-bold text-fg">{t('creativeStudio.chainStepScript')}</span>
                        <p className="mt-0.5 text-fg-faint">{script.title} · {script.totalDurationSec}s</p>
                      </div>
                    )}
                    {storyboard && (
                      <div className="rounded-lg border border-line bg-surface p-2 text-xs">
                        <span className="font-bold text-fg">{t('creativeStudio.chainStepStoryboard')}</span>
                        <p className="mt-0.5 text-fg-faint">{storyboard.shots.length} {t('creativeStudio.shot')}s · {storyboard.ratio}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={stopChain}
                    className="flex items-center gap-1 rounded-lg bg-app px-3 py-1.5 text-xs font-medium text-fg hover:bg-hover"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> {t('creativeStudio.startChain')}
                  </button>
                </div>
              )}

              {/* Cancelled message */}
              {!chainRunning && chainStep === 0 && chainError === null && productText.trim() && (
                <p className="text-xs text-fg-faint">{t('creativeStudio.chainCancelled')}</p>
              )}
            </div>
          )}
        </section>

        {/* Batch Generation */}
        <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                <Grid className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-fg">{t('creativeStudio.batchMode')}</h2>
                <p className="text-xs text-fg-faint">{t('creativeStudio.batchModeDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => setBatchMode(!batchMode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${batchMode ? 'bg-danger/10 text-danger' : 'text-white'}`}
              style={batchMode ? {} : { background: '#0064d9' }}
            >
              {batchMode ? t('creativeStudio.stopChain') : t('creativeStudio.batchMode')}
            </button>
          </div>

          {batchMode && (
            <div className="mt-4 space-y-4">
              {/* Cost estimate */}
              <CostEstimator
                items={[
                  {
                    tool: batchTool,
                    label: batchTool === 'hooks' ? t('creativeStudio.batchHooks')
                         : batchTool === 'angles' ? t('creativeStudio.batchAngles')
                         : t('creativeStudio.batchScripts'),
                    credits: batchTool === 'hooks' ? 2 : batchTool === 'angles' ? 2 : 3,
                    count: batchCount,
                  },
                ]}
                balance={credits}
              />

              {/* Controls */}
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.batchTool')}</label>
                  <select
                    value={batchTool}
                    onChange={(e) => setBatchTool(e.target.value as 'hooks' | 'angles' | 'scripts')}
                    className="mt-1 rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg focus:border-[#00b2fc]/40 focus:outline-none"
                  >
                    <option value="hooks">{t('creativeStudio.batchHooks')}</option>
                    <option value="angles">{t('creativeStudio.batchAngles')}</option>
                    <option value="scripts">{t('creativeStudio.batchScripts')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.batchCount')}</label>
                  <input
                    type="number"
                    min={2}
                    max={5}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(2, Math.min(5, Number(e.target.value) || 3)))}
                    className="mt-1 w-20 rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg focus:border-[#00b2fc]/40 focus:outline-none"
                  />
                </div>
                <button
                  onClick={runBatch}
                  disabled={batchLoading || !brief || (batchTool === 'scripts' && (!selectedAngle || !selectedHook))}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: '#0064d9' }}
                >
                  {batchLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('creativeStudio.batchProgress').replace('{0}', String(batchProgress)).replace('{1}', String(batchCount))}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      {t('creativeStudio.batchGenerate')}
                    </span>
                  )}
                </button>
                {!brief && (
                  <p className="text-xs text-fg-faint">{t('creativeStudio.batchNoResults')}</p>
                )}
                {batchTool === 'scripts' && brief && (!selectedAngle || !selectedHook) && (
                  <p className="text-xs text-fg-faint">{t('creativeStudio.chainSelectHook')} / {t('creativeStudio.chainSelectAngle')}</p>
                )}
              </div>

              {/* Partial error notice */}
              {batchPartial && batchResults.length > 0 && (
                <div role="alert" className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {t('creativeStudio.batchPartialError').replace('{0}', String(batchResults.length)).replace('{1}', String(batchCount))}
                </div>
              )}

              {/* Results grid */}
              {batchResults.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-fg">{t('creativeStudio.batchResults')}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[...batchResults.map((v, idx) => ({ v, idx }))]
                      .sort((a, b) => {
                        const sa = batchScores[a.idx];
                        const sb = batchScores[b.idx];
                        if (sa === undefined && sb === undefined) return 0;
                        if (sa === undefined) return 1;
                        if (sb === undefined) return -1;
                        return sb - sa;
                      })
                      .map(({ v, idx }) => {
                        const scoreVal = batchScores[idx];
                        const isScoring = batchScoring.has(idx);
                        return (
                          <div key={idx} className="flex flex-col rounded-xl border border-line bg-app p-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-fg">#{idx + 1}</span>
                              {scoreVal !== undefined && (
                                <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                                  {t('creativeStudio.batchScore')}: {scoreVal}/10
                                </span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="mt-2 flex-1 space-y-1">
                              {v.kind === 'hooks' && (
                                <>
                                  <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{(v.data as HookCandidate).type}</span>
                                  <p className="text-fg">{(v.data as HookCandidate).text}</p>
                                  <p className="text-fg-faint">{(v.data as HookCandidate).rationale}</p>
                                </>
                              )}
                              {v.kind === 'angles' && (
                                <>
                                  <span className="font-bold text-fg">{(v.data as CreativeAngle).name}</span>
                                  <span className="ml-1 rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{(v.data as CreativeAngle).emotionalTrigger}</span>
                                  <p className="text-fg">{(v.data as CreativeAngle).description}</p>
                                  <p className="text-fg-faint">{(v.data as CreativeAngle).rationale}</p>
                                </>
                              )}
                              {v.kind === 'scripts' && (
                                <>
                                  <span className="font-bold text-fg">{(v.data as ScriptCandidate).title}</span>
                                  <p className="text-fg-faint">{(v.data as ScriptCandidate).scenes.length} {t('creativeStudio.scene')}s · {(v.data as ScriptCandidate).totalDurationSec}s</p>
                                  {(v.data as ScriptCandidate).scenes.slice(0, 3).map((s) => (
                                    <p key={s.i} className="text-fg-faint">· {s.voiceover.slice(0, 60)}</p>
                                  ))}
                                </>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="mt-3 flex items-center gap-2 border-t border-line pt-2">
                              <button
                                onClick={() => scoreBatchVariant(idx)}
                                disabled={isScoring}
                                className="flex items-center gap-1 rounded-lg bg-app px-2.5 py-1.5 text-[11px] font-medium text-fg hover:bg-hover disabled:opacity-50"
                              >
                                {isScoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                {isScoring ? t('creativeStudio.batchScoring') : t('creativeStudio.batchScore')}
                              </button>
                              <button
                                onClick={() => applyBatchVariant(idx)}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white"
                                style={{ background: '#0064d9' }}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {t('creativeStudio.batchUseThis')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* No results placeholder */}
              {!batchLoading && batchResults.length === 0 && (
                <p className="text-xs text-fg-faint">{t('creativeStudio.batchNoResults')}</p>
              )}
            </div>
          )}
        </section>

        {/* A/B Test Workflow */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-fg">{t('creativeStudio.abTestTitle')}</h2>
            </div>
            <button
              onClick={() => setAbTestMode(!abTestMode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                abTestMode ? 'bg-brand-accent text-white' : 'bg-app text-fg-faint hover:text-fg'
              }`}
            >
              {abTestMode ? t('creativeStudio.abTestActive') : t('creativeStudio.abTestActivate')}
            </button>
          </div>

          {abTestMode && (
            <div className="space-y-4">
              <p className="text-xs text-fg-faint">{t('creativeStudio.abTestDescription')}</p>

              {/* Prerequisites check */}
              {batchResults.length < 2 && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t('creativeStudio.abTestNeedVariants')}
                </div>
              )}

              {/* Configuration form */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.abTestCampaignName')}</label>
                  <input
                    type="text"
                    value={abCampaignName}
                    onChange={e => setAbCampaignName(e.target.value)}
                    placeholder="Q4 Product Launch A/B Test"
                    className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-faint/50 focus:border-brand-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.abTestPlatform')}</label>
                  <select
                    value={abPlatform}
                    onChange={e => setAbPlatform(e.target.value as 'meta' | 'google')}
                    className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg focus:border-brand-accent focus:outline-none"
                  >
                    <option value="meta">Meta (Facebook/Instagram)</option>
                    <option value="google">Google Ads</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.abTestBudget')}</label>
                  <input
                    type="number"
                    value={abBudgetDaily}
                    onChange={e => setAbBudgetDaily(e.target.value)}
                    placeholder="50"
                    min="1"
                    className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-faint/50 focus:border-brand-accent focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs text-fg-faint">
                    <input
                      type="checkbox"
                      checked={abDryRun}
                      onChange={e => setAbDryRun(e.target.checked)}
                      className="h-4 w-4 rounded border-line"
                    />
                    {t('creativeStudio.abTestDryRun')}
                  </label>
                </div>
              </div>

              {/* Launch button */}
              <button
                onClick={runAbTest}
                disabled={abLoading || batchResults.length < 2 || !abCampaignName.trim()}
                className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {abLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                {abDryRun ? t('creativeStudio.abTestSimulate') : t('creativeStudio.abTestDeploy')}
              </button>

              {/* Error */}
              {abError && (
                <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {abError}
                </div>
              )}

              {/* Results */}
              {abResult && (
                <div className="rounded-lg border border-line bg-app p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-bold text-fg">
                      {abResult.dryRun ? t('creativeStudio.abTestSimulated') : t('creativeStudio.abTestDeployed')}
                    </span>
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded bg-surface p-2">
                      <div className="text-fg-faint">{t('creativeStudio.abTestVariants')}</div>
                      <div className="text-lg font-bold text-fg">{abResult.totalVariants}</div>
                    </div>
                    <div className="rounded bg-surface p-2">
                      <div className="text-fg-faint">{t('creativeStudio.abTestSucceeded')}</div>
                      <div className="text-lg font-bold text-success">{abResult.succeeded}</div>
                    </div>
                    <div className="rounded bg-surface p-2">
                      <div className="text-fg-faint">{t('creativeStudio.abTestFailed')}</div>
                      <div className="text-lg font-bold text-danger">{abResult.failed}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {abResult.adSets.map((adSet, i) => (
                      <div key={i} className="flex items-center justify-between rounded bg-surface px-3 py-2 text-xs">
                        <span className="font-medium text-fg">
                          {String.fromCharCode(65 + adSet.variantIndex)}. {adSet.name}
                        </span>
                        <span className="flex items-center gap-2">
                          {adSet.score !== undefined && (
                            <span className="text-fg-faint">Score: {adSet.score}</span>
                          )}
                          {adSet.error ? (
                            <span className="text-danger">{t('creativeStudio.abTestError')}</span>
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-success" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

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
                  <Field label={t('cstudio.fldCompany')} value={brand.company} />
                  <Field label={t('cstudio.fldIndustry')} value={brand.industry} />
                  <Field label={t('cstudio.fldPositioning')} value={brand.positioning} />
                  <Field label={t('cstudio.fldAudience')} value={brand.audience} />
                  <Field label={t('cstudio.fldTone')} value={brand.tone} />
                  {brand.benefits.length > 0 && <Field label={t('cstudio.fldBenefits')} value={brand.benefits.join(', ')} />}
                  {brand.prohibitedClaims.length > 0 && <Field label={t('cstudio.fldProhibitedClaims')} value={brand.prohibitedClaims.join(', ')} danger />}
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
                  <Field label={t('cstudio.fldProduct')} value={product.productName} />
                  <Field label={t('cstudio.fldCategory')} value={product.category} />
                  <Field label={t('cstudio.fldPrice')} value={product.price} />
                  {product.benefits.length > 0 && <Field label={t('cstudio.fldBenefits')} value={product.benefits.join(', ')} />}
                  {product.painPoints.length > 0 && <Field label={t('cstudio.fldPainPoints')} value={product.painPoints.join(', ')} />}
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={doBrief}
                disabled={briefStep === 'loading' || !productText.trim()}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#0064d9' }}
              >
                {briefStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.generateBrief')} (${COSTS.brief} ${t('creativeStudio.credits')})`}
              </button>
              <button
                onClick={() => setBriefAssistantOpen(true)}
                disabled={!productText.trim()}
                className="flex items-center gap-1.5 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-4 py-2 text-sm font-bold text-brand-accent disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {t('briefAssistant.button')}
              </button>
              <button
                onClick={() => setUrlToBriefOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-4 py-2 text-sm font-bold text-brand-accent"
              >
                <Link2 className="h-4 w-4" />
                {t('urlToBrief.button')}
              </button>
            </div>
            {briefStep === 'error' && <ErrorNote text={briefError} />}
            {briefStep === 'done' && brief && (
              <div className="mt-2 space-y-2 rounded-xl border border-line bg-app p-3 text-xs">
                <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t('creativeStudio.briefGenerated')}</div>
                <Field label={t('cstudio.fldObjective')} value={brief.objective} />
                <Field label={t('cstudio.fldAudience')} value={brief.audience} />
                <Field label={t('cstudio.fldPainPoint')} value={brief.painPoint} />
                <Field label={t('cstudio.fldBenefits')} value={brief.benefit} />
                <Field label={t('cstudio.fldAngle')} value={brief.angle} />
                <Field label={t('cstudio.fldCta')} value={brief.cta} />
                <Field label={t('cstudio.fldVisualDirection')} value={brief.visualDirection} />
                <Field label={t('cstudio.fldSoundDirection')} value={brief.soundDirection} />
                {brief.complianceConstraints.length > 0 && <Field label={t('cstudio.fldCompliance')} value={brief.complianceConstraints.join(', ')} danger />}
                <Field label={t('cstudio.fldLanguage')} value={brief.language} />
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
                  <div className="flex gap-2">
                    <button
                      onClick={doHooks}
                      disabled={hooksStep === 'loading'}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#0064d9' }}
                    >
                      {hooksStep === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : `${t('creativeStudio.generate')} (${COSTS.hooks})`}
                    </button>
                    {selectedHook && (
                      <button
                        onClick={() => { setRegenType('hook'); setRegenElement(selectedHook as unknown as Record<string, unknown>); setRegenOpen(true); }}
                        className="flex items-center gap-1 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 text-xs font-bold text-brand-accent"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('regeneration.button')}
                      </button>
                    )}
                  </div>
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
                  <div className="flex gap-2">
                    <button
                      onClick={doAngles}
                      disabled={anglesStep === 'loading'}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#0064d9' }}
                    >
                      {anglesStep === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : `${t('creativeStudio.generate')} (${COSTS.angles})`}
                    </button>
                    {selectedAngle && (
                      <button
                        onClick={() => { setRegenType('angle'); setRegenElement(selectedAngle as unknown as Record<string, unknown>); setRegenOpen(true); }}
                        className="flex items-center gap-1 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 text-xs font-bold text-brand-accent"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('regeneration.button')}
                      </button>
                    )}
                  </div>
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={doScript}
                  disabled={scriptStep === 'loading'}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: '#0064d9' }}
                >
                  {scriptStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.generateScript')} (${COSTS.script} ${t('creativeStudio.credits')})`}
                </button>
                {script && (
                  <button
                    onClick={() => { setRegenType('script'); setRegenElement(script as unknown as Record<string, unknown>); setRegenOpen(true); }}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-4 py-2 text-sm font-bold text-brand-accent"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('regeneration.button')}
                  </button>
                )}
              </div>
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
                  <p className="text-xs font-medium text-fg">{t('cstudio.lblCta')}{script.cta}</p>
                  <button
                    onClick={() => setAdapterOpen(true)}
                    className="mt-2 flex items-center gap-1.5 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 text-xs font-bold text-brand-accent"
                  >
                    <Globe className="h-3 w-3" />
                    {t('platformAdapter.button')}
                  </button>
                  {brandKitId && (
                    <button
                      onClick={() => setBrandCheckOpen(true)}
                      className="mt-2 flex items-center gap-1.5 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 text-xs font-bold text-brand-accent"
                    >
                      <Shield className="h-3 w-3" />
                      {t('brandCheck.button')}
                    </button>
                  )}
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

        {/* Step 5b: Score & Variants */}
        {brief && script && (
          <Section
            icon={Sparkles}
            title={t('creativeStudio.scoreVariantsTitle')}
            subtitle={t('creativeStudio.scoreVariantsSubtitle')}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Score */}
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t('creativeStudio.qualityScore')}</span>
                  <button
                    onClick={doScore}
                    disabled={scoreStep === 'loading'}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: '#0064d9' }}
                  >
                    {scoreStep === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : `${t('creativeStudio.score')} (${COSTS.score})`}
                  </button>
                </div>
                {scoreStep === 'error' && <ErrorNote text={scoreError} />}
                {score && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t('creativeStudio.overall')}: {score.overall}/10</div>
                    <ScoreBar label={t('creativeStudio.hookStrength')} value={score.hookStrength} />
                    <ScoreBar label={t('creativeStudio.clarity')} value={score.clarity} />
                    <ScoreBar label={t('creativeStudio.productVisibility')} value={score.productVisibility} />
                    <ScoreBar label={t('creativeStudio.emotionalImpact')} value={score.emotionalImpact} />
                    <ScoreBar label={t('creativeStudio.novelty')} value={score.novelty} />
                    <ScoreBar label={t('creativeStudio.platformFit')} value={score.platformFit} />
                    <ScoreBar label={t('creativeStudio.ctaStrength')} value={score.ctaStrength} />
                    {score.complianceRisk > 0 && <div className="text-danger">⚠ {t('creativeStudio.complianceRisk')}: {score.complianceRisk}/10</div>}
                    {score.notes && <p className="mt-1 text-fg-faint">{score.notes}</p>}
                  </div>
                )}
              </div>

              {/* Variants */}
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t('creativeStudio.abVariants')}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={doVariants}
                      disabled={variantsStep === 'loading'}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#0064d9' }}
                    >
                      {variantsStep === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : `${t('creativeStudio.generate')} (${COSTS.variants})`}
                    </button>
                    <button
                      onClick={() => setAutoVariantsOpen(true)}
                      disabled={!brief || !script}
                      className="flex items-center gap-1 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 text-xs font-bold text-brand-accent disabled:opacity-50"
                    >
                      <Wand2 className="h-3 w-3" />
                      {t('autoVariants.button')}
                    </button>
                  </div>
                </div>
                {variantsStep === 'error' && <ErrorNote text={variantsError} />}
                {variants.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {variants.map((v) => (
                      <div key={v.id} className="rounded-xl border border-line bg-app p-3 text-xs">
                        <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{v.variationType}</span>
                        <p className="mt-1.5 text-fg">{v.hook}</p>
                        <p className="mt-1 text-fg-faint">{v.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Footer note */}
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-hover p-4 text-center text-xs text-fg-faint">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-fg-placeholder" />
          {t('creativeStudio.footerNote')}
        </div>

        {/* Step 6: Reference Creative Analysis */}
        <Section
          icon={Video}
          title={t('creativeStudio.step6Title')}
          subtitle={t('creativeStudio.step6Subtitle')}
        >
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
            <label className="text-xs font-medium text-fg-faint">{t('creativeStudio.referenceUrl')}</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
                placeholder="https://example.com/reference-ad.mp4"
                className="min-w-0 flex-1 rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
              />
              <button
                onClick={doRefAnalysis}
                disabled={refStep === 'loading' || !refUrl.trim()}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#0064d9' }}
              >
                {refStep === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t('creativeStudio.analyze')} (${COSTS.referenceAnalysis})`}
              </button>
            </div>
            {refStep === 'error' && <ErrorNote text={refError} />}
            {refStep === 'done' && refAnalysis && (
              <div className="mt-2 space-y-2 rounded-xl border border-line bg-app p-3 text-xs">
                <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t('creativeStudio.analysisComplete')}</div>
                <Field label={t('cstudio.fldDuration')} value={`${refAnalysis.duration}s`} />
                <Field label={t('cstudio.fldPlatform')} value={refAnalysis.platform} />
                <Field label={t('cstudio.fldHook')} value={refAnalysis.hook} />
                <Field label={t('cstudio.fldHookDuration')} value={`${refAnalysis.hookDuration}s`} />
                <Field label={t('cstudio.fldNarrativeStructure')} value={refAnalysis.narrativeStructure} />
                <Field label={t('cstudio.fldPacing')} value={refAnalysis.pacing} />
                <Field label={t('cstudio.fldEmotionalTone')} value={refAnalysis.emotionalTone} />
                <Field label={t('cstudio.fldCta')} value={refAnalysis.cta} />
                <Field label={t('cstudio.fldTalent')} value={refAnalysis.talent} />
                <Field label={t('cstudio.fldProductPlacement')} value={refAnalysis.productPlacement} />
                <Field label={t('cstudio.fldMusic')} value={refAnalysis.music} />
                {refAnalysis.shotTypes.length > 0 && <Field label={t('cstudio.fldShotTypes')} value={refAnalysis.shotTypes.join(', ')} />}
                {refAnalysis.transitions.length > 0 && <Field label={t('cstudio.fldTransitions')} value={refAnalysis.transitions.join(', ')} />}
                {refAnalysis.soundEffects.length > 0 && <Field label={t('cstudio.fldSoundEffects')} value={refAnalysis.soundEffects.join(', ')} />}
                {refAnalysis.persuasionMechanisms.length > 0 && <Field label={t('cstudio.fldPersuasionMechanisms')} value={refAnalysis.persuasionMechanisms.join(', ')} />}
                {refAnalysis.adaptationRecommendations.length > 0 && (
                  <div className="mt-2 rounded-lg bg-[#00b2fc]/5 p-2">
                    <span className="font-bold text-fg">{t('creativeStudio.adaptationRecs')}:</span>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-fg">
                      {refAnalysis.adaptationRecommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {refAnalysis.originalityConstraints.length > 0 && (
                  <div className="mt-2 rounded-lg bg-danger/5 p-2">
                    <span className="font-bold text-danger">{t('creativeStudio.originalityConstraints')}:</span>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-fg">
                      {refAnalysis.originalityConstraints.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {refAnalysis.scenes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="font-bold text-fg">{t('creativeStudio.scenes')}:</span>
                    {refAnalysis.scenes.map((s) => (
                      <div key={s.i} className="rounded-lg border border-line bg-surface p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-fg">{t('creativeStudio.scene')} {s.i}</span>
                          <span className="text-fg-faint">{s.durationSec}s · {s.shotType}</span>
                        </div>
                        <p className="mt-1 text-fg-faint">{s.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* viral2viral remix button */}
                {brief && (
                  <div className="mt-3 border-t border-line pt-3">
                    <button
                      onClick={doRemix}
                      disabled={remixStep === 'loading'}
                      aria-busy={remixStep === 'loading'}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-elevated px-3 py-2 text-xs font-medium text-fg disabled:opacity-50"
                    >
                      {remixStep === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      {remixStep === 'loading' ? t('director.remixRunning') : t('director.remixBtn')}
                    </button>
                    {remixStep === 'done' && (
                      <p role="status" className="mt-2 text-center text-[11px] text-success">
                        <CheckCircle2 className="mr-1 inline h-3 w-3" />
                        {t('director.remixResult')}
                      </p>
                    )}
                    {remixStep === 'error' && (
                      <p role="alert" className="mt-2 text-center text-[11px] text-danger">
                        <AlertCircle className="mr-1 inline h-3 w-3" />
                        {t('director.remixError')}: {remixError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Send to Studio buttons */}
        {(brief || storyboard || refAnalysis) && (
          <Section
            icon={Wand2}
            title={t('creativeStudio.sendToStudioTitle')}
            subtitle={t('creativeStudio.sendToStudioSubtitle')}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StudioLink
                href="/lazynext-studio"
                label={t('creativeStudio.ugcStudio')}
                desc={t('creativeStudio.ugcStudioDesc')}
              />
              <StudioLink
                href="/ad-reference"
                label={t('creativeStudio.adReference')}
                desc={t('creativeStudio.adReferenceDesc')}
              />
              <StudioLink
                href="/drama-studio"
                label={t('creativeStudio.dramaStudio')}
                desc={t('creativeStudio.dramaStudioDesc')}
              />
              <StudioLink
                href="/ad-skit"
                label={t('creativeStudio.adSkit')}
                desc={t('creativeStudio.adSkitDesc')}
              />
            </div>
          </Section>
        )}
      </div>

      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="rounded-lg bg-surface border border-line max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Keyboard Shortcuts</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>Continue chain (when paused)</dt><dd><kbd className="kbd">Enter</kbd></dd></div>
              <div className="flex justify-between"><dt>Stop chain (when running)</dt><dd><kbd className="kbd">Esc</kbd></dd></div>
              <div className="flex justify-between"><dt>Toggle batch mode</dt><dd><kbd className="kbd">B</kbd></dd></div>
              <div className="flex justify-between"><dt>Toggle chain mode</dt><dd><kbd className="kbd">C</kbd></dd></div>
              <div className="flex justify-between"><dt>Show/hide this help</dt><dd><kbd className="kbd">?</kbd></dd></div>
              <div className="flex justify-between"><dt>Close this dialog</dt><dd><kbd className="kbd">Esc</kbd></dd></div>
            </dl>
          </div>
        </div>
      )}

      <BriefAssistantModal
        open={briefAssistantOpen}
        onClose={() => setBriefAssistantOpen(false)}
        product={productText}
        audience={brief?.audience || ''}
        platform={platform}
        format={format}
        currentBrief={brief}
        onApplyTone={(tone) => {
          setProductText((prev) => `${prev}\n\n[Tone: ${tone}]`);
          setBriefAssistantOpen(false);
        }}
        onApplyAngle={(angle) => {
          setProductText((prev) => `${prev}\n\n[Angle: ${angle}]`);
          setBriefAssistantOpen(false);
        }}
        onApplyHook={(hook) => {
          setProductText((prev) => `${prev}\n\n[Hook: ${hook}]`);
          setBriefAssistantOpen(false);
        }}
        onApplyCta={(cta) => {
          setProductText((prev) => `${prev}\n\n[CTA: ${cta}]`);
          setBriefAssistantOpen(false);
        }}
      />

      <AutoVariantsModal
        open={autoVariantsOpen}
        onClose={() => setAutoVariantsOpen(false)}
        brief={brief}
        script={script}
        existingScore={score}
      />

      <RegenerationModal
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        brief={brief}
        elementType={regenType}
        element={regenElement}
        onApply={(regenerated) => {
          if (regenType === 'hook' && selectedHook) {
            setSelectedHook({ ...selectedHook, ...(regenerated as Partial<typeof selectedHook>) });
          } else if (regenType === 'angle' && selectedAngle) {
            setSelectedAngle({ ...selectedAngle, ...(regenerated as Partial<typeof selectedAngle>) });
          } else if (regenType === 'script' && script) {
            setScript({ ...script, ...(regenerated as Partial<typeof script>) });
          }
        }}
      />

      <MultiPlatformAdapterModal
        open={adapterOpen}
        onClose={() => setAdapterOpen(false)}
        brief={brief}
        script={script}
      />

      <BrandVoiceCheckerModal
        open={brandCheckOpen}
        onClose={() => setBrandCheckOpen(false)}
        brief={brief}
        hook={selectedHook}
        angle={selectedAngle}
        script={script}
        brandKitId={brandKitId}
      />

      <UrlToBriefModal
        open={urlToBriefOpen}
        onClose={() => setUrlToBriefOpen(false)}
        onApply={(b) => { setBrief(b as typeof brief); }}
      />
    </div>
  );
}

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

function StudioLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40 hover:bg-hover"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-fg">{label}</span>
        <ArrowRight className="h-4 w-4 text-fg-faint transition group-hover:text-brand-accent" />
      </div>
      <p className="mt-1 text-xs text-fg-faint">{desc}</p>
    </Link>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-fg-faint">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${value * 10}%`, background: value >= 7 ? '#22c55e' : value >= 4 ? '#f59e0b' : '#ef4444' }} />
      </div>
      <span className="w-6 shrink-0 text-right text-fg">{value}</span>
    </div>
  );
}
