'use client';
import { byokHeaders, useByokActive } from '@/lib/byok';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { AlertCircle, CheckCircle2, Download, Loader2, Play, Plus, Sparkles, Video, X } from 'lucide-react';
import { LazyVideo } from '@/components/LazyVideo';
import { useMounted } from '@/lib/use-mounted';
import { AD_FORMATS, AD_CATEGORIES, type AdCategory } from '@/lib/lazynext-studio/formats';
import { AD_HOOKS, getHook } from '@/lib/lazynext-studio/hooks';
import { AD_SETTINGS, getSetting } from '@/lib/lazynext-studio/settings';
import { AVATAR_PRESETS, getAvatar } from '@/lib/lazynext-studio/avatars';
import { EXAMPLE_VIDEOS, EXAMPLE_RECIPES } from '@/lib/lazynext-studio/examples';
import type { MarketingPlan } from '@/lib/lazynext-studio/schema';
import {
  PollInterruptedError,
  PollTerminalError,
  pollUntilComplete,
} from '@/lib/lazynext-studio/polling';
import { planTaskResume } from '@/lib/lazynext-studio/resume';
import { videoCredits } from '@/lib/video-pricing';
import { useI18n } from '@/i18n/provider';

// ── Higgsfield lazynext-studio/product visual specs (measured) ──
// bg #131416 · solid panel #1c1e21 · accent lime #00b2fc · near-black text #131416
// hero: Space Grotesk 700 uppercase / -1.6px / lh1.2 / all-white rgba(255,255,255,.9)
const LIME = '#00b2fc';
const INK = '#131416'; // near-black text on lime background (same as page background)
const PANEL = '#1c1e21';
const COSTS = { plan: 3, image: 5, video: 12 };
// Video model: seedance-2.0/image-to-video (prompt with dialogue + generate_audio for lip-sync, cheapest single step), matches backend REPLICA_VIDEO_MODEL whitelist
const REPLICA_VIDEO_MODEL = 'bytedance/seedance-2.0/image-to-video';

async function postJson(url: string, body: unknown, signal?: AbortSignal) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...byokHeaders() },
    body: JSON.stringify(body),
    signal,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail ? `${j.error || 'error'}: ${j.detail}` : (j.error || 'failed'));
  return j;
}
function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read_failed'));
    r.readAsDataURL(file);
  });
}
// Proxied polling of Atlas tasks. Must query serially: a single server-side query lasts up to 25s,
// using setInterval would pile up concurrent requests and amplify a single gateway blip into poll_gateway_unstable.
// Transient errors auto-back-off; only abort on genuine task failure.
function pollGen(getUrl: string, signal: AbortSignal, onTransient: () => void): Promise<string> {
  return pollUntilComplete({
    getUrl,
    signal,
    request: (taskUrl, requestSignal) => postJson('/api/lazynext-studio/poll', { getUrl: taskUrl }, requestSignal),
    onTransient,
  });
}
function errText(code: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (code.startsWith('insufficient_credits:')) {
    const [, need, have] = code.split(':');
    return t('mkStudio.errInsufficientCredits', { need, have });
  }
  if (code === 'insufficient_credits') return t('mkStudio.errInsufficientCreditsShort');
  if (code === 'plan_fallback') return t('mkStudio.errPlanFallback');
  if (code === 'product_required') return t('mkStudio.errProductRequired');
  if (code === 'image_too_large') return t('mkStudio.errImageTooLarge');
  if (code === 'not_image') return t('mkStudio.errNotImage');
  if (code === 'poll_temporarily_unavailable') return t('mkStudio.errPollUnavailable');
  if (code === 'video_failed' || code === 'empty_output' || code === 'generation failed' || code === 'failed') return t('mkStudio.errVideoFailed');
  if (code === 'upload_failed' || code === 'read_failed') return t('mkStudio.errUploadFailed');
  return t('mkStudio.errGeneric', { code });
}

// imgGetUrl/vidGetUrl = Atlas task query URLs: persisted immediately after submission, so polling can resume after refresh/interruption without re-submitting or double-charging.
type StepStatus = 'idle' | 'run' | 'paused' | 'done' | 'fail';
type ShotState = { img: StepStatus; vid: StepStatus; imgUrl?: string; vidUrl?: string; imgGetUrl?: string; vidGetUrl?: string };
type ComposeState = { status: 'idle' | 'run' | 'paused' | 'done' | 'fail'; frac: number; note: string; url: string };
type ResumeSnapshot = { shot: ShotState; creationId: string };
// Generation progress persistence key: plan/video state stored in localStorage, auto-restores on refresh or page return, resumes from checkpoint.
const MK_SESSION_KEY = 'mk-session-v1';
type Asset = { preview?: string; url?: string; uploading?: boolean };
const CAT_ICON: Record<string, string> = { tiktok: '🎵', ugc: '👤', commercial: '🎬' };
const VIDEO_RATIOS = ['9:16', '16:9', '1:1', '4:3', '3:4'];
const VIDEO_RESOLUTIONS = ['480p', '720p', '1080p'];
const VIDEO_DURATIONS = [4, 5, 6, 8, 10, 12, 15];
// Custom chevron (white semi-transparent) to give native selects a unified pill appearance
const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-opacity='0.55' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";
const selStyle: React.CSSProperties = { backgroundImage: CHEVRON, backgroundPosition: 'right 8px center', backgroundSize: '10px', backgroundRepeat: 'no-repeat' };

function buildDirectMarketingPlan(input: { prompt: string; ratio: string; formatId: string; scene?: string }): MarketingPlan {
  const prompt = input.prompt.trim() || 'Product video';
  // If a scene is selected, use it (→plan.scene→backend buildShotImageEditPrompt's Scene:), otherwise fall back to the default no-presenter product scene
  const scene = input.scene
    ? `The whole scene is set in ${input.scene}. Request: ${prompt}.`
    : `Cinematic product scene for this request: ${prompt}. No presenter, no human, no storyboard panels.`;
  return {
    title: prompt.slice(0, 60),
    ratio: input.ratio,
    formatId: input.formatId,
    product: `Uploaded product reference and request: ${prompt}`,
    character: '',
    scene,
    shots: [{
      i: 1,
      shot: `Cinematic product scene, no presenter, no human unless explicitly requested: ${prompt}. Use the uploaded product image as the exact product reference and integrate it into the scene.`,
      prompt: `One continuous realistic advertising video: ${prompt}. Smooth camera motion, physically plausible environment transformation, strong product consistency.`,
    }],
  };
}

function buildDirectVideoPrompt(plan: MarketingPlan, lang: string) {
  const request = plan.shots[0]?.prompt || plan.product;
  return [
    `Create one continuous ${plan.ratio} realistic video from the generated first frame.`,
    `User request: ${request}.`,
    'Use the uploaded product image as the product reference. Keep the product identity, label, color, bottle shape and materials consistent.',
    'If the request describes a scene transformation, make it cinematic and physically plausible with smooth camera motion.',
    `Clear natural motion, no subtitles, no watermark, clear spoken ${lang} only if speech is needed.`,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 3000);
}

export default function MarketingStudioPage() {
  const { status } = useSession();
  const mounted = useMounted();
  const { t } = useI18n();
  const byokActive = useByokActive();
  const [category, setCategory] = useState<AdCategory | 'all'>('all');
  const [formatId, setFormatId] = useState('ugc');
  const [product, setProduct] = useState('');
  const [hookId, setHookId] = useState('none');
  const [settingId, setSettingId] = useState('none');
  const [avatarId, setAvatarId] = useState('none');
  const [lang, setLang] = useState('English');
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [videoResolution, setVideoResolution] = useState('1080p');
  const [videoDuration, setVideoDuration] = useState(15);
  const [productAssets, setProductAssets] = useState<Asset[]>([]); // product images support multiple
  const [avatarAsset, setAvatarAsset] = useState<Asset>({});
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [shots, setShots] = useState<ShotState[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [compose, setCompose] = useState<ComposeState>({ status: 'idle', frac: 0, note: '', url: '' });
  const [preview, setPreview] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [creationId, setCreationId] = useState(''); // "work placeholder" id created on generate, updated on completion/failure
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [resumeSnapshot, setResumeSnapshot] = useState<ResumeSnapshot | null>(null);
  const [replica, setReplica] = useState<{ imgPrompt: string } | null>(null); // non-null = replica mode (video prompt filled into text box, editable), stores the image-generation-specific composition prompt
  const [expanding, setExpanding] = useState(false); // AI expanding prompt in progress
  const productInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const runAbortRef = useRef<AbortController | null>(null);

  const fmt = useMemo(() => AD_FORMATS.find((f) => f.id === formatId) || AD_FORMATS[0], [formatId]);
  const visibleFormats = useMemo(() => (category === 'all' ? AD_FORMATS : AD_FORMATS.filter((f) => f.category === category)), [category]);
  // Video step dynamic billing (calculated live from selected resolution/duration); first-frame image still uses fixed COST.image.
  const videoCost = videoCredits(REPLICA_VIDEO_MODEL, videoResolution, videoDuration);
  const shotCost = COSTS.image + videoCost;
  const hasCreditsForVideo = byokActive || status !== 'authenticated' || credits === null || credits >= shotCost;

  const refreshCredits = useCallback(async () => {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      if (!r.ok) {
        setCredits(null);
        return null;
      }
      const j = await r.json();
      const n = Number(j.credits);
      const next = Number.isFinite(n) ? n : null;
      setCredits(next);
      return next;
    } catch {
      setCredits(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') void refreshCredits();
    else setCredits(null);
  }, [status, refreshCredits]);

  useEffect(() => {
    const h = () => {
      if (status === 'authenticated') void refreshCredits();
    };
    window.addEventListener('lazynext:credits', h);
    return () => window.removeEventListener('lazynext:credits', h);
  }, [status, refreshCredits]);

  // ── Generation progress persistence: refresh/page-switch won't lose state ──
  // Restore (once after mounted): sessions within 24h restore plan/video state. As long as getUrl is saved,
  // polling resumes on the same Atlas task after refresh — never re-submits or double-charges.
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(MK_SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (Date.now() - (s.ts || 0) > 24 * 3600_000) return; // only check freshness; no longer require a plan (restore inputs even before generation, so login redirect return doesn't lose them)
      // Restore all input fields (login OAuth redirect/refresh return won't lose them)
      if (typeof s.product === 'string') setProduct(s.product);
      if (typeof s.formatId === 'string' && s.formatId) setFormatId(s.formatId);
      if (typeof s.hookId === 'string' && s.hookId) setHookId(s.hookId);
      if (typeof s.settingId === 'string' && s.settingId) setSettingId(s.settingId);
      if (typeof s.avatarId === 'string' && s.avatarId) setAvatarId(s.avatarId);
      if (s.replica && typeof s.replica.imgPrompt === 'string') setReplica(s.replica);
      // Images only stored as url (R2/same-origin, restorable); blob preview is invalid on reload, url used as fallback
      const purls: string[] = Array.isArray(s.productUrls) ? s.productUrls.filter(Boolean) : (s.productUrl ? [s.productUrl] : []);
      if (purls.length) setProductAssets(purls.map((u: string) => ({ preview: u, url: u })));
      if (s.avatarUrl) setAvatarAsset({ preview: s.avatarUrl, url: s.avatarUrl });
      if (VIDEO_RESOLUTIONS.includes(s.videoResolution)) setVideoResolution(s.videoResolution);
      if (VIDEO_DURATIONS.includes(s.videoDuration)) setVideoDuration(s.videoDuration);
      if (VIDEO_RATIOS.includes(s.videoRatio)) setVideoRatio(s.videoRatio);
      const restoredCreationId = typeof s.creationId === 'string' ? s.creationId : '';
      if (restoredCreationId) setCreationId(restoredCreationId);
      // plan/shots only restored when there is actual generated content. Incomplete steps keep getUrl and are marked paused,
      // so the next effect resumes polling directly; the old implementation cleared getUrl, causing task re-submission and double charges.
      if (s.plan?.shots?.length) {
        setPlan(s.plan);
        const first = Array.isArray(s.shots) && s.shots[0] ? s.shots[0] : { img: 'idle', vid: 'idle' };
        const imgUrl = typeof first.imgUrl === 'string' ? first.imgUrl : undefined;
        const vidUrl = typeof first.vidUrl === 'string' ? first.vidUrl : undefined;
        const imgGetUrl = typeof first.imgGetUrl === 'string' ? first.imgGetUrl : undefined;
        const vidGetUrl = typeof first.vidGetUrl === 'string' ? first.vidGetUrl : undefined;
        const imgDone = !!imgUrl;
        const vidDone = !!vidUrl;
        const restoredShot: ShotState = {
          img: imgDone ? 'done' : imgGetUrl ? 'paused' : 'idle',
          vid: vidDone ? 'done' : vidGetUrl ? 'paused' : 'idle',
          imgUrl,
          vidUrl,
          imgGetUrl,
          vidGetUrl,
        };
        setShots([restoredShot]);
        if (vidDone) {
          setCompose({ status: 'done', frac: 1, note: 'Done', url: vidUrl });
        } else if (imgGetUrl || vidGetUrl) {
          setCompose({
            status: 'run',
            frac: vidGetUrl ? 0.55 : 0.2,
            note: t('mkStudio.resumingTask'),
            url: '',
          });
          setResumeSnapshot({ shot: restoredShot, creationId: restoredCreationId });
        }
      }
    } catch { /* ignore broken session */ }
    finally { setSessionHydrated(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Save: plan/video state persisted to localStorage on every change (imgUrl/vidUrl are R2 same-origin URLs, persistent and playable).
  useEffect(() => {
    if (!mounted || !sessionHydrated) return; // wait for restore effect to finish, avoid first empty state overwriting not-yet-read tasks
    try {
      localStorage.setItem(MK_SESSION_KEY, JSON.stringify({
        plan, shots, product, formatId, hookId, settingId, avatarId, replica,
        videoRatio, videoResolution, videoDuration, creationId,
        productUrls: productAssets.map((a) => a.url).filter(Boolean), avatarUrl: avatarAsset.url || '', // images only store R2/same-origin url (blob preview invalid on reload)
        ts: Date.now(),
      }));
    } catch { /* storage full etc. */ }
  }, [mounted, sessionHydrated, plan, shots, product, formatId, hookId, settingId, avatarId, replica, videoRatio, videoResolution, videoDuration, creationId, productAssets, avatarAsset.url]);

  useEffect(() => () => runAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!sessionHydrated || !resumeSnapshot) return;
    const snapshot = resumeSnapshot;
    setResumeSnapshot(null);
    void genDirectVideo(snapshot.shot, snapshot.creationId);
    // Restore snapshot consumed only once; genDirectVideo uses the current form/plan state after restore completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionHydrated, resumeSnapshot]);

  async function onPick(kind: 'product' | 'avatar', file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('not_image'); return; }
    setErr(null);
    let dataUrl: string;
    try { dataUrl = await imageToDataUrl(file); }
    catch (e) { setErr(e instanceof Error ? e.message : 'upload_failed'); return; }
    if (dataUrl.length > 8_000_000) { setErr('image_too_large'); return; }
    if (kind === 'avatar') {
      setAvatarAsset({ preview: dataUrl, uploading: true });
      try {
        const j = await postJson('/api/lazynext-studio/upload', { dataUrl });
        setAvatarAsset({ preview: dataUrl, url: j.url, uploading: false });
      } catch (e) { setAvatarAsset({}); setErr(e instanceof Error ? e.message : 'upload_failed'); }
      return;
    }
    // Product image: append to array (supports multiple). Use object reference to locate this one, only update it on completion/failure.
    const slot: Asset = { preview: dataUrl, uploading: true };
    setProductAssets((prev) => [...prev, slot]);
    try {
      const j = await postJson('/api/lazynext-studio/upload', { dataUrl });
      setProductAssets((prev) => prev.map((a) => (a === slot ? { preview: dataUrl, url: j.url, uploading: false } : a)));
    } catch (e) {
      setProductAssets((prev) => prev.filter((a) => a !== slot));
      setErr(e instanceof Error ? e.message : 'upload_failed');
    }
  }

  useEffect(() => {
    if (!mounted) return;
    const handlePaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      void onPick('product', file);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // One-click replica: brings the example's product image + product description into the generator, selects the corresponding format, scrolls back to top, user can directly generate the same ad (or swap in their own product image).
  function replicateExample(fid: string) {
    const r = EXAMPLE_RECIPES[fid];
    setFormatId(fid);
    setReplica(r ? { imgPrompt: r.imgPrompt } : null);
    if (r) {
      setProduct(r.vidPrompt); // full video prompt filled into text box: user can see, edit, and fine-tune dialogue/action/scene
      setProductAssets(r.image ? [{ preview: r.image, url: r.image }] : []); // bring in product image (can add more of your own)
      setAvatarAsset(r.avatar ? { preview: r.avatar, url: r.avatar } : {}); // bring in person image (UGC voiceover types only), clear if none
    }
    setPlan(null); setShots([]); setErr(null);
    setCompose({ status: 'idle', frac: 0, note: '', url: '' });
    // Delay scroll until after this setState re-render, otherwise the smooth animation gets interrupted and the user stays on the card wall without seeing "filled in".
    if (typeof window !== 'undefined') setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);
  }

  // AI expand: expands the short description in the text box into a full UGC video prompt (references uploaded product/person images, dialogue follows input language)
  async function expandPrompt() {
    const brief = product.trim();
    if (!brief) { setErr(t('mkStudio.enterBrief')); return; }
    setExpanding(true); setErr(null);
    try {
      const r = await postJson('/api/lazynext-studio/expand-prompt', { brief, formatId, productUrls: productAssets.map((a) => a.url).filter(Boolean), avatarUrl: avatarAsset.url || '' });
      if (r.prompt) { setProduct(r.prompt); setReplica(null); } // expand result = manual detailed script (not replica), image generation also uses it
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setExpanding(false);
    }
  }

  async function genDirectVideo(existing?: ShotState, existingCreationId = '') {
    const resumePlan = planTaskResume(existing, COSTS.image, videoCost);
    const { hasExistingWork, hasPendingTask, remainingCost } = resumePlan;
    if (!hasExistingWork && status !== 'authenticated') { signIn('google'); return; }
    if (!hasExistingWork && !product.trim() && !productAssets.some((a) => a.url)) { setErr('product_required'); return; }
    if (productAssets.some((a) => a.uploading) || avatarAsset.uploading) return;
    runAbortRef.current?.abort();
    const controller = new AbortController();
    runAbortRef.current = controller;

    // Scene/hook dropdowns → inject prompt placeholders (effective in both replica/normal mode): scene into visuals (image+video), hook into video opening
    const settingRecipe = getSetting(settingId).recipe; // English scene description (empty = smart auto-select)
    const hookEn = getHook(hookId).promptEn || ''; // English opening hook instruction
    const sceneAdd = settingRecipe ? ` The whole scene is set in ${settingRecipe}.` : '';
    const hookAdd = hookEn ? ` Opening hook in the first 3 seconds: ${hookEn}.` : '';
    const directPlan = hasExistingWork && plan
      ? plan
      : buildDirectMarketingPlan({ prompt: product.trim() || t('mkStudio.defaultProduct'), ratio: videoRatio, formatId, scene: settingRecipe || undefined });
    const local: ShotState = existing ? { ...existing } : { img: 'idle', vid: 'idle' };
    setErr(null);
    setBusy('video');
    setPlan(directPlan);
    setShots([local]);
    setCompose({
      status: 'run',
      frac: local.vidGetUrl ? 0.55 : local.imgGetUrl ? 0.2 : 0.05,
      note: hasPendingTask
        ? t('mkStudio.continuingTask')
        : t('mkStudio.preparing'),
      url: '',
    });
    let cid = existingCreationId || creationId;
    const onTransient = () => {
      if (controller.signal.aborted) return;
      setCompose((current) => ({
        ...current,
        note: t('mkStudio.recovering'),
      }));
    };

    try {
      const currentCredits = remainingCost > 0 ? await refreshCredits() : credits;
      if (!byokActive && currentCredits !== null && currentCredits < remainingCost) {
        setErr(`insufficient_credits:${remainingCost}:${currentCredits}`);
        setCompose({ status: 'idle', frac: 0, note: '', url: '' });
        return;
      }

      // Only create placeholder for new tasks or regeneration after genuine failure; resume queries with existing getUrl don't create new ones or charge.
      if (!cid && !hasPendingTask) {
        try {
          const st = await postJson('/api/creations/start', { type: 'lazynext-studio', title: directPlan.title || product.slice(0, 60) || t('mkStudio.defaultAdTitle') }, controller.signal);
          cid = st.id;
          setCreationId(cid);
        } catch { /* placeholder failure doesn't block generation */ }
      }

      let imgUrl = local.imgUrl || '';
      // Never redo the first frame when a video task already exists; polling the video itself no longer needs imageUrl.
      if (!local.vidGetUrl && !local.vidUrl && !imgUrl) {
        setCompose({ status: 'run', frac: 0.15, note: t('mkStudio.genFirstFrame'), url: '' });
        local.img = 'run';
        setShots([{ ...local }]);
        if (!local.imgGetUrl) {
          const im = await postJson('/api/lazynext-studio/shot-image', {
            plan: directPlan,
            shotIndex: 0,
            productUrls: productAssets.map((a) => a.url).filter(Boolean),
            avatarUrl: avatarAsset.url || '',
            promptOverride: (replica ? replica.imgPrompt : product.trim()) + sceneAdd, // image prompt: replica uses recipe composition, manual/expand uses text box content
          }, controller.signal);
          local.imgGetUrl = im.getUrl;
          setShots([{ ...local }]);
        }
        imgUrl = await pollGen(local.imgGetUrl!, controller.signal, onTransient);
        local.img = 'done';
        local.imgUrl = imgUrl;
        setShots([{ ...local }]);
      }

      let vidUrl = local.vidUrl || '';
      if (!vidUrl) {
        setCompose({ status: 'run', frac: 0.48, note: t('mkStudio.genVideo'), url: '' });
        local.vid = 'run';
        setShots([{ ...local }]);
        if (!local.vidGetUrl) {
          const vd = await postJson('/api/lazynext-studio/shot-video', {
            imageUrl: imgUrl,
            prompt: product.trim() + sceneAdd + hookAdd + ' No subtitles, no captions, no on-screen text or watermark.', // video prompt = text box content + scene + hook; explicitly disable subtitles (seedance often auto-burns them)
            ratio: directPlan.ratio,
            resolution: videoResolution,
            duration: videoDuration,
            model: REPLICA_VIDEO_MODEL, // unified seedance-2.0 i2v (prompt with dialogue + generate_audio): both replica and manual expand can lip-sync voiceover
            creationId: cid,
          }, controller.signal);
          local.vidGetUrl = vd.getUrl;
          setShots([{ ...local }]);
        }
        vidUrl = await pollGen(local.vidGetUrl!, controller.signal, onTransient);
      }
      local.vid = 'done';
      local.vidUrl = vidUrl;
      setShots([{ ...local }]);
      setCompose({ status: 'done', frac: 1, note: 'Done', url: vidUrl });

      // Save history: final video URL → write Creation (logged-in users; failure doesn't affect page display)
      try {
        await postJson('/api/lazynext-studio/save-reel', {
          url: vidUrl,
          title: directPlan.title || product.slice(0, 60) || 'Ad',
          type: 'lazynext-studio',
          thumbnail: imgUrl,
          creationId: cid,
        }, controller.signal);
      } catch { /* ignore history save failure */ }
      setCreationId(''); // this one is done, next generate creates a new placeholder
      setReplica(null); // replica complete, exit replica mode
    } catch (e) {
      if (controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : 'video_failed';
      const recoverable = e instanceof PollInterruptedError;
      const terminal = e instanceof PollTerminalError;
      setErr(recoverable ? 'poll_temporarily_unavailable' : message);
      const activeStep = local.vid === 'run' ? 'vid' : local.img === 'run' ? 'img' : null;
      if (activeStep) local[activeStep] = recoverable ? 'paused' : 'fail';
      // When Atlas explicitly returns failed, that step has already been refunded; clear the old getUrl so the next attempt can re-submit that step.
      // On gateway/browser interruption, getUrl must be kept so "continue checking" and refresh resume the same already-charged task.
      if (terminal && activeStep === 'img') local.imgGetUrl = undefined;
      if (terminal && activeStep === 'vid') local.vidGetUrl = undefined;
      setShots([{ ...local }]);
      setCompose((current) => current.status === 'run'
        ? {
            ...current,
            status: recoverable ? 'paused' : 'fail',
            note: errText(recoverable ? 'poll_temporarily_unavailable' : message, t),
          }
        : current);
      if (!recoverable) {
        // Only mark the work placeholder as failed on definite failure; keep processing during query instability.
        if (cid) fetch(`/api/creations/${cid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...byokHeaders() }, body: JSON.stringify({ status: 'failed', error: message }) }).catch(() => {});
        setCreationId('');
      }
    } finally {
      if (runAbortRef.current === controller) {
        runAbortRef.current = null;
        setBusy(null);
        window.dispatchEvent(new Event('lazynext:credits'));
      }
    }
  }

  const gridBg = {
    backgroundColor: INK,
    colorScheme: 'dark',
    backgroundImage:
      'radial-gradient(70% 55% at 50% -6%, rgba(0,178,252,0.06) 0%, rgba(0,178,252,0) 60%), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
    backgroundSize: 'auto, 44px 44px, 44px 44px',
  } as React.CSSProperties;
  const selCls = 'appearance-none bg-white/[0.04] rounded-lg pl-2.5 pr-7 py-2 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-[#00b2fc]';

  // Single uploaded thumbnail (with delete); product images support multiple, person image is single
  const ThumbSlot = ({ asset, onRemove, label }: { asset: Asset; onRemove: () => void; label: string }) => (
    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/15 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset.preview} alt={label} className="w-full h-full object-cover" />
      {asset.uploading && <div className="absolute inset-0 bg-black/60 grid place-items-center"><Loader2 className="w-4 h-4 animate-spin text-white" /></div>}
      {asset.url && <div className="absolute bottom-0 inset-x-0 text-[8px] text-center font-semibold leading-tight" style={{ background: LIME, color: '#fff' }}>{t('mkStudio.uploaded')}</div>}
      <button onClick={onRemove} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
    </div>
  );
  const AddSlot = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button onClick={onClick} className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#00b2fc]/60 hover:bg-white/[0.06] flex flex-col items-center justify-center gap-0.5 text-white/45 hover:text-[#00b2fc] transition shrink-0">
      <Plus className="w-4 h-4" /><span className="text-[8px] uppercase tracking-wide leading-none text-center px-0.5">{label}</span>
    </button>
  );

  // Top-level hydration gate: first frame (SSR + client hydration) renders a uniform empty skeleton, real content only after mounted,
  // completely avoiding SSR≠client divergence caused by in-page client-only state (session/credits/locale) (React #418).
  if (!mounted) return <main className="min-h-screen text-[#f7f7f8]" style={gridBg} />;
  return (
    <main className="min-h-screen text-[#f7f7f8]" style={gridBg}>
      {/* Top bar */}
      <div className="px-6 sm:px-8 py-5">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 rounded-lg" />
            <b className="text-sm tracking-tight">Lazynext</b>
          </a>
          <a href="/" className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition">{t('mkStudio.allApps')}</a>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center pt-14 pb-10 px-6">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/50 font-medium mb-3" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", sans-serif' }}>Lazynext</div>
        <h1 className="font-bold uppercase leading-[1.08] tracking-[-0.03em] text-[clamp(40px,5.4vw,58px)] text-white/90" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif' }}>
          <>{t('mkStudio.heroPre')}<br />{t('mkStudio.heroHl')}</>
        </h1>
      </div>

      {/* Generator panel */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-3xl border border-white/[0.06] p-4 sm:p-5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]" style={{ background: PANEL }}>
          <div className="flex items-stretch gap-4">
            {/* prompt + controls */}
            <div className="flex-1 min-w-0 flex flex-col">
              <input ref={productInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach((f) => void onPick('product', f)); e.target.value = ''; }} />
              <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void onPick('avatar', e.target.files?.[0]); e.target.value = ''; }} />
              {/* Upload images: product (multiple, multi-select) + person, laid out above the input box */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {productAssets.map((a, i) => <ThumbSlot key={i} asset={a} onRemove={() => setProductAssets((prev) => prev.filter((_, j) => j !== i))} label={t('mkStudio.product')} />)}
                {productAssets.length < 4 && <AddSlot onClick={() => productInput.current?.click()} label={productAssets.length ? t('mkStudio.addProduct') : t('mkStudio.product')} />}
                <span className="w-px h-12 bg-white/10 mx-1 shrink-0" />
                {avatarAsset.preview
                  ? <ThumbSlot asset={avatarAsset} onRemove={() => setAvatarAsset({})} label={t('mkStudio.avatar')} />
                  : <AddSlot onClick={() => avatarInput.current?.click()} label={t('mkStudio.avatar')} />}
              </div>
              <textarea value={product} onChange={(e) => setProduct(e.target.value)} rows={4}
                placeholder={t('mkStudio.placeholder')}
                className="w-full flex-1 bg-transparent text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-white/30 px-1 pt-1" />
              <div className="flex items-center gap-2 mt-1 mb-1">
                <button onClick={expandPrompt} disabled={expanding || !product.trim()} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-[#131517] disabled:opacity-40 transition hover:brightness-110" style={{ background: LIME }}>{expanding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}{t('mkStudio.aiExpand')}</button>
                {replica && <span className="text-[11px] text-white/45">{t('mkStudio.replicaLoaded')}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <select value={formatId} onChange={(e) => setFormatId(e.target.value)} className={selCls} style={selStyle} title={t('mkStudio.format')}>
                  {AD_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.emoji} {t(`presets.fmt.${f.id}.label`)}</option>)}
                </select>
                {!replica && <select value={hookId} onChange={(e) => setHookId(e.target.value)} className={selCls} style={selStyle} title={t('mkStudio.hook')}>{AD_HOOKS.map((h) => <option key={h.id} value={h.id}>{h.id === 'none' ? t('mkStudio.hook') : t(`presets.hook.${h.id}`)}</option>)}</select>}
                {!replica && <select value={settingId} onChange={(e) => setSettingId(e.target.value)} className={selCls} style={selStyle} title={t('mkStudio.setting')}>{AD_SETTINGS.map((s) => <option key={s.id} value={s.id}>{s.id === 'none' ? t('mkStudio.setting') : t(`presets.setting.${s.id}`)}</option>)}</select>}
                <select value={avatarId} onChange={(e) => { const id = e.target.value; setAvatarId(id); const a = getAvatar(id); setAvatarAsset(a.image ? { preview: a.image, url: a.image } : {}); }} disabled={!fmt.needsPerson} className={`${selCls} disabled:opacity-40`} style={selStyle} title={t('mkStudio.avatarTitle')}>{AVATAR_PRESETS.map((a) => <option key={a.id} value={a.id}>{a.id === 'none' ? t('mkStudio.avatarLabel') : t(`presets.avatar.${a.id}`)}</option>)}</select>
                <select value={videoRatio} onChange={(e) => setVideoRatio(e.target.value)} className={selCls} style={selStyle} title={t('mkStudio.aspectRatio')}>{VIDEO_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                <select value={videoResolution} onChange={(e) => setVideoResolution(e.target.value)} className={selCls} style={selStyle} title={t('mkStudio.resolution')}>{VIDEO_RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                <select value={videoDuration} onChange={(e) => setVideoDuration(Number(e.target.value))} className={selCls} style={selStyle} title={t('mkStudio.duration')}>{VIDEO_DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}</select>
                {/* Language dropdown removed: dialogue language auto-follows the language typed in the text box (Chinese input → Chinese dialogue) */}
              </div>
            </div>
            {/* GENERATE (full height) */}
            <button onClick={() => void genDirectVideo()} disabled={busy !== null || productAssets.some((a) => a.uploading) || avatarAsset.uploading || !hasCreditsForVideo}
              className="self-stretch px-6 rounded-2xl font-extrabold text-sm flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 transition hover:brightness-105 shrink-0"
              style={{ background: `radial-gradient(90% 90% at 50% 120%, #22d3ee 0%, rgba(167,139,250,0) 60%), ${LIME}`, color: '#fff' }}>
              {busy === 'video' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
              <span>{byokActive ? t('mkStudio.generate') : (!hasCreditsForVideo ? t('mkStudio.lowCredits') : t('mkStudio.generate'))}</span>{!byokActive && <span className="text-[10px] opacity-70">✦ {shotCost}</span>}
            </button>
          </div>
          {(status === 'authenticated' || byokActive) && (
            <div className="mt-3 text-center text-[11px] text-white/35">
              {byokActive
                ? t('mkStudio.byokHint')
                : t('mkStudio.costHint', { shotCost, image: COSTS.image, video: videoCost, balance: credits ?? '·' })}
            </div>
          )}
        </div>
      </div>

      {err && <div className="max-w-4xl mx-auto px-4 mt-4 mb-6"><div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4" />{errText(err, t)}</div></div>}

      {/* Final video */}
      {compose.status !== 'idle' && (
        <div className="max-w-md mx-auto px-4 pb-16">
          <div className="rounded-3xl border border-white/10 p-5 shadow-[0_24px_80px_-28px_rgba(0,178,252,0.55)]" style={{ background: PANEL }}>
            <div className="flex items-center gap-2 text-sm mb-3">
              {compose.status === 'done' ? <CheckCircle2 className="w-4 h-4" style={{ color: LIME }} /> : compose.status === 'fail' || compose.status === 'paused' ? <AlertCircle className={`w-4 h-4 ${compose.status === 'paused' ? 'text-amber-300' : 'text-red-400'}`} /> : <Loader2 className="w-4 h-4 animate-spin" style={{ color: LIME }} />}
              <b>{compose.status === 'done'
                ? t('mkStudio.videoReady')
                : compose.status === 'paused'
                  ? t('mkStudio.taskRunning')
                  : compose.status === 'fail'
                    ? t('mkStudio.genFailed')
                    : t('mkStudio.generatingLabel')}</b>
              <span className="ml-auto text-xs text-white/40 truncate max-w-[45%]">{compose.note}</span>
            </div>
            {compose.status === 'run' && (
              <>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4"><div className="h-full rounded-full transition-all" style={{ width: `${Math.round(compose.frac * 100)}%`, background: `linear-gradient(90deg,#22d3ee,${LIME})` }} /></div>
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] rounded-2xl overflow-hidden border border-white/10 bg-black/40 grid place-items-center">
                  <div className="flex flex-col items-center gap-2 text-white/50"><Loader2 className="w-9 h-9 animate-spin" style={{ color: LIME }} /><span className="text-xs">{compose.note || t('mkStudio.generatingDots')}</span></div>
                </div>
              </>
            )}
            {(compose.status === 'fail' || compose.status === 'paused') && (
              <div className={`rounded-2xl border p-4 text-sm text-center ${compose.status === 'paused' ? 'border-amber-400/25 bg-amber-400/10 text-amber-200' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>
                <div className="mb-3 leading-relaxed">{compose.note || t('mkStudio.genFailedRetry')}</div>
                <button onClick={() => void genDirectVideo(shots[0], creationId)} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition hover:brightness-110 disabled:opacity-50" style={{ background: LIME, color: '#131517' }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}{compose.status === 'paused' ? t('mkStudio.continueChecking') : t('mkStudio.retryGeneration')}</button>
              </div>
            )}
            {compose.url && (
              <div className="flex flex-col items-center">
                <div className="relative mx-auto w-full max-w-[300px]">
                  <video controls autoPlay loop playsInline src={compose.url} className="w-full aspect-[9/16] rounded-2xl border border-white/10 bg-black object-contain shadow-[0_16px_50px_-20px_rgba(0,0,0,0.8)]" />
                </div>
                <p className="mt-2 text-[11px] text-white/35">{t('mkStudio.volumeHint')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <a href={compose.url} download="ad.mp4" className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition hover:brightness-110" style={{ background: LIME }}><Download className="w-4 h-4" />{t('mkStudio.download')}</a>
                  <button onClick={() => void genDirectVideo()} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-white/15 hover:border-[#00b2fc] disabled:opacity-50 transition">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}{t('mkStudio.regenerate')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center flex-wrap gap-2 mt-4 mb-5 px-4">
        {AD_CATEGORIES.map((c) => {
          const on = category === c.id;
          return (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition ${on ? 'bg-white text-[#131517]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
              {CAT_ICON[c.id] && <span className="text-[13px] leading-none">{CAT_ICON[c.id]}</span>}
              {c.id === 'all' ? t('mkStudio.all') : c.id === 'commercial' ? t('mkStudio.commercial') : t(`presets.cat.${c.id}`)}
              {c.id === 'tiktok' && <span className="ml-0.5 rounded px-1 py-0.5 text-[8px] font-bold leading-none" style={{ background: LIME, color: '#fff' }}>{t('common.new')}</span>}
            </button>
          );
        })}
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleFormats.map((f) => (
            <div key={f.id} role="button" tabIndex={0} onClick={() => { setFormatId(f.id); setReplica(null); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setFormatId(f.id); setReplica(null); } }}
              className={`group relative text-left rounded-2xl overflow-hidden border transition aspect-[9/16] cursor-pointer ${formatId === f.id ? 'border-[#00b2fc] ring-2 ring-[#00b2fc]/40' : 'border-white/8 hover:border-white/20'}`}
              style={{ background: 'linear-gradient(160deg,#1b1d21,#141517)' }}>
              {EXAMPLE_VIDEOS[f.id] ? (
                <LazyVideo src={EXAMPLE_VIDEOS[f.id]} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-6xl opacity-80 transition group-hover:scale-110">{f.emoji}</div>
              )}
              {formatId === f.id && <div className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 z-10" style={{ background: LIME, color: '#fff' }}>{t('mkStudio.selected')}</div>}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <div className="text-[13px] font-bold tracking-tight">{t(`presets.fmt.${f.id}.label`)}</div>
                <div className="text-[10px] text-white/55 leading-tight mt-0.5 line-clamp-2">{t(`presets.fmt.${f.id}.desc`)}</div>
                {EXAMPLE_RECIPES[f.id] && (
                  <button onClick={(e) => { e.stopPropagation(); replicateExample(f.id); }}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition hover:brightness-110" style={{ background: LIME, color: '#fff' }}>
                    <Sparkles className="w-3 h-3" /> {t('mkStudio.remixThis')}
                  </button>
                )}
              </div>
              {EXAMPLE_VIDEOS[f.id] && (
                <button onClick={(e) => { e.stopPropagation(); setPreview(f.id); }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm grid place-items-center opacity-0 group-hover:opacity-100 transition hover:bg-black/75" title={t('mkStudio.expandPreview')}>
                  <Play className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {preview && EXAMPLE_VIDEOS[preview] && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur grid place-items-center p-4" onClick={() => setPreview(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <video src={EXAMPLE_VIDEOS[preview]} controls autoPlay loop playsInline
              className="max-h-[85vh] w-auto rounded-2xl border border-white/10 bg-black" style={{ aspectRatio: '9 / 16' }} />
            <button onClick={() => setPreview(null)} className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-black grid place-items-center shadow-lg"><X className="w-5 h-5" /></button>
            <div className="mt-3 text-center text-sm text-white/80">{(() => { const pf = AD_FORMATS.find((f) => f.id === preview); return pf ? t(`presets.fmt.${pf.id}.label`) : ''; })()} · {t('mkStudio.clickOutside')}</div>
          </div>
        </div>
      )}
    </main>
  );
}
