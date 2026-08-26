'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clapperboard, Download, ImageIcon, Loader2, Sparkles, UploadCloud, Video, Wand2 } from 'lucide-react';
import { mediaDownloadUrl } from '@/lib/media-url';
import { videoCredits } from '@/lib/video-pricing';
import { useI18n } from '@/i18n/provider';
import { AssetPicker } from '@/components/AssetPicker';

const COSTS = { plan: 4, image: 2, video: 25 };
// Video step dynamic billing (seedance ref-to-video fixed 720p/15s), consistent with backend ad-skit/video route; plan/image still use fixed COST.
const VIDEO_COST = videoCredits('bytedance/seedance-2.0/reference-to-video', '720p', 15);
// Language selection removed: script language auto-follows the product input language (see lib/ad-skit.ts planSkit)
const STYLES = [
  { key: 'funny', labelKey: 'adSkit.styleFunny' }, { key: 'reversal', labelKey: 'adSkit.styleReversal' }, { key: 'skit', labelKey: 'adSkit.styleSkit' },
  { key: 'warm', labelKey: 'adSkit.styleWarm' }, { key: 'luxury', labelKey: 'adSkit.styleLuxury' }, { key: 'urgent', labelKey: 'adSkit.styleUrgent' },
];
const PLAN_MODELS = [
  { key: 'deepseek-ai/deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  { key: 'zai-org/glm-5.2', label: 'GLM-5.2' },
];
const SAMPLES = [
  { title: 'Insulated Tumbler', video: '/samples/ad-skit-demo-en.mp4' },
];

type Slot = { status: 'idle' | 'processing' | 'done' | 'failed'; url?: string };
type Plan = { idea: string; productImagePrompt: string; videoPrompt: string; caption: string };

async function imageToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const el = new Image(); el.onload = () => res(el); el.onerror = rej; el.src = objectUrl; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(objectUrl); }
}
async function postJson(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ? `${j.error}${j.detail ? ': ' + String(j.detail).slice(0, 160) : ''}` : `HTTP ${r.status}`);
  return j;
}
function pollCreation(id: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      if (n > 240) { clearInterval(t); reject(new Error('timeout')); return; }
      try {
        const c = await (await fetch(`/api/creations/${id}`)).json();
        if (c.status === 'completed') { clearInterval(t); resolve((Array.isArray(c.outputs) ? c.outputs : [])[0] || ''); }
        else if (c.status === 'failed') { clearInterval(t); reject(new Error('failed')); }
      } catch { /* keep polling */ }
    }, 3000);
  });
}
function errText(code: string, t: (k: string, vars?: Record<string, string | number>) => string) {
  if (code === 'insufficient_credits') return t('adSkit.errInsufficientCredits');
  if (code === 'product_required') return t('adSkit.errProductRequired');
  if (code.startsWith('plan_failed')) {
    if (/401|402|403|429|unauthorized|quota|invalid_api_key/i.test(code)) return t('adSkit.errPlanFailedKey');
    return t('adSkit.errPlanFailed');
  }
  if (/401|402|403|429|unauthorized|quota|invalid_api_key/i.test(code)) return t('adSkit.errPlanFailedKey');
  if (code.startsWith('submit_failed') || code.startsWith('upload_failed')) return t('adSkit.errSubmitFailed');
  if (code === 'no_product_image') return t('adSkit.errNoProductImage');
  if (code === 'timeout' || code === 'failed') return t('adSkit.errVideoFailed');
  return t('adSkit.errGeneric', { code });
}

export default function AdSkitPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [product, setProduct] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  // Language selection removed: auto-follows the product input language
  const [style, setStyle] = useState('funny');
  const [llm, setLlm] = useState(PLAN_MODELS[0].key);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [productImg, setProductImg] = useState<Slot>({ status: 'idle' });
  const [video, setVideo] = useState<Slot>({ status: 'idle' });

  async function genPlan() {
    if (!session) { router.push('/'); return; }
    if (product.trim().length < 2) return setErr(t('adSkit.enterProduct'));
    setErr(null); setBusy('plan'); setPlan(null); setProductImg({ status: 'idle' }); setVideo({ status: 'idle' });
    try {
      const j = await postJson('/api/ad-skit/plan', { product, styleKey: style, llmModel: llm });
      setPlan(j.plan);
      window.dispatchEvent(new Event('lazynext:credits'));
    } catch (e) { setErr(errText(e instanceof Error ? e.message : 'failed', t)); }
    setBusy(null);
  }

  async function genVideo() {
    if (!plan) return;
    setErr(null); setBusy('video');
    try {
      let productUrls: string[] = [];
      setProductImg({ status: 'processing' });
      if (uploadedImages.length) {
        const r = await postJson('/api/ad-skit/image', { uploadedImages });
        productUrls = (r.productUrls || []).filter(Boolean);
      } else {
        const ij = await postJson('/api/ad-skit/image', { imagePrompt: plan.productImagePrompt });
        const u = await pollCreation(ij.id);
        if (u) productUrls = [u];
      }
      if (!productUrls.length) throw new Error('no_product_image');
      setProductImg({ status: 'done', url: productUrls[0] });
      setVideo({ status: 'processing' });
      const vj = await postJson('/api/ad-skit/video', { productUrls, videoPrompt: plan.videoPrompt, duration: 15, title: plan.idea });
      const vidUrl = await pollCreation(vj.id);
      setVideo({ status: 'done', url: vidUrl });
      window.dispatchEvent(new Event('lazynext:credits'));
    } catch (e) {
      setProductImg((s) => (s.status === 'processing' ? { status: 'failed' } : s));
      setVideo({ status: 'failed' });
      setErr(errText(e instanceof Error ? e.message : 'failed', t));
    }
    setBusy(null);
  }

  const dl = mediaDownloadUrl;

  return (
    <div className="min-h-screen bg-[#131416] text-white" style={{ colorScheme: 'dark' }}>
      <div className="px-6 sm:px-8 py-5">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <a href="/" className="text-sm text-white/60 hover:text-white transition">{t('adSkit.allApps')}</a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-8 px-6 pb-16 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00b2fc]/15 text-[#00b2fc]"><Clapperboard className="h-6 w-6" /></span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('adSkit.title')}</h1>
            <span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs font-semibold text-amber-300">{t('adSkit.featured')}</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-white/60">
            {t('adSkit.desc')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* Left: input */}
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#1c1e21] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00b2fc] text-xs text-white">1</span>{t('adSkit.productSettings')}
            </h2>
            <textarea value={product} onChange={(e) => setProduct(e.target.value)} rows={3}
              placeholder={t('adSkit.placeholder')}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00b2fc] focus:ring-2 focus:ring-[#00b2fc]/30" />
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                {uploadedImages.map((u, i) => (
                  <div key={i} className="relative h-14 w-14 overflow-hidden rounded-lg border border-white/10">
                    { }
                    <img src={u} alt={t('adSkit.productPhotoAlt')} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setUploadedImages((a) => a.filter((_, j) => j !== i))} className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center bg-black/60 text-[10px] leading-none text-white">×</button>
                  </div>
                ))}
                {uploadedImages.length < 4 && (
                  <label className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/15 bg-white/[0.04] hover:border-[#00b2fc]/60">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      const urls = await Promise.all(files.map(imageToDataUrl));
                      setUploadedImages((a) => [...a, ...urls].slice(0, 4));
                    }} />
                    <UploadCloud className="h-5 w-5 text-white/40" />
                  </label>
                )}
                {uploadedImages.length < 4 && (
                  <AssetPicker kind="product" label={t('assets.pickProduct')} onSelect={(url) => setUploadedImages((a) => [...a, url].slice(0, 4))} />
                )}
              </div>
              <span className="mt-1 block text-xs text-white/50">{t('adSkit.uploadHint')}</span>
            </div>
            <label className="mt-3 block"><span className="mb-1 block text-xs font-medium text-white/60">{t('adSkit.style')}</span>
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#00b2fc]">
                {STYLES.map((s) => <option key={s.key} value={s.key}>{t(s.labelKey)}</option>)}
              </select>
            </label>
            <label className="mt-3 block"><span className="mb-1 block text-xs font-medium text-white/60">{t('adSkit.creativeLlm')}</span>
              <select value={llm} onChange={(e) => setLlm(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#00b2fc]">
                {PLAN_MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </label>
            <button onClick={genPlan} disabled={busy !== null} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00b2fc] px-5 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
              {busy === 'plan' ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('adSkit.directorBrainstorming')}</> : <><Wand2 className="h-4 w-4" /> {t('adSkit.generateScriptCredits', { n: COSTS.plan })}</>}
            </button>
            {err && <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle className="h-4 w-4 shrink-0" /> {err}</p>}
          </div>

          {plan && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#1c1e21] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00b2fc] text-xs text-white">2</span>{t('adSkit.scriptReview')}</h2>
              <div className="rounded-lg bg-white/[0.04] p-3 text-sm leading-6 text-white/80"><b>{t('adSkit.idea')}</b>{plan.idea}</div>
              {plan.caption && <p className="text-xs text-white/50">{t('adSkit.caption')}{plan.caption}</p>}
              <button onClick={genVideo} disabled={busy !== null} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00b2fc] px-5 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                {busy === 'video' ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('adSkit.renderingVideo')}</> : <><Sparkles className="h-4 w-4" /> {t('adSkit.generateAdVideoCredits', { n: COSTS.image + VIDEO_COST })}</>}
              </button>
            </div>
          )}
        </section>

        {/* Right: output */}
        <section className="space-y-5">
          {plan ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-[#1c1e21] p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><ImageIcon className="h-4 w-4 text-[#00b2fc]" /> {t('adSkit.productPhotoTitle')}</h3>
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                  {productImg.status === 'done' && productImg.url ? (  <img src={productImg.url} alt={t('adSkit.productPhotoAlt')} className="h-full w-full object-contain" />)
                    : productImg.status === 'processing' ? <Loader2 className="h-6 w-6 animate-spin text-[#00b2fc]" />
                    : productImg.status === 'failed' ? <span className="text-sm text-red-400">{t('adSkit.productPhotoFailed')}</span>
                    : <span className="text-sm text-white/30">{t('adSkit.productPhotoPlaceholder')}</span>}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1c1e21] p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Video className="h-4 w-4 text-[#00b2fc]" /> {t('adSkit.finishedAd')}</h3>
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                  {video.status === 'done' && video.url ? <video src={video.url} controls className="h-full w-full object-contain" />
                    : video.status === 'processing' ? <div className="flex flex-col items-center gap-2 text-white/40"><Loader2 className="h-7 w-7 animate-spin text-[#00b2fc]" /><span className="text-xs">{t('adSkit.seedanceRendering')}</span></div>
                    : video.status === 'failed' ? <span className="text-sm text-red-400">{t('adSkit.renderFailed')}</span>
                    : <span className="text-sm text-white/30">{t('adSkit.rendersAuto')}</span>}
                </div>
                {video.status === 'done' && video.url && <a href={dl(video.url)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"><Download className="h-4 w-4" /> {t('adSkit.downloadVideo')}</a>}
              </div>
            </>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#1c1e21] p-8 text-center text-white/30">
              <Clapperboard className="h-10 w-10" /><p className="text-sm">{t('adSkit.emptyState')}</p>
            </div>
          )}

          {/* Samples */}
          <div className="rounded-2xl border border-white/10 bg-[#1c1e21] p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-[#00b2fc]" /> {t('adSkit.sampleOutputs')}</h3>
            <div className="flex flex-wrap gap-4">
              {SAMPLES.map((s) => (
                <div key={s.title} className="w-[220px] overflow-hidden rounded-xl border border-white/10">
                  <video src={s.video} controls preload="metadata" playsInline className="aspect-[9/16] w-full bg-neutral-900 object-cover" />
                  <div className="px-2.5 py-1.5 text-xs font-medium text-white/60">{t('adSkit.sampleTitle')}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
