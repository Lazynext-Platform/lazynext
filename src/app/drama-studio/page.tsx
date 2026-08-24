'use client';
import { byokHeaders, useByokActive } from '@/lib/byok';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { AlertCircle, CheckCircle2, Download, Film, ImagePlus, Loader2, Pencil, RefreshCw, Video, Wand2, X } from 'lucide-react';
import { uploadDirectMediaIfSupported } from '@/lib/client-media-upload';
import { composeAdReel } from '@/lib/compose-client';
import { DRAMA_STYLES } from '@/lib/drama/prompt';
import { videoCredits } from '@/lib/video-pricing';
import { useI18n } from '@/i18n/provider';
import { useMounted } from '@/lib/use-mounted';

// Visual specs unified with lazynext-studio: dark #131416 + cyan #00b2fc + Space Grotesk
const ACCENT = '#00b2fc';
const INK = '#131416';
const PANEL = '#1c1e21';

type Character = { key: string; name: string; persona: string; appearance?: string };
type Script = {
  title?: string;
  logline?: string;
  sellingPoints?: string[];
  characters?: Character[];
  setting?: string;
  sceneImagePrompt?: string;
  productImagePrompt?: string;
  // durationSec/cast are AI-planned: each segment's duration is self-determined by pacing, cast marks appearing characters (portrait reference), product marks whether product appears in that segment.
  segments?: { i: number; durationSec?: number; cast?: string[]; product?: boolean; scene: string; action: string; dialogue?: string; hook?: string }[];
  climax?: string;
};
// imgGetUrl/vidGetUrl = Atlas task query URLs: persisted immediately after submission, so polling can resume after refresh/interruption without re-submitting or double-charging.
type ShotState = { img: 'idle' | 'run' | 'done' | 'fail'; vid: 'idle' | 'run' | 'done' | 'fail'; imgUrl?: string; vidUrl?: string; imgGetUrl?: string; vidGetUrl?: string; err?: string };
// Character portrait / scene image assets: generated before shot-by-shot, used as reference images to lock consistency during per-shot synthesis. getUrl also persisted for resume.
type AssetState = { status: 'idle' | 'run' | 'done' | 'fail'; url?: string; getUrl?: string; err?: string };
// User-uploaded product image (optional): used as reference image for product shots, locking the real product appearance. preview is local blob preview, url is the uploaded referenceable address.
type UploadAsset = { preview?: string; url?: string; uploading?: boolean }; // user-uploaded original product image (used directly as reference, no portrait generation)
// seedance-2.0/reference-to-video supports up to 9 reference images per shot; per-shot refs = product image + appearing character portraits + scene image.
// Product image limit 4: even with 4 characters + scene (5 images) in one shot, 4 product images fit (total 9) without exceeding; dynamically truncated by remaining quota at runtime.
const MAX_SHOT_REFS = 9;
const MAX_PRODUCT_IMAGES = 4;
// Generation progress persistence key: script/storyboard/portrait asset state stored in localStorage, auto-restores on refresh or page return, resumes from checkpoint.
// v2: script structure upgraded (character key/appearance, per-segment durationSec/cast, portrait assets), incompatible with v1, key changed to avoid restore errors from old data.
const DRAMA_SESSION_KEY = 'drama-session-v2';

const VIDEO_RATIOS = ['9:16', '16:9', '1:1'];
const VIDEO_RESOLUTIONS = ['480p', '720p', '1080p'];
// Per-segment duration options (AI gives a suggested value first, user can fine-tune per segment in the script card); matches backend normalizeVideoDuration supported range.
const VIDEO_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 12, 15];
const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-opacity='0.55' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";
const selStyle: React.CSSProperties = { backgroundImage: CHEVRON, backgroundPosition: 'right 8px center', backgroundSize: '10px', backgroundRepeat: 'no-repeat' };
// script/image (portraits + scene) use fixed COST; per-shot video uses dynamic videoCredits (see segVideoCost/videoEst).
const DRAMA_COSTS = { script: 5, image: 8, video: 12 };
// Per-shot video model: seedance-2.0/reference-to-video (product image + character portraits + scene image → direct output), consistent with backend.
const DRAMA_VIDEO_MODEL = 'bytedance/seedance-2.0/reference-to-video';
function dramaErrText(code: string, t: (k: string, vars?: Record<string, string | number>) => string) {
  if (code.startsWith('insufficient_credits:')) {
    const [, need, have] = code.split(':');
    return t('drama.errInsufficientCredits', { need, have });
  }
  if (code === 'insufficient_credits') return t('drama.errInsufficientCreditsShort');
  if (code.includes('Atlas chat timed out') || code === 'timeout') return t('drama.errScriptTimeout');
  if (code.startsWith('script_timeout_refunded')) return t('drama.errScriptTimeoutRefunded');
  if (code.startsWith('script_failed_refunded')) return t('drama.errScriptFailedRefunded');
  if (code === 'upload_failed' || code === 'read_failed') return t('drama.errUploadFailed');
  return t('drama.errGeneric', { code });
}

async function postJson(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...byokHeaders() }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail ? `${j.error || 'error'}: ${j.detail}` : (j.error || 'failed'));
  return j;
}
// File to dataURL (same as lazynext-studio): upload endpoint receives { dataUrl } JSON, not multipart.
function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read_failed'));
    r.readAsDataURL(file);
  });
}
function pollGen(getUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let n = 0;
    let transientErrors = 0;
    let lastError = '';
    const t = setInterval(async () => {
      n += 1;
      if (n > 300) { clearInterval(t); reject(new Error('timeout')); return; }
      try {
        const c = await postJson('/api/lazynext-studio/poll', { getUrl });
        // transient=true: Atlas status query gateway transient timeout (504), task likely still running; count doesn't reset, only gives up after too many consecutive (avoids silent spinning to timeout).
        if (c.transient) {
          transientErrors += 1;
          if (transientErrors >= 8) { clearInterval(t); reject(new Error('poll_gateway_unstable')); }
          return;
        }
        transientErrors = 0;
        if (c.status === 'completed') {
          const o = (Array.isArray(c.outputs) ? c.outputs : [])[0];
          clearInterval(t);
          o ? resolve(o) : reject(new Error('empty_output'));
        } else if (c.status === 'failed') { clearInterval(t); reject(new Error(c.error || 'failed')); }
      } catch (e) {
        transientErrors += 1;
        lastError = String((e as Error).message || e).slice(0, 240);
        if (transientErrors >= 8) {
          clearInterval(t);
          reject(new Error(lastError || 'poll_failed'));
        }
      }
    }, 3000);
  });
}

export default function DramaStudioPage() {
  const { status } = useSession();
  const mounted = useMounted();
  const { t } = useI18n();
  const byokActive = useByokActive();
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('epic');
  // Language dropdown removed: script language auto-follows the topic input language (see lib/drama/prompt.ts rule ⑩)
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [videoResolution, setVideoResolution] = useState('720p');
  // Number of storyboard segments: 'auto' = let AI decide based on plot; number = exactly specify how many segments (passed to backend targetSegments).
  const [segChoice, setSegChoice] = useState('auto');
  const [script, setScript] = useState<Script | null>(null);
  const [shots, setShots] = useState<ShotState[]>([]);
  // Character portraits (by character key) + scene image: generated before shot-by-shot, used as reference images to lock consistency during per-shot synthesis.
  const [charAssets, setCharAssets] = useState<Record<string, AssetState>>({});
  const [sceneAsset, setSceneAsset] = useState<AssetState>({ status: 'idle' });
  // User-uploaded product images (optional, retained across scripts): used as reference during product shot synthesis to lock product consistency.
  const [productAssets, setProductAssets] = useState<UploadAsset[]>([]); // multiple original product images (used directly as seedance reference)
  const [zoomImg, setZoomImg] = useState<string | null>(null); // character/scene/product image click-to-zoom preview
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ status: 'idle' | 'run' | 'done' | 'fail'; frac: number; note: string; url: string }>({ status: 'idle', frac: 0, note: '', url: '' });
  const [credits, setCredits] = useState<number | null>(null);
  const [creationId, setCreationId] = useState(''); // "work folder" id created on script generation; portrait/first-frame/video/final patch into its assets
  const [editingChar, setEditingChar] = useState<string | null>(null); // character key being edited for appearance prompt (expands edit box)
  const creationIdRef = useRef(creationId); // for runAssets/genOneShot closures to stably read the latest id (avoid stale)
  creationIdRef.current = creationId;
  const storyboardRef = useRef<HTMLDivElement>(null);
  const productInput = useRef<HTMLInputElement>(null);

  // Cost = portrait assets (1 per character + 1 scene, fixed COST) + per-shot video (dynamic, by resolution × per-segment duration). Before script is ready, use placeholder counts (3 characters/4 segments) for rough estimate.
  const charCount = script?.characters?.length || 3;
  const segCount = script?.segments?.length || 4;
  // Per-shot video dynamic billing: by current resolution + that segment's duration (seg.durationSec, default 8s).
  const segVideoCost = (seg?: { durationSec?: number }) => videoCredits(DRAMA_VIDEO_MODEL, videoResolution, seg?.durationSec || 8);
  const assetCost = (charCount + 1) * DRAMA_COSTS.image;
  const videoSum = script?.segments?.length
    ? script.segments.reduce((sum, seg) => sum + segVideoCost(seg), 0)
    : segCount * segVideoCost();
  const videoEst = assetCost + videoSum;
  const totalEst = DRAMA_COSTS.script + videoEst;
  const hasCreditsForScript = byokActive || status !== 'authenticated' || credits === null || credits >= DRAMA_COSTS.script;
  const hasCreditsForVideo = byokActive || status !== 'authenticated' || credits === null || credits >= videoEst;

  // ── Step-by-step generation: derived state + per-shot tools ──
  // Per-shot only allowed after portraits + scene are ready; stitching only after all shots' videos are done.
  // For product scripts (with product:true segments), product reference images must also be ready — otherwise product appearance is improvised per shot with text, inconsistent across shots.
  const needsProductRef = (script?.segments || []).some((s) => s.product);
  const assetsReady = (script?.characters || []).every((c) => charAssets[c.key]?.status === 'done' && !!charAssets[c.key]?.url) && sceneAsset.status === 'done' && !!sceneAsset.url && (!needsProductRef || productAssets.some((p) => !!p.url));
  const allVidsDone = !!script?.segments?.length && shots.length === script.segments.length && shots.every((s) => s.vid === 'done' && !!s.vidUrl);
  const anyShotRunning = shots.some((s) => s.img === 'run' || s.vid === 'run');
  // shotsRef: for genOneShot to read resume getUrl (avoid closure reading stale values); patchShot: functional update by index (concurrent clicks on multiple shots don't overwrite each other).
  const shotsRef = useRef<ShotState[]>(shots);
  shotsRef.current = shots;
  const patchShot = useCallback((i: number, patch: Partial<ShotState>) => {
    setShots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }, []);
  // Drama work folder: aggregates structured assets from current script + assets, overwrites into Creation at key milestones (my-work detail page displays by these sections).
  const buildDramaAssets = (chars: Record<string, AssetState>, scene: AssetState, shotList: ShotState[], productUrls?: string[]) => ({
    kind: 'drama' as const,
    title: script?.title || topic.slice(0, 60) || t('drama.untitledScript'),
    characters: (script?.characters || []).map((c) => ({ key: c.key, name: c.name, appearance: c.appearance || c.persona || '', portraitUrl: chars[c.key]?.url || null })),
    sceneImageUrl: scene?.url || null,
    productImageUrl: (productUrls?.[0] ?? productAssets.map((p) => p.url).filter(Boolean)[0]) || null,
    productImageUrls: (productUrls ?? productAssets.map((p) => p.url).filter((u): u is string => !!u)),
    scenes: (script?.segments || []).map((seg, i) => ({ i: seg.i ?? i + 1, scene: seg.scene || '', dialogue: seg.dialogue || '', frameUrl: shotList[i]?.imgUrl || null, videoUrl: shotList[i]?.vidUrl || null })),
  });
  const patchDramaAssets = async (chars: Record<string, AssetState>, scene: AssetState, shotList: ShotState[], productUrls?: string[]) => {
    const cid = creationIdRef.current;
    if (!cid) return;
    try {
      await fetch(`/api/creations/${cid}/assets`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...byokHeaders() }, body: JSON.stringify({ assets: buildDramaAssets(chars, scene, shotList, productUrls) }) });
    } catch { /* folder update failure doesn't block generation */ }
  };

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

  // ── Generation progress persistence (same as lazynext-studio): refresh/page-switch won't lose state, resume from checkpoint ──
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(DRAMA_SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (Date.now() - (s.ts || 0) > 24 * 3600_000) return; // only check freshness; restore inputs even without script (only filled topic/uploaded images), so login redirect return doesn't lose them
      if (typeof s.topic === 'string' && s.topic) setTopic(s.topic);
      // Restore generation parameters too: otherwise resolution resets to default on refresh, resumed shots would use wrong params (duration now follows per-segment durationSec, no longer a global value).
      if (VIDEO_RESOLUTIONS.includes(s.videoResolution)) setVideoResolution(s.videoResolution);
      if (VIDEO_RATIOS.includes(s.videoRatio)) setVideoRatio(s.videoRatio);
      // Portrait/scene asset restore: completed ones (with url) are reused on resume, no re-generation or double charge.
      if (s.charAssets && typeof s.charAssets === 'object') {
        const ca: Record<string, AssetState> = {};
        for (const [k, v] of Object.entries(s.charAssets as Record<string, AssetState>)) {
          // Same as shots: only keep completed (done+url) portraits, clear getUrl for incomplete ones to re-submit, don't poll stale old tasks
          ca[k] = (v.status === 'done' && !!v.url) ? { ...v } : { status: 'idle' };
        }
        setCharAssets(ca);
      }
      if (s.sceneAsset && typeof s.sceneAsset === 'object') {
        setSceneAsset((s.sceneAsset.status === 'done' && !!s.sceneAsset.url) ? { ...s.sceneAsset } : { status: 'idle' });
      }
      // Product image restore: use url as preview too (uploaded R2 url can be inlined directly).
      if (Array.isArray(s.productUrls)) setProductAssets((s.productUrls as string[]).filter(Boolean).map((u) => ({ preview: u, url: u })));
      else if (typeof s.productUrl === 'string' && s.productUrl) setProductAssets([{ preview: s.productUrl, url: s.productUrl }]);
      // Script/storyboard only restored when script actually exists (checkpoint resume)
      if (s.script?.segments?.length) {
        setScript(s.script);
        const restored: ShotState[] = (Array.isArray(s.shots) && s.shots.length === s.script.segments.length
          ? s.shots
          : s.script.segments.map(() => ({ img: 'idle', vid: 'idle' }))
        ).map((x: ShotState) => {
          // Only keep truly completed shots (done + url); incomplete ones reset to idle and clear getUrl —
          // otherwise resume would keep polling a possibly-stale old getUrl on a dead task and never re-submit (this was the root cause of "click generate but Atlas not called" in practice).
          const imgDone = x.img === 'done' && !!x.imgUrl;
          const vidDone = x.vid === 'done' && !!x.vidUrl;
          return {
            img: imgDone ? 'done' : 'idle', vid: vidDone ? 'done' : 'idle',
            imgUrl: imgDone ? x.imgUrl : undefined, vidUrl: vidDone ? x.vidUrl : undefined,
            imgGetUrl: imgDone ? x.imgGetUrl : undefined, vidGetUrl: vidDone ? x.vidGetUrl : undefined,
          } as ShotState;
        });
        setShots(restored);
      }
      if (typeof s.creationId === 'string') setCreationId(s.creationId);
    } catch { /* ignore broken session */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return; // also save when no script (only filled topic/uploaded images), so login OAuth redirect return doesn't lose them
    try {
      localStorage.setItem(DRAMA_SESSION_KEY, JSON.stringify({ script, shots, charAssets, sceneAsset, productUrls: productAssets.map((p) => p.url).filter(Boolean), topic, videoRatio, videoResolution, creationId, ts: Date.now() }));
    } catch { /* storage full etc. */ }
  }, [mounted, script, shots, charAssets, sceneAsset, productAssets, topic, videoRatio, videoResolution, creationId]);

  async function genScript() {
    if (status !== 'authenticated') { signIn('google'); return; }
    if (!topic.trim()) { setErr(t('drama.enterTopic')); return; }
    setErr(null); setNotice(null); setBusy('script'); setScript(null); setShots([]); setCharAssets({}); setSceneAsset({ status: 'idle' }); setCreationId(''); creationIdRef.current = ''; setCompose({ status: 'idle', frac: 0, note: '', url: '' });
    try {
      const currentCredits = await refreshCredits();
      if (!byokActive && currentCredits !== null && currentCredits < DRAMA_COSTS.script) {
        setErr(`insufficient_credits:${DRAMA_COSTS.script}:${currentCredits}`);
        setBusy(null);
        return;
      }
      // Segment count: 'auto' is fully up to AI; otherwise pass exact segment count. Per-segment duration is always AI-planned (can be fine-tuned later).
      setNotice(t('drama.aiWriting'));
      const j = await postJson('/api/drama-studio/script', { topic: topic.trim(), style, ...(segChoice !== 'auto' ? { segments: Number(segChoice) } : {}) }) as { script?: Script; model?: string };
      const s: Script = j.script || {};
      if (!s.segments?.length) throw new Error('script_empty');
      setScript(s); setShots((s.segments || []).map(() => ({ img: 'idle', vid: 'idle' })));
      setNotice(null);
      // Reset portrait assets on each new script generation, avoid carrying over previous drama's character images; auto-generated product images also reset (user-uploaded ones retained across scripts).
      setCharAssets({}); setSceneAsset({ status: 'idle' });
      // User-uploaded original product images retained across scripts (no auto-generated portraits to reset)
      // On script generation, immediately create this drama's folder in "My Work" (skeleton: characters + scene, urls filled in later); subsequent key milestones overwrite assets.
      try {
        const skeleton = {
          kind: 'drama',
          title: s.title || topic.slice(0, 60) || t('drama.untitledScript'),
          characters: (s.characters || []).map((c) => ({ key: c.key, name: c.name, appearance: c.appearance || c.persona || '', portraitUrl: null })),
          sceneImageUrl: null,
          scenes: (s.segments || []).map((seg, i) => ({ i: seg.i ?? i + 1, scene: seg.scene || '', dialogue: seg.dialogue || '', frameUrl: null, videoUrl: null })),
        };
        const st = await postJson('/api/creations/start', { type: 'drama-studio', title: skeleton.title, assets: skeleton });
        if (st?.id) { setCreationId(st.id); creationIdRef.current = st.id; }
      } catch { /* folder creation failure doesn't block script display */ }
      // Script area is below the input panel, smooth scroll to it after generation so user doesn't think "no response"
      setTimeout(() => storyboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } catch (e) { setNotice(null); setErr(e instanceof Error ? e.message : 'script_failed'); }
    setBusy(null);
    window.dispatchEvent(new Event('lazynext:credits'));
  }
  function editSeg(i: number, key: 'scene' | 'action' | 'dialogue', val: string) {
    setScript((prev) => {
      if (!prev?.segments) return prev;
      const segs = prev.segments.map((s, idx) => (idx === i ? { ...s, [key]: val } : s));
      return { ...prev, segments: segs };
    });
  }
  // After AI gives suggested duration, user can still fine-tune per segment (fully AI-driven but manual override preserved).
  function setSegDuration(i: number, sec: number) {
    setScript((prev) => {
      if (!prev?.segments) return prev;
      const segs = prev.segments.map((s, idx) => (idx === i ? { ...s, durationSec: sec } : s));
      return { ...prev, segments: segs };
    });
  }
  // Whether product appears in this segment (AI gives default, user can override per segment); after uploading product images, segments marked true will include product reference images during synthesis to lock consistency.
  function setSegProduct(i: number, on: boolean) {
    setScript((prev) => {
      if (!prev?.segments) return prev;
      const segs = prev.segments.map((s, idx) => (idx === i ? { ...s, product: on } : s));
      return { ...prev, segments: segs };
    });
  }
  // Upload product image (optional): reuses marketing's upload endpoint (receives { dataUrl } JSON, returns { url }). Product images retained across scripts, not cleared on regeneration.
  async function uploadOneProduct(file: File) {
    const dataUrl = await imageToDataUrl(file);
    if (dataUrl.length > 8_000_000) { setErr('image_too_large'); return; }
    const marker: UploadAsset = { preview: dataUrl, uploading: true };
    let added = false;
    setProductAssets((prev) => { if (prev.length >= MAX_PRODUCT_IMAGES) return prev; added = true; return [...prev, marker]; });
    if (!added) { setErr(t('drama.productMax', { n: MAX_PRODUCT_IMAGES })); return; }
    try {
      const j = await postJson('/api/lazynext-studio/upload', { dataUrl });
      setProductAssets((prev) => prev.map((p) => (p === marker ? { preview: dataUrl, url: j.url } : p)));
    } catch (e) {
      setProductAssets((prev) => prev.filter((p) => p !== marker));
      setErr(e instanceof Error ? e.message : 'upload_failed');
    }
  }
  // Upload product images (optional, multiple): reuses marketing upload endpoint; uses original images directly as seedance reference, retained across scripts.
  async function uploadProducts(files: FileList) {
    setErr(null);
    for (const f of Array.from(files)) await uploadOneProduct(f);
  }
  // ── STAGE A: generate all character portraits + scene image. Each job has independent catch (failure marks fail, doesn't drag down others), returns parsed asset map for per-shot direct passthrough. ──
  async function runAssets(): Promise<{ chars: Record<string, AssetState>; scene: AssetState; products?: string[] }> {
    const charList = script?.characters || [];
    const lc: Record<string, AssetState> = {};
    charList.forEach((c) => {
      const prev = charAssets[c.key];
      lc[c.key] = prev?.status === 'done' && prev.url ? { ...prev } : { status: 'idle', getUrl: prev?.getUrl };
    });
    let ls: AssetState = sceneAsset.status === 'done' && sceneAsset.url ? { ...sceneAsset } : { status: 'idle', getUrl: sceneAsset.getUrl };
    setCharAssets({ ...lc }); setSceneAsset({ ...ls });
    const syncChars = () => setCharAssets({ ...lc });
    const jobs: Promise<void>[] = charList.map((c) => (async () => {
      if (lc[c.key].status === 'done' && lc[c.key].url) return;
      lc[c.key] = { status: 'run', getUrl: lc[c.key].getUrl }; syncChars();
      try {
        if (!lc[c.key].getUrl) {
          const p = `Full-body character reference sheet of ${c.name}. ${c.appearance || c.persona}. Standing in a neutral studio, plain background, ultra-photorealistic cinematic, natural soft lighting, sharp facial detail, no text no watermark no logo.`;
          const im = await postJson('/api/drama-studio/shot-image', { prompt: p, ratio: '3:4' });
          lc[c.key] = { ...lc[c.key], getUrl: im.getUrl }; syncChars();
        }
        const url = await pollGen(lc[c.key].getUrl!);
        lc[c.key] = { status: 'done', url, getUrl: lc[c.key].getUrl }; syncChars();
      } catch (e) {
        lc[c.key] = { status: 'fail', err: e instanceof Error ? e.message : 'failed' }; syncChars(); // clear getUrl, retry re-submits
      }
    })());
    jobs.push((async () => {
      if (ls.status === 'done' && ls.url) return;
      ls = { status: 'run', getUrl: ls.getUrl }; setSceneAsset({ ...ls });
      try {
        if (!ls.getUrl) {
          const p = `${script?.sceneImagePrompt || script?.setting || 'cinematic establishing shot'}. Cinematic establishing shot, wide angle, no people, dramatic lighting, film grain, no text no watermark.`;
          const im = await postJson('/api/drama-studio/shot-image', { prompt: p, ratio: videoRatio });
          ls = { ...ls, getUrl: im.getUrl }; setSceneAsset({ ...ls });
        }
        const url = await pollGen(ls.getUrl!);
        ls = { status: 'done', url, getUrl: ls.getUrl }; setSceneAsset({ ...ls });
      } catch (e) {
        ls = { status: 'fail', err: e instanceof Error ? e.message : 'failed' }; setSceneAsset({ ...ls });
      }
    })());
    // Product images: use user-uploaded original images directly as seedance reference, no longer auto-generate "portraits" (user requested using originals for fidelity).
    const productUrls = productAssets.map((p) => p.url).filter((u): u is string => !!u);
    await Promise.all(jobs);
    void patchDramaAssets(lc, ls, shotsRef.current, productUrls); // portraits/scene/product done → update folder
    return { chars: lc, scene: ls, products: productUrls };
  }

  // STAGE A button: generate/complete portraits + scene image (failed ones can retry)
  async function genAssets() {
    if (status !== 'authenticated') { signIn('google'); return; }
    if (!script) return;
    setErr(null); setBusy('assets');
    try {
      const currentCredits = await refreshCredits();
      const charList = script.characters || [];
      const needProduct = 0; // product images use user-uploaded originals, no longer auto-generated or charged
      const need = (charList.filter((c) => !(charAssets[c.key]?.status === 'done' && charAssets[c.key]?.url)).length + (sceneAsset.status === 'done' && sceneAsset.url ? 0 : 1) + needProduct) * DRAMA_COSTS.image;
      if (!byokActive && currentCredits !== null && currentCredits < need) { setErr(`insufficient_credits:${need}:${currentCredits}`); return; }
      await runAssets();
    } finally {
      setBusy(null);
      window.dispatchEvent(new Event('lazynext:credits'));
    }
  }

  // Single character portrait (re)generation: reuses single-character logic, syncs folder on completion. User can edit appearance then re-generate a specific character (doesn't affect others).
  async function genOneCharacter(key: string) {
    if (status !== 'authenticated') { signIn('google'); return; }
    const c = script?.characters?.find((x) => x.key === key);
    if (!c) return;
    setErr(null);
    setCharAssets((prev) => ({ ...prev, [key]: { status: 'run' } }));
    try {
      const p = `Full-body character reference sheet of ${c.name}. ${c.appearance || c.persona}. Standing in a neutral studio, plain background, ultra-photorealistic cinematic, natural soft lighting, sharp facial detail, no text no watermark no logo.`;
      const im = await postJson('/api/drama-studio/shot-image', { prompt: p, ratio: '3:4' });
      const url = await pollGen(im.getUrl);
      setCharAssets((prev) => {
        const next = { ...prev, [key]: { status: 'done' as const, url, getUrl: im.getUrl } };
        void patchDramaAssets(next, sceneAsset, shotsRef.current); // portrait updated → sync folder
        return next;
      });
    } catch (e) {
      setCharAssets((prev) => ({ ...prev, [key]: { status: 'fail', err: e instanceof Error ? e.message : 'failed' } }));
    } finally {
      window.dispatchEvent(new Event('lazynext:credits'));
    }
  }
  // Edit a character's English appearance prompt (click "Regenerate" after editing to produce a new portrait).
  function editCharAppearance(key: string, val: string) {
    setScript((prev) => (prev ? { ...prev, characters: (prev.characters || []).map((c) => (c.key === key ? { ...c, appearance: val } : c)) } : prev));
  }
  // Standalone (re)generate scene image: can retry individually after failure (no need to rerun everything), syncs folder on completion.
  async function genOneScene() {
    if (status !== 'authenticated') { signIn('google'); return; }
    if (!script) return;
    setErr(null);
    setSceneAsset({ status: 'run' });
    try {
      const p = `${script.sceneImagePrompt || script.setting || 'cinematic establishing shot'}. Cinematic establishing shot, wide angle, no people, dramatic lighting, film grain, no text no watermark.`;
      const im = await postJson('/api/drama-studio/shot-image', { prompt: p, ratio: videoRatio });
      const url = await pollGen(im.getUrl);
      const done: AssetState = { status: 'done', url, getUrl: im.getUrl };
      setSceneAsset(done);
      void patchDramaAssets(charAssets, done, shotsRef.current); // scene image updated → sync folder
    } catch (e) {
      setSceneAsset({ status: 'fail', err: e instanceof Error ? e.message : 'failed' });
    } finally {
      window.dispatchEvent(new Event('lazynext:credits'));
    }
  }

  // ── Per-shot generation: first frame (edit, with portrait/scene/product reference) + i2v. Functional update by index, running-state guard prevents concurrent/double-click re-submission. ctx passes assets to avoid reading stale state. ──
  async function genOneShot(i: number, ctx?: { chars: Record<string, AssetState>; scene: AssetState; products?: string[] }): Promise<boolean> {
    const seg = script?.segments?.[i];
    if (!seg) return false;
    const chars = ctx?.chars || charAssets;
    const scene = ctx?.scene || sceneAsset;
    const cur = shotsRef.current[i] || ({ img: 'idle', vid: 'idle' } as ShotState);
    if (cur.vid === 'done' && cur.vidUrl) return true;
    if (cur.img === 'run' || cur.vid === 'run') return false; // running-state guard: prevent concurrent/double-click re-submission charge
    patchShot(i, { err: undefined });
    try {
      // Compose reference images + @imageN bindings: product image (product segments) + appearing character portraits + scene image, fed to reference-to-video for direct output
      // (no longer first edit-composite first frame then i2v — one less step of loss, product/character/scene consistency locked by multi-reference).
      // refs order = product image + appearing character portraits + scene image, fed to reference-to-video; @imageN binds in order.
      // seedance limit 9: character and scene consistency is most critical, occupy first; product images use remaining quota, truncated if exceeded.
      const prodRefs = ctx?.products ?? productAssets.map((p) => p.url).filter((u): u is string => !!u);
      const castUrls = (seg.cast || []).map((k) => ({ k, u: chars[k]?.url })).filter((x): x is { k: string; u: string } => !!x.u);
      const sceneUsed = scene.url ? 1 : 0;
      const productBudget = Math.max(0, MAX_SHOT_REFS - castUrls.length - sceneUsed);
      const useProducts = seg.product ? prodRefs.slice(0, productBudget) : [];
      const refs: string[] = [];
      const parts: string[] = [];
      useProducts.forEach((u) => { refs.push(u); parts.push(`@image${refs.length} is the product — keep its packaging, logo, colors and text pixel-identical, do not redesign it`); });
      castUrls.forEach(({ k }) => {
        if (refs.length >= MAX_SHOT_REFS) return;
        refs.push(chars[k]!.url!);
        const nm = script?.characters?.find((c) => c.key === k)?.name || k;
        parts.push(`@image${refs.length} is ${nm} — keep the same face, hairstyle and outfit`);
      });
      if (scene.url && refs.length < MAX_SHOT_REFS) { refs.push(scene.url); parts.push(`@image${refs.length} is the scene/environment`); }
      const vidPrompt = `${parts.join('. ')}. Cinematic film shot. ${seg.scene}. ${seg.action}. ${seg.dialogue ? `The characters speak this dialogue OUT LOUD with clear audible spoken voice and natural lip-sync: ${seg.dialogue}` : 'Natural ambient sound.'} Dramatic, WITH SOUND and spoken audio. No subtitles, no captions, no on-screen text or watermark.`;

      patchShot(i, { img: 'done' }); // reference-to-video outputs in one step, no separate "composite first frame" step
      let vGetUrl = shotsRef.current[i]?.vidGetUrl;
      patchShot(i, { vid: 'run' });
      if (!vGetUrl) {
        const vd = await postJson('/api/lazynext-studio/shot-video', { referenceImages: refs, prompt: vidPrompt, ratio: videoRatio, resolution: videoResolution, duration: seg.durationSec || 8 });
        vGetUrl = vd.getUrl; patchShot(i, { vidGetUrl: vGetUrl });
      }
      let vidUrl: string;
      try { vidUrl = await pollGen(vGetUrl!); }
      catch (e) { patchShot(i, { vidGetUrl: undefined }); throw e; }
      patchShot(i, { vid: 'done', vidUrl });
      // ⚠️ Cannot directly use shotsRef.current: setShots is async, at this moment ref still holds old values (this shot's vidUrl not included), would cause folder to "miss the last shot". Explicitly merge this shot then patch.
      const nextShots = shotsRef.current.map((s, idx) => (idx === i ? { ...s, img: 'done' as const, vid: 'done' as const, vidUrl } : s));
      void patchDramaAssets(ctx?.chars || charAssets, ctx?.scene || sceneAsset, nextShots, ctx?.products ?? productAssets.map((p) => p.url).filter((u): u is string => !!u)); // this shot done → update folder
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'failed';
      setShots((prev) => prev.map((s, idx) => (idx === i ? { ...s, img: s.img === 'run' ? 'fail' : s.img, vid: s.vid === 'run' ? 'fail' : s.vid, err: msg } : s)));
      return false;
    } finally {
      window.dispatchEvent(new Event('lazynext:credits'));
    }
  }

  // One-click all: ensure assets ready → generate each shot sequentially (failure doesn't interrupt) → auto-stitch when all done. Each shot can retry individually.
  async function genAllShots() {
    if (status !== 'authenticated') { signIn('google'); return; }
    if (!script?.segments?.length) return;
    setErr(null); setBusy('all'); setCompose({ status: 'idle', frac: 0, note: '', url: '' });
    if (shots.length !== script.segments.length) {
      setShots(script.segments.map((_, idx) => (shots[idx] && shots[idx].vid === 'done' && shots[idx].vidUrl ? shots[idx] : ({ img: 'idle', vid: 'idle' } as ShotState))));
    }
    try {
      let ctx: { chars: Record<string, AssetState>; scene: AssetState; products?: string[] } = { chars: charAssets, scene: sceneAsset, products: productAssets.map((p) => p.url).filter((u): u is string => !!u) };
      if (!assetsReady) {
        ctx = await runAssets();
        const ready = (script.characters || []).every((c) => ctx.chars[c.key]?.status === 'done' && !!ctx.chars[c.key]?.url) && ctx.scene.status === 'done' && !!ctx.scene.url
          && (!(script.segments || []).some((s) => s.product) || (ctx.products?.length ?? 0) > 0); // product scripts must have product images, otherwise product inconsistent across shots
        if (!ready) { setErr(t('drama.someRefsFailed')); return; }
      }
      for (let i = 0; i < script.segments.length; i++) {
        if (shotsRef.current[i]?.vid === 'done' && shotsRef.current[i]?.vidUrl) continue;
        await genOneShot(i, ctx); // failure doesn't interrupt, continue to next shot
      }
      if (script.segments.every((_, i) => shotsRef.current[i]?.vid === 'done' && shotsRef.current[i]?.vidUrl)) {
        await composeVideo();
      }
    } finally {
      setBusy(null);
      window.dispatchEvent(new Event('lazynext:credits'));
    }
  }

  // Stitch final + archive (after all shots' videos are done). Doesn't occupy busy, uses compose.status to track separately.
  async function composeVideo() {
    const segs = script?.segments || [];
    if (!segs.length || !segs.every((_, i) => shotsRef.current[i]?.vid === 'done' && shotsRef.current[i]?.vidUrl)) return;
    const vidUrls = segs.map((_, i) => shotsRef.current[i]?.vidUrl).filter((u): u is string => !!u);
    const firstImg = shotsRef.current[0]?.imgUrl || '';
    let cid = creationIdRef.current || creationId;
    if (!cid) {
      // Normally folder is created during script generation; this is a fallback (rarely reached).
      try { const st = await postJson('/api/creations/start', { type: 'drama-studio', title: script?.title || topic.slice(0, 60) || t('drama.untitledScript'), assets: buildDramaAssets(charAssets, sceneAsset, shotsRef.current) }); cid = st.id; setCreationId(cid); creationIdRef.current = cid; } catch { /* placeholder failure doesn't block */ }
    }
    try {
      setCompose({ status: 'run', frac: 0, note: t('drama.startingStitch'), url: '' });
      const blob = await composeAdReel(vidUrls, (p) => setCompose((c) => ({ ...c, status: 'run', frac: p.frac, note: p.note })));
      setCompose({ status: 'done', frac: 1, note: t('drama.done2'), url: URL.createObjectURL(blob) });
      try {
        const title = script?.title || topic.slice(0, 60) || 'Drama';
        const directUrl = await uploadDirectMediaIfSupported(blob, {
          kind: 'reel',
          filename: 'reel.mp4',
        });
        if (directUrl) {
          await postJson('/api/lazynext-studio/save-reel', {
            url: directUrl,
            title,
            type: 'drama-studio',
            thumbnail: firstImg,
            shots: vidUrls,
            creationId: cid || '',
          });
        } else {
          const fd = new FormData();
          fd.append('file', blob, 'reel.mp4');
          fd.append('title', title);
          fd.append('type', 'drama-studio');
          fd.append('thumbnail', firstImg);
          fd.append('shots', JSON.stringify(vidUrls));
          if (cid) fd.append('creationId', cid);
          await fetch('/api/lazynext-studio/save-reel', { method: 'POST', body: fd });
        }
      } catch { /* ignore history save failure */ }
      // Don't clear creationId: folder has saved the final video, keep id so character edits/regeneration can still patch after final; next genScript will reset.
    } catch (e) {
      setCompose((c) => (c.status === 'run' ? { ...c, status: 'fail', note: e instanceof Error ? e.message : 'compose_failed' } : c));
      if (cid) fetch(`/api/creations/${cid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...byokHeaders() }, body: JSON.stringify({ status: 'failed', error: e instanceof Error ? e.message : 'compose_failed' }) }).catch(() => {});
    }
  }

  const gridBg = {
    backgroundColor: INK,
    colorScheme: 'dark',
    backgroundImage:
      'radial-gradient(70% 55% at 50% -6%, rgba(0,178,252,0.10) 0%, rgba(0,178,252,0) 60%), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
    backgroundSize: 'auto, 44px 44px, 44px 44px',
  } as React.CSSProperties;
  const selCls = 'appearance-none bg-white/[0.04] rounded-lg pl-2.5 pr-7 py-2 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-[#00b2fc]';

  // Top-level hydration gate: first frame renders a uniform empty skeleton, avoiding session/locale SSR≠client divergence (#418).
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
          <a href="/lazynext-studio" className="text-xs text-white/60 hover:text-white transition">{t('drama.adStudio')}</a>
          <a href="/" className="text-xs text-white/60 hover:text-white transition">{t('drama.allApps')}</a>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center pt-14 pb-10 px-6">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/50 font-medium mb-3" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", sans-serif' }}>{t('drama.kicker')}</div>
        <h1 className="font-bold uppercase leading-[1.08] tracking-[-0.03em] text-[clamp(40px,5.4vw,58px)] text-white/90" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif' }}>
          {t('drama.titlePre')}<br />{t('drama.titleMid')}<span style={{ color: ACCENT }}>{t('drama.titleHl')}</span>
        </h1>
      </div>

      {/* Generator panel */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-3xl border border-white/[0.06] p-4 sm:p-5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]" style={{ background: PANEL }}>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3}
            placeholder={t('drama.placeholder')}
            className="w-full bg-transparent text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-white/30 px-1 pt-1" />
          <div className="flex items-center gap-2 flex-wrap mt-3">
            {DRAMA_STYLES.map((s) => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition border ${style === s.id ? 'border-[#00b2fc] bg-[#00b2fc]/15 text-white' : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]'}`}>
                <span>{s.emoji}</span>{t(`drama.style${s.id.charAt(0).toUpperCase()}${s.id.slice(1)}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <select value={segChoice} onChange={(e) => setSegChoice(e.target.value)} className={selCls} style={selStyle} title={t('drama.scenesTitle')}>
              <option value="auto">{t('drama.scenesAuto')}</option>
              {[2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={String(n)}>{t('drama.scenesN', { n })}</option>)}
            </select>
            <select value={videoRatio} onChange={(e) => setVideoRatio(e.target.value)} className={selCls} style={selStyle} title={t('drama.aspectRatio')}>{VIDEO_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            <select value={videoResolution} onChange={(e) => setVideoResolution(e.target.value)} className={selCls} style={selStyle} title={t('drama.resolution')}>{VIDEO_RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] text-white/45 bg-white/[0.03] border border-white/10" title={t('drama.aiTimingTitle')}>⏱️ {t('drama.aiTiming')}</span>
            {/* Product image upload (optional): product drama uses your real product to lock consistency */}
            <input ref={productInput} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const fs = e.target.files; if (fs && fs.length) void uploadProducts(fs); e.currentTarget.value = ''; }} />
            {productAssets.map((pa, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-white/10">
                <span className="relative w-6 h-6 rounded overflow-hidden bg-black/30 shrink-0">
                  {pa.preview && <img src={pa.preview} alt="product" className={`w-full h-full object-cover ${pa.url ? 'cursor-zoom-in' : ''}`} onClick={() => pa.url && setZoomImg(pa.url)} />}
                  {pa.uploading && <span className="absolute inset-0 bg-black/60 grid place-items-center"><Loader2 className="w-3 h-3 animate-spin text-white" /></span>}
                </span>
                <button onClick={() => setProductAssets((prev) => prev.filter((_, k) => k !== idx))} title={t('drama.remove')} className="text-white/40 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {productAssets.length < MAX_PRODUCT_IMAGES && (
              <button onClick={() => productInput.current?.click()} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] text-white/55 bg-white/[0.03] border border-white/10 hover:border-[#00b2fc]/60 transition" title={t('drama.uploadProductTitle', { max: MAX_PRODUCT_IMAGES })}>
                <ImagePlus className="w-3.5 h-3.5" />{t('drama.uploadProduct', { n: productAssets.length, max: MAX_PRODUCT_IMAGES })}
              </button>
            )}
            <button onClick={genScript} disabled={busy !== null || !hasCreditsForScript}
              className="ml-auto px-6 py-2.5 rounded-xl font-extrabold text-sm inline-flex items-center gap-2 disabled:opacity-50 transition hover:brightness-110"
              style={{ background: `radial-gradient(90% 90% at 50% 120%, #22d3ee 0%, rgba(167,139,250,0) 60%), ${ACCENT}`, color: '#fff' }}>
              {busy === 'script' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {byokActive ? t('drama.writeScript') : <>{!hasCreditsForScript ? t('drama.notEnoughCredits') : t('drama.writeScript')} · ✦{DRAMA_COSTS.script}</>}
            </button>
          </div>
          {status === 'authenticated' && (
            <div className="mt-3 text-center text-[11px] text-white/35">
              {byokActive
                ? t('drama.byokHint')
                : t('drama.costEstimate', { total: totalEst, script: DRAMA_COSTS.script, asset: assetCost, per: segVideoCost(), balance: credits ?? '·' })}
            </div>
          )}
        </div>
      </div>

      {zoomImg && (
        <div onClick={() => setZoomImg(null)} className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out" role="dialog" aria-modal="true">
          <img src={zoomImg} alt="preview" className="max-w-[94vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setZoomImg(null)} className="absolute top-4 right-4 text-white/70 hover:text-white" aria-label="close"><X className="w-6 h-6" /></button>
        </div>
      )}
      {err && <div className="max-w-4xl mx-auto px-4 mt-6"><div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4" />{t('drama.error')}: {dramaErrText(err, t)}</div></div>}
      {notice && <div className="max-w-4xl mx-auto px-4 mt-6"><div className="flex items-center gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4" />{notice}</div></div>}

      {/* Script display */}
      {script && (
        <div ref={storyboardRef} className="max-w-3xl mx-auto px-4 py-10 scroll-mt-6">
          <div className="rounded-3xl border border-white/[0.06] p-5" style={{ background: PANEL }}>
            <div className="flex items-center gap-2 mb-1"><Wand2 className="w-4 h-4" style={{ color: ACCENT }} /><b className="text-lg">{script.title || t('drama.untitledScript')}</b></div>
            {script.logline && <p className="text-sm text-white/60 mb-3">{script.logline}</p>}
            {!!script.characters?.length && (
              <div className="mb-4">
                <div className="text-xs text-white/45 mb-2">🎭 {t('drama.castTitle')}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {script.characters.map((c) => {
                    const a = charAssets[c.key];
                    return (
                      <div key={c.key} className="rounded-xl border border-white/10 bg-black/20 p-2">
                        <div className="flex gap-2 items-center">
                          <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 grid place-items-center">
                            {a?.url ? <img src={a.url} alt={c.name} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setZoomImg(a.url!)} />
                              : a?.status === 'run' ? <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                              : a?.status === 'fail' ? <AlertCircle className="w-4 h-4 text-red-400" />
                              : <span className="text-lg opacity-60">🎭</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate" style={{ color: ACCENT }}>{c.name}</div>
                            <div className="text-[10px] text-white/50 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.persona}</div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => genOneCharacter(c.key)} disabled={a?.status === 'run' || busy === 'assets' || busy === 'all'} title={t('drama.regeneratePortrait')} className="p-1 rounded hover:bg-white/10 disabled:opacity-40 transition"><RefreshCw className={`w-3.5 h-3.5 text-white/60 ${a?.status === 'run' ? 'animate-spin' : ''}`} /></button>
                            <button onClick={() => setEditingChar(editingChar === c.key ? null : c.key)} title={t('drama.editAppearance')} className={`p-1 rounded hover:bg-white/10 transition ${editingChar === c.key ? 'bg-white/10' : ''}`}><Pencil className="w-3.5 h-3.5 text-white/60" /></button>
                          </div>
                        </div>
                        {editingChar === c.key && (
                          <div className="mt-2">
                            <textarea value={c.appearance || ''} onChange={(e) => editCharAppearance(c.key, e.target.value)} rows={3} placeholder={t('drama.appearancePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white/80 resize-y focus:outline-none focus:border-[#00b2fc]" />
                            <button onClick={() => { setEditingChar(null); void genOneCharacter(c.key); }} disabled={a?.status === 'run'} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg disabled:opacity-40 transition" style={{ background: ACCENT, color: '#fff' }}><RefreshCw className="w-3 h-3" />{t('drama.regenerateCost', { n: DRAMA_COSTS.image })}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(script.setting || sceneAsset.status !== 'idle') && (
              <div className="flex items-center gap-2 text-xs text-white/45 mb-4">
                {sceneAsset.status !== 'idle' && (
                  <span className="w-11 h-7 rounded overflow-hidden bg-white/5 border border-white/10 grid place-items-center shrink-0">
                    {sceneAsset.url ? <img src={sceneAsset.url} className="w-full h-full object-cover cursor-zoom-in" alt="scene" onClick={() => setZoomImg(sceneAsset.url!)} />
                      : sceneAsset.status === 'run' ? <Loader2 className="w-3 h-3 animate-spin text-white/50" />
                      : sceneAsset.status === 'fail' ? <AlertCircle className="w-3 h-3 text-red-400" /> : null}
                  </span>
                )}
                <span className="flex-1 min-w-0 truncate">🎬 {t('drama.setting')}: {script.setting}</span>
                {sceneAsset.status === 'fail' && sceneAsset.err && <span className="text-red-400 truncate max-w-[28%]" title={sceneAsset.err}>{dramaErrText(sceneAsset.err, t)}</span>}
                <button onClick={genOneScene} disabled={sceneAsset.status === 'run' || busy === 'assets' || busy === 'all'} title={t('drama.regenerateScene')} className="p-1 rounded hover:bg-white/10 disabled:opacity-40 transition shrink-0"><RefreshCw className={`w-3.5 h-3.5 text-white/60 ${sceneAsset.status === 'run' ? 'animate-spin' : ''}`} /></button>
              </div>
            )}
            <div className="space-y-2">
              {(script.segments || []).map((seg, i) => {
                const st = shots[i];
                return (
                  <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[11px] rounded-full px-2 py-0.5 bg-white/5 border border-white/10" style={{ color: ACCENT }}>{t('drama.sceneN', { n: seg.i })}</span>
                      {/* Per-segment duration: AI gives suggested value, user can fine-tune */}
                      <select value={seg.durationSec || 8} onChange={(e) => setSegDuration(i, Number(e.target.value))} className="appearance-none bg-white/[0.06] rounded px-1.5 py-0.5 text-[10px] text-white/80 focus:outline-none focus:ring-1 focus:ring-[#00b2fc]" title={t('drama.sceneDuration')}>{VIDEO_DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}</select>
                      {/* Appearing characters (corresponding portrait references) */}
                      {(seg.cast || []).map((k) => {
                        const c = script.characters?.find((x) => x.key === k);
                        return c ? <span key={k} className="text-[10px] rounded-full px-1.5 py-0.5 bg-[#00b2fc]/15 border border-[#00b2fc]/30 text-white/70">{c.name}</span> : null;
                      })}
                      {/* Product appearance toggle: only shown when product images are uploaded; lit segments include product reference during synthesis to lock consistency */}
                      {productAssets.some((p) => p.url) && (
                        <button onClick={() => setSegProduct(i, !seg.product)} title={t('drama.productToggleTitle')} className={`text-[10px] rounded-full px-1.5 py-0.5 border transition ${seg.product ? 'bg-[#00b2fc]/20 border-[#00b2fc]/50 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>🛍️ {t('drama.product')}</button>
                      )}
                      {seg.hook && <span className="text-[10px] text-white/40">💡 {seg.hook}</span>}
                      {st && <StatusChip icon={<Video className="w-3 h-3" />} label={t('drama.image')} s={st.img} />}
                      {st && <StatusChip icon={<Film className="w-3 h-3" />} label={t('drama.video')} s={st.vid} />}
                    </div>
                    <input value={seg.scene} onChange={(e) => editSeg(i, 'scene', e.target.value)} className="w-full mb-1.5 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-[#00b2fc]" placeholder={t('drama.shotFraming')} />
                    <textarea value={seg.action} onChange={(e) => editSeg(i, 'action', e.target.value)} rows={2} className="w-full mb-1.5 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 resize-y focus:outline-none focus:border-[#00b2fc]" placeholder={t('drama.plotAction')} />
                    <input value={seg.dialogue || ''} onChange={(e) => editSeg(i, 'dialogue', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-[#00b2fc]" placeholder={t('drama.dialogueOptional')} />
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <button onClick={() => genOneShot(i)} disabled={!assetsReady || busy === 'all' || busy === 'assets' || st?.img === 'run' || st?.vid === 'run'} title={!assetsReady ? t('drama.genPortraitsFirst') : ''} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 transition" style={st?.vid === 'done' ? { border: '1px solid rgba(255,255,255,0.15)', color: '#fff' } : { background: ACCENT, color: '#fff' }}>
                        {(st?.img === 'run' || st?.vid === 'run') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                        {st?.vid === 'done' ? t('drama.regenerate') : (st?.img === 'fail' || st?.vid === 'fail') ? t('drama.retry') : t('drama.generateShot', { n: segVideoCost(seg) })}
                      </button>
                      {st?.vid === 'done' && !!st?.vidUrl && <span className="text-[11px] text-emerald-400">✓ {t('drama.done')}</span>}
                      {st?.err && <span className="text-[11px] text-red-400 truncate max-w-[55%]" title={st.err}>{dramaErrText(st.err, t)}</span>}
                    </div>
                    {st?.vid === 'done' && st.vidUrl && (
                      <video src={st.vidUrl} poster={st.imgUrl} controls playsInline className="mt-2 w-full max-w-[220px] rounded-lg border border-white/10 bg-black" />
                    )}
                  </div>
                );
              })}
            </div>
            {script.climax && <div className="mt-3 text-xs text-white/50">🔥 {t('drama.climax')}: {script.climax}</div>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* ① Generate portraits + scene first (failed ones can retry, only re-runs incomplete) */}
              <button onClick={genAssets} disabled={busy !== null || anyShotRunning} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold disabled:opacity-50 border border-white/15 hover:border-[#00b2fc] transition">
                {busy === 'assets' ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-sm">①</span>} {assetsReady ? t('drama.referenceReady') : t('drama.portraitsScene', { n: assetCost })}
              </button>
              {/* ② Generate all: sequential per-shot, one shot failing doesn't affect others, can retry individually */}
              <button onClick={genAllShots} disabled={busy !== null || !hasCreditsForVideo || anyShotRunning} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold disabled:opacity-50" style={{ background: ACCENT, color: '#fff' }}>
                {busy === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} {byokActive ? t('drama.generateAll') : <>{!hasCreditsForVideo ? t('drama.notEnoughCredits') : t('drama.generateAll')} · ✦{videoEst}</>}
              </button>
              {/* ③ Stitch: only clickable after all shot videos are done */}
              <button onClick={composeVideo} disabled={!allVidsDone || busy !== null || compose.status === 'run' || anyShotRunning} title={allVidsDone ? '' : t('drama.stitchTitle')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold disabled:opacity-40 border border-white/15 hover:border-[#00b2fc] transition">
                {compose.status === 'run' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />} {t('drama.stitchFinal')}
              </button>
            </div>
            <div className="text-[11px] text-white/40 mt-2">{t('drama.keepPageOpen')}</div>
          </div>
        </div>
      )}

      {/* Final video */}
      {compose.status !== 'idle' && (
        <div className="max-w-3xl mx-auto px-4 pb-16">
          <div className="rounded-3xl border border-white/[0.06] p-5" style={{ background: PANEL }}>
            <div className="flex items-center gap-2 text-sm mb-2">
              {compose.status === 'done' ? <CheckCircle2 className="w-4 h-4" style={{ color: ACCENT }} /> : compose.status === 'fail' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />}
              <b>{compose.status === 'done' ? t('drama.videoReady') : compose.status === 'fail' ? t('drama.stitchingFailed') : t('drama.stitching')}</b><span className="text-xs text-white/40">{compose.note}</span>
            </div>
            {compose.status === 'run' && <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full transition-all" style={{ width: `${Math.round(compose.frac * 100)}%`, background: ACCENT }} /></div>}
            {compose.url && (
              <div className="mt-3">
                <video controls autoPlay muted src={compose.url} className="w-full max-w-[300px] rounded-xl border border-white/10" />
                <a href={compose.url} download="drama.mp4" className="mt-2 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-white/15 hover:border-[#00b2fc]"><Download className="w-4 h-4" />{t('drama.download')}</a>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function StatusChip({ icon, label, s }: { icon: React.ReactNode; label: string; s: 'idle' | 'run' | 'done' | 'fail' }) {
  const cls = s === 'done' ? 'text-[#00b2fc]' : s === 'run' ? 'text-white' : s === 'fail' ? 'text-red-400' : 'text-white/30';
  return <span className={`inline-flex items-center gap-1 text-[10px] ${cls}`}>{s === 'run' ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}{label}</span>;
}
