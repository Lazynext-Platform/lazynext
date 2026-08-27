'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/i18n/provider';
import { AssetPicker } from '@/components/AssetPicker';
import { useMounted } from '@/lib/use-mounted';
import { uploadDirectMediaIfSupported } from '@/lib/client-media-upload';
import { videoCredits } from '@/lib/video-pricing';

// Viral ad remake (Ad Reference): paste a viral ad → swap in your product/presenter/voice, same hook same energy.
// No-login direct flow (same as lazynext-studio): upload → edit (gemini-omni video-edit) → optional voice+lipsync → R2 final video.
// bg #131416 · panel #1c1e21 · accent #00b2fc · Space Grotesk

const GROTESK = 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif';
const VOICES = [
  { id: 'hpp4J3VqNfWAUOO0d1Us', labelKey: 'adRef.voiceFemaleBright' },
  { id: 'EXAVITQu4vr4xnSDxMaL', labelKey: 'adRef.voiceFemaleWarm' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', labelKey: 'adRef.voiceMaleRelaxed' },
];
// voice (TTS dubbing) uses fixed COST; edit/motion (video) and lipsync use dynamic videoCredits.
const AD_COSTS = { edit: 15, character: 15, voice: 10, lipsync: 2 };
// Video models (consistent with backend lib/ad-reference.ts): edit/character = omni video-edit, lipsync = veed.
const EDIT_VIDEO_MODEL = 'google/gemini-omni-flash/video-edit';
const LIPSYNC_MODEL = 'veed/lipsync';
// Estimate audio seconds from script word count: Chinese by characters/5s, English by words/2.5s; empty defaults to conservative 12s (matches backend lipsync route default).
function estimateAudioSeconds(text: string): number {
  const t = (text || '').trim();
  if (!t) return 12;
  const cjk = (t.match(/[一-鿿぀-ヿ가-힯]/g) || []).length; // CJK characters
  if (cjk >= t.length / 2) return Math.max(3, Math.ceil(cjk / 5));
  const words = t.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 2.5));
}

async function postJson(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ? `${j.error}${j.detail ? ': ' + String(j.detail).slice(0, 160) : ''}` : `HTTP ${r.status}`);
  return j;
}
function adErrText(msg: string, t: (k: string, vars?: Record<string, string | number>) => string) {
  if (msg === 'insufficient_credits' || msg.startsWith('insufficient_credits')) {
    return t('adRef.errInsufficientCredits');
  }
  if (msg === 'media_url_not_public' || msg.startsWith('media_url_not_public')) {
    return t('adRef.errMediaUrlNotPublic');
  }
  if (msg === 'file_too_large') {
    return t('adRef.errFileTooLarge');
  }
  if (msg.startsWith('upload_failed')) {
    return t('adRef.errUploadFailed');
  }
  if (msg === 'timeout') {
    return t('adRef.errTimeout');
  }
  return t('adRef.errGeneric', { code: msg });
}

// Proxied polling of Atlas tasks (no database): reuses lazynext-studio's /poll (auto-saves to R2 on completion).
function pollGen(getUrl: string, timeoutMs = 480_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    let transientErrors = 0;
    let lastError = '';
    const t = setInterval(async () => {
      if (Date.now() - t0 > timeoutMs) { clearInterval(t); reject(new Error(lastError || 'timeout')); return; }
      try {
        const c = await postJson('/api/lazynext-studio/poll', { getUrl });
        // transient=true: Atlas status query gateway transient timeout (504), task likely still running; count doesn't reset, only gives up after too many consecutive (avoids silent spinning to timeout).
        if (c.transient) {
          transientErrors += 1;
          if (transientErrors >= 8) { clearInterval(t); reject(new Error(lastError || 'poll_gateway_unstable')); }
          return;
        }
        transientErrors = 0;
        if (c.status === 'completed' && c.outputs?.length) { clearInterval(t); resolve(c.outputs[0]); }
        if (c.status === 'failed') { clearInterval(t); reject(new Error(String(c.error || 'Generation failed').slice(0, 200))); }
      } catch (e) {
        transientErrors += 1;
        lastError = String((e as Error).message || e).slice(0, 240);
        if (transientErrors >= 8) {
          clearInterval(t);
          reject(new Error(lastError || 'Polling failed'));
        }
      }
    }, 5000);
  });
}

async function uploadFile(file: File): Promise<string> {
  const directUrl = await uploadDirectMediaIfSupported(file, {
    kind: 'ad-reference',
    filename: file.name,
  });
  if (directUrl) return directUrl;

  const form = new FormData();
  form.append('file', file);
  const r = await fetch('/api/ad-reference/upload', { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(j.error === 'file_too_large' ? 'file_too_large' : `upload_failed:${j.detail || j.error || r.status}`);
  return j.url as string;
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration || 0); };
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(0); };
    v.src = URL.createObjectURL(file);
  });
}

type Slot = { url: string; preview: string } | null;
type Step = 'idle' | 'edit' | 'character' | 'voice' | 'lipsync' | 'done';

// Reference ad example videos (users can one-click try without uploading);
// served from the public/examples/marketing directory (bundled with the app).
const EXAMPLE_REF_VIDEOS = [
  '/examples/marketing/ex-ugc.mp4',
  '/examples/marketing/ex-direct-to-camera.mp4',
];
const AD_REF_SESSION_KEY = 'adref-session-v1';

export default function AdReferencePage() {
  const { t } = useI18n();
  const { status } = useSession();
  const router = useRouter();
  const mounted = useMounted();
  const [refVideo, setRefVideo] = useState<Slot>(null);
  const [refVideoSeconds, setRefVideoSeconds] = useState(0); // reference video duration (seconds), read on upload; 0 for unknown example videos (billing/estimate falls back to 30s)
  const [product, setProduct] = useState<Slot>(null);
  const [avatar, setAvatar] = useState<Slot>(null);
  const [productNote, setProductNote] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [newVoice, setNewVoice] = useState(false);
  const [script, setScript] = useState('');
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [busy, setBusy] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const productInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

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

  // ── Input persistence: entered content saved in real-time, login OAuth redirect/refresh return won't lose it (video/images only store url, blob preview invalid on reload) ──
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(AD_REF_SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (Date.now() - (s.ts || 0) > 24 * 3600_000) return;
      if (s.refVideoUrl) setRefVideo({ url: s.refVideoUrl, preview: s.refVideoUrl });
      if (Number(s.refVideoSeconds) > 0) setRefVideoSeconds(Number(s.refVideoSeconds));
      if (s.productUrl) setProduct({ url: s.productUrl, preview: s.productUrl });
      if (s.avatarUrl) setAvatar({ url: s.avatarUrl, preview: s.avatarUrl });
      if (typeof s.productNote === 'string') setProductNote(s.productNote);
      if (typeof s.extraNote === 'string') setExtraNote(s.extraNote);
      if (typeof s.newVoice === 'boolean') setNewVoice(s.newVoice);
      if (typeof s.script === 'string') setScript(s.script);
      if (typeof s.voiceId === 'string' && s.voiceId) setVoiceId(s.voiceId);
    } catch { /* ignore broken session */ }
     
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(AD_REF_SESSION_KEY, JSON.stringify({
        refVideoUrl: refVideo?.url || '', refVideoSeconds, productUrl: product?.url || '', avatarUrl: avatar?.url || '',
        productNote, extraNote, newVoice, script, voiceId, ts: Date.now(),
      }));
    } catch { /* storage full etc. */ }
  }, [mounted, refVideo, refVideoSeconds, product, avatar, productNote, extraNote, newVoice, script, voiceId]);

  async function onPick(kind: 'video' | 'product' | 'avatar', file: File | undefined) {
    if (!file) return;
    setError('');
    try {
      if (kind === 'video') {
        if (file.size > 60_000_000) throw new Error(t('adRef.videoTooLarge'));
        const dur = await readVideoDuration(file);
        if (dur > 31) throw new Error(t('adRef.videoTooLong', { n: Math.round(dur) }));
        setBusy(t('adRef.uploadingRefVideo'));
        const url = await uploadFile(file);
        setRefVideo({ url, preview: URL.createObjectURL(file) });
        setRefVideoSeconds(dur || 0); // record reference video duration, edit/character/motion billing based on it
      } else {
        if (file.size > 10_000_000) throw new Error(t('adRef.imageTooLarge'));
        setBusy(kind === 'product' ? t('adRef.uploadingProduct') : t('adRef.uploadingTalent'));
        const url = await uploadFile(file);
        const slot = { url, preview: URL.createObjectURL(file) };
        if (kind === 'product') setProduct(slot); else setAvatar(slot);
      }
    } catch (e) {
      setError(adErrText(String((e as Error).message || e), t));
    } finally {
      setBusy(null);
    }
  }

  const isGenerating = step === 'edit' || step === 'character' || step === 'voice' || step === 'lipsync';
  // Pure omni: swap person + product combined into one edit, no separate character charge.
  // Video step (edit) billed dynamically by reference video seconds, lipsync by audio seconds estimated from script word count; voice (TTS) uses fixed COST.
  const editEst = (product || avatar) ? videoCredits(EDIT_VIDEO_MODEL, undefined, refVideoSeconds || 30) : 0;
  const lipsyncEst = videoCredits(LIPSYNC_MODEL, undefined, estimateAudioSeconds(script));
  const adEst = editEst + (newVoice ? AD_COSTS.voice + lipsyncEst : 0);
  const hasEnoughCredits = status !== 'authenticated' || credits === null || credits >= adEst;
  // Checking replace voice doesn't require a script: if none entered, dialogue is auto-generated (see generate ③)
  const canGenerate = !!refVideo && (!!product || !!avatar) && !busy && !isGenerating && hasEnoughCredits;

  // Submit + poll; async generation failures (e.g. omni person-swap occasional 1010002) auto-retry, parameter/credit errors don't retry.
  async function submitAndPoll(url: string, body: unknown, pollTimeout = 480_000, retries = 2): Promise<string> {
    let last: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        const r = await postJson(url, body);
        return await pollGen(r.getUrl, pollTimeout);
      } catch (e) {
        last = e;
        const m = String((e as Error)?.message || e);
        if (/insufficient_credits|media_url_not_public|unauthorized|invalid_/.test(m)) throw e;
        if (i < retries) { setBusy(t('adRef.retryFailed', { i: i + 1, n: retries })); await new Promise((r2) => setTimeout(r2, 2000)); }
      }
    }
    throw last;
  }

  async function generate() {
    if (status !== 'authenticated') { router.push('/'); return; }
    if (!refVideo) return;
    setError(''); setResult('');
    let cid = ''; // work placeholder id, updated on completion/failure
    try {
      const currentCredits = await refreshCredits();
      if (currentCredits !== null && currentCredits < adEst) {
        setError(t('adRef.insufficientCreditsRun', { need: adEst, have: currentCredits }));
        return;
      }
      // Work page immediately shows this "generating" item
      try {
        const st = await postJson('/api/creations/start', { type: 'ad-reference', title: productNote.trim() || extraNote.trim() || t('adRef.adRemakeTitle') });
        cid = st.id;
      } catch { /* placeholder failure doesn't block generation */ }
      let final = refVideo.url;

      // ①② Pure omni: one video-edit swaps both presenter + product (edits original footage, preserves camera work/original audio), auto-retry on async failure.
      // omni swapping a real person reliably hits 1010002 (deepfake); after 3 retries still failing → fall back to kling motion transfer for person swap + omni for product.
      if (avatar || product) {
        setStep('edit');
        try {
          final = await submitAndPoll('/api/ad-reference/edit', {
            videoUrl: final,
            avatarUrl: avatar?.url || '',
            productUrl: product?.url || '',
            productNote,
            extraNote,
            videoSeconds: refVideoSeconds,
          }, 600_000, 3);
        } catch (omniErr) {
          // Product-only swap (no presenter) has no fallback path, throw directly
          if (!avatar) throw omniErr;
          // Fallback: kling motion transfer — presenter image + original reference video (motion source) → your person performs the original actions (avoids 1010002)
          setStep('character');
          let swapped = await submitAndPoll('/api/ad-reference/motion', {
            videoUrl: refVideo?.url || '',
            avatarUrl: avatar?.url || '',
            videoSeconds: refVideoSeconds,
          }, 600_000, 1);
          // If there's a product, use omni again on the person-swapped result to add product (product swap isn't blocked)
          if (product) {
            setStep('edit');
            swapped = await submitAndPoll('/api/ad-reference/edit', {
              videoUrl: swapped,
              productUrl: product?.url || '',
              productNote,
              extraNote,
              videoSeconds: refVideoSeconds,
            }, 600_000, 2);
          }
          final = swapped;
        }
      }

      // ③ Optional: new voiceover + lip-sync. If replace voice is checked but no script entered → auto-generate dialogue via LLM based on product (image)/reference, doesn't force user input.
      if (newVoice) {
        let text = script.trim();
        if (text.length < 4) {
          setStep('voice');
          try {
            const gs = await postJson('/api/ad-reference/gen-script', { productNote, extraNote, productUrl: product?.url || '', avatarUrl: avatar?.url || '' });
            text = (gs.script || '').trim();
            if (text) setScript(text); // backfill text box: user can see and re-edit the auto-generated dialogue
          } catch { /* dialogue generation failure skips voiceover, doesn't block overall output */ }
        }
        if (text.length >= 4) {
          setStep('voice');
          const audioUrl = await submitAndPoll('/api/ad-reference/voice', { text, voice: voiceId }, 180_000, 2);
          setStep('lipsync');
          final = await submitAndPoll('/api/ad-reference/lipsync', { videoUrl: final, audioUrl, audioSeconds: estimateAudioSeconds(text) }, 480_000, 2);
        }
      }
      try {
        await postJson('/api/ad-reference/save', {
          outputUrl: final,
          title: productNote.trim() || extraNote.trim() || t('adRef.adRemakeTitle'),
          thumbnail: product?.url || avatar?.url || '',
          creationId: cid,
        });
      } catch { /* ignore history save failure */ }
      setResult(final);
      setStep('done');
    } catch (e) {
      setError(adErrText(String((e as Error).message || e), t));
      setStep('idle');
      // Work page marks this placeholder as "failed"
      if (cid) postJson(`/api/creations/${cid}`, { status: 'failed', error: String((e as Error).message || e) }).catch(() => {});
    } finally {
      window.dispatchEvent(new Event('lazynext:credits'));
    }
  }

  const stepLabel: Record<Step, string> = {
    idle: '', done: '',
    character: t('adRef.stepCharacter'),
    edit: t('adRef.stepEdit'),
    voice: t('adRef.stepVoice'),
    lipsync: t('adRef.stepLipsync'),
  };

  // Top-level hydration gate: first frame renders a uniform empty skeleton, avoiding session/locale SSR≠client divergence (#418).
  if (!mounted) return <div className="min-h-screen bg-app" />;
  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto max-w-[1200px] px-5 py-8">
        <Link href="/" className="text-fg-faint text-sm hover:text-fg-secondary">{t('common.backToLazynext')}</Link>
        <div className="mt-6 mb-2 text-[14px] uppercase tracking-[0.24em] text-fg-muted font-semibold" style={{ fontFamily: GROTESK }}>{t('adRef.kicker')}</div>
        <h1 className="font-bold uppercase leading-[1.1] tracking-[-0.03em] text-[clamp(30px,4.4vw,46px)] text-fg" style={{ fontFamily: GROTESK }}>
          {t('adRef.title')}
        </h1>
        <p className="mt-3 max-w-xl text-fg-faint text-[15px]">
          {t('adRef.desc')}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Left: input panel */}
          <div className="rounded-2xl p-5 bg-popover">
            <div className="text-fg-muted text-xs uppercase tracking-wider mb-2" style={{ fontFamily: GROTESK }}>{t('adRef.refAdVideo')}</div>
            {refVideo ? (
              <div className="relative w-full rounded-xl border border-line bg-surface p-2">
                { }
                <video src={refVideo.preview} className="w-full max-h-52 rounded-lg bg-black object-contain" muted loop autoPlay playsInline />
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => videoInput.current?.click()}
                    className="flex-1 rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-line-strong transition">
                    {t('adRef.replaceVideo')}
                  </button>
                  <button onClick={() => setRefVideo(null)} title={t('adRef.remove')}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-danger/60 hover:text-danger transition">
                    ✕ {t('adRef.remove')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => videoInput.current?.click()}
                className="w-full rounded-xl border border-dashed border-line bg-surface px-4 py-5 text-left hover:border-line-strong transition"
              >
                <div>
                  <div className="text-fg text-sm font-medium">{t('adRef.uploadRefVideo')}</div>
                  <div className="text-fg-faint text-xs mt-1">mp4/mov · ≤30s · ≤60MB</div>
                </div>
              </button>
            )}
            <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
              onChange={(e) => { onPick('video', e.target.files?.[0]); e.target.value = ''; }} />

            <div className="mt-4 grid grid-cols-2 gap-3">
              {([['product', product, productInput, t('adRef.product'), t('adRef.productHint')], ['avatar', avatar, avatarInput, t('adRef.talent'), t('adRef.talentHint')]] as const).map(([kind, slot, ref, label, hint]) => (
                <div key={kind}>
                  <div className="text-fg-muted text-xs uppercase tracking-wider mb-2" style={{ fontFamily: GROTESK }}>{label}</div>
                  <button onClick={() => ref.current?.click()} aria-label={hint}
                    className="w-full aspect-square rounded-xl border border-dashed border-line bg-surface hover:border-line-strong transition overflow-hidden flex items-center justify-center">
                    {slot ? (

                      <img src={slot.preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-fg-faint text-xs px-3 text-center">+ {hint}<br /><span className="text-fg-placeholder">{t('adRef.optionalAtLeastOne')}</span></span>
                    )}
                  </button>
                  <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => onPick(kind, e.target.files?.[0])} />
                  <div className="mt-1.5">
                    <AssetPicker kind={kind} label={kind === 'product' ? t('assets.pickProduct') : t('assets.pickAvatar')} onSelect={(url) => { const s = { url, preview: url }; if (kind === 'product') setProduct(s); else setAvatar(s); }} />
                  </div>
                </div>
              ))}
            </div>

            <input value={productNote} onChange={(e) => setProductNote(e.target.value)} aria-label={t('adRef.productDetails')} placeholder={t('adRef.productDetails')}
              className="mt-4 w-full rounded-lg bg-surface border border-line px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder outline-none focus:border-line-strong" />
            <input value={extraNote} onChange={(e) => setExtraNote(e.target.value)} aria-label={t('adRef.extraInstructions')} placeholder={t('adRef.extraInstructions')}
              className="mt-2 w-full rounded-lg bg-surface border border-line px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder outline-none focus:border-line-strong" />

            {/* Voice */}
            <div className="mt-5 rounded-xl bg-surface border border-line p-3">
              <label className="flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
                <input type="checkbox" checked={newVoice} onChange={(e) => setNewVoice(e.target.checked)} className="accent-[#00b2fc]" />
                {t('adRef.replaceVoice')}
              </label>
              {newVoice && (
                <div className="mt-3 space-y-2">
                  <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={3} maxLength={600}
                    aria-label={t('adRef.newScript')}
                    placeholder={t('adRef.newScript')}
                    className="w-full rounded-lg bg-surface border border-line px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder outline-none focus:border-line-strong resize-none" />
                  <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} aria-label={t('adRef.replaceVoice')}
                    className="w-full rounded-lg bg-elevated border border-line px-3 py-2 text-sm text-fg outline-none">
                    {VOICES.map((v) => <option key={v.id} value={v.id}>{t(v.labelKey)}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button disabled={!canGenerate} onClick={generate}
              className="mt-5 w-full rounded-xl py-3.5 font-bold uppercase tracking-wide text-[#131416] disabled:opacity-40 transition"
              style={{ fontFamily: GROTESK, background: 'linear-gradient(135deg,#ffd83d,#ff9550)' }}>
              {isGenerating
                ? t('adRef.generating')
                : !hasEnoughCredits
                    ? `${t('adRef.notEnoughCredits')} · ✦${adEst}`
                    : `${t('adRef.generate')} · ✦${adEst}`}
            </button>
            {status === 'authenticated' && (
              <div className="mt-2 text-center text-[11px] text-fg-faint">
                {credits === null ? t('adRef.estimatedCostNoBalance', { n: adEst }) : t('adRef.estimatedCost', { n: adEst, balance: credits })}
              </div>
            )}
            <div className="mt-2 text-center text-[11px] text-fg-placeholder">{t('adRef.rightsConfirm')}</div>

            {/* Example reference ads: placed at the bottom of the form, one-click try when no footage */}
            {!refVideo && (
              <div className="mt-5 border-t border-line pt-4">
                <div className="text-fg-faint text-[11px] mb-2">{t('adRef.noFootage')}</div>
                <div className="grid grid-cols-2 gap-2">
                  {EXAMPLE_REF_VIDEOS.map((u) => (
                    <button key={u} type="button" onClick={() => setRefVideo({ url: u, preview: u })} aria-label={t('adRef.selectSampleVideo')}
                      className="rounded-lg overflow-hidden border border-line hover:border-[#00b2fc] transition aspect-[9/16] bg-black">
                      { }
                      <video src={u} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: result area */}
          <div className="rounded-2xl p-5 min-h-[420px] bg-popover">
            {busy && <div className="text-fg-muted text-sm">{busy}</div>}
            {error && <div role="alert" className="mb-3 rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">{error}</div>}
            {isGenerating && (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-white/80" />
                <div className="text-fg-muted text-sm">{stepLabel[step]}</div>
              </div>
            )}
            {step === 'done' && result && (
              <div>
                <div className="text-fg-muted text-xs uppercase tracking-wider mb-3" style={{ fontFamily: GROTESK }}>{t('adRef.beforeAfter')}</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <video src={refVideo?.preview} controls playsInline className="w-full rounded-xl bg-black" />
                    <div className="mt-1 text-center text-xs text-fg-faint">{t('adRef.originalRef')}</div>
                  </div>
                  <div>
                    <video src={result} controls playsInline className="w-full rounded-xl bg-black" />
                    <div className="mt-1 text-center text-xs text-fg-faint">{t('adRef.yourAd')}</div>
                  </div>
                </div>
                <a href={result} download className="mt-4 inline-block rounded-lg bg-elevated px-4 py-2 text-sm text-fg-secondary hover:bg-active">{t('adRef.downloadVideo')}</a>
              </div>
            )}
            {step === 'idle' && !busy && !error && (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-fg-placeholder text-sm">
                <div className="text-4xl mb-3">🎬</div>
                {t('adRef.emptyState')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
