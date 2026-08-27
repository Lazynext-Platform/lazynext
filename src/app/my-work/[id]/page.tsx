'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, ArrowLeft, Download, Film } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

// Drama work folder detail page: displays sections for character portraits / each scene (first frame + video) / final video.
// Data from /api/creations/[id] (GET returns with assets). Continuously changes during production, so polls every 15s to refresh.
type DramaAssets = {
  kind: string;
  title?: string;
  characters?: { key: string; name: string; appearance?: string; portraitUrl?: string | null }[];
  sceneImageUrl?: string | null;
  productImageUrl?: string | null;
  scenes?: { i: number; scene?: string; dialogue?: string; frameUrl?: string | null; videoUrl?: string | null }[];
};
type Creation = {
  id: string;
  templateId: string;
  prompt: string;
  outputs: string[] | null;
  assets?: DramaAssets | null;
  status: string;
  createdAt: string;
};

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { status } = useSession();
  const { t } = useI18n();
  const [c, setC] = useState<Creation | null | 'notfound'>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let alive = true;
    const load = () =>
      fetch(`/api/creations/${id}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_ok'))))
        .then((j) => { if (alive) setC(j && j.id ? j : 'notfound'); })
        .catch(() => { if (alive) setC((prev) => (prev && prev !== 'notfound' ? prev : 'notfound')); });
    void load();
    const t = setInterval(load, 15_000); // continuously update during production
    return () => { alive = false; clearInterval(t); };
  }, [id, status]);

  const finalVideo = c && c !== 'notfound' && Array.isArray(c.outputs) ? c.outputs[0] : '';

  return (
    <div className="min-h-screen bg-app">
      <div className="px-6 sm:px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/my-work')} className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg transition"><ArrowLeft className="h-4 w-4" />{t('myWork.title')}</button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-24">
        {status === 'loading' || c === null ? (
          <div className="grid place-items-center py-32"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>
        ) : status !== 'authenticated' ? (
          <div className="grid place-items-center gap-4 py-32 text-center">
            <div className="text-5xl">🔐</div>
            <p className="text-fg-faint">{t('myWork.signInView')}</p>
            <Link href="/" className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('common.signIn')}</Link>
          </div>
        ) : c === 'notfound' || !c.assets || c.assets.kind !== 'drama' ? (
          <div className="grid place-items-center gap-4 py-32 text-center">
            <div className="text-5xl">🗂️</div>
            <p className="text-fg-faint">{t('myWork.noFolder')}</p>
            <Link href="/my-work" className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('myWork.backToWork')}</Link>
          </div>
        ) : (
          <DramaFolder c={c} t={t} finalVideo={finalVideo} />
        )}
      </div>
    </div>
  );
}

function DramaFolder({ c, t, finalVideo }: { c: Creation; t: (key: string, vars?: Record<string, string | number>) => string; finalVideo: string }) {
  const f = c.assets as DramaAssets;
  const chars = f.characters || [];
  const scenes = f.scenes || [];
  const doneVids = scenes.filter((s) => s.videoUrl).length;

  return (
    <div className="pt-4">
      <div className="flex items-center gap-2 mb-1"><Film className="h-5 w-5" style={{ color: 'var(--color-brand-accent)' }} /><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{f.title || c.prompt || t('myWork.dramaTitle')}</h1></div>
      <p className="mb-8 text-sm text-fg-faint">{t('myWork.dramaSummary', { chars: chars.length, scenes: scenes.length, done: doneVids, total: scenes.length })}</p>

      {/* Final video */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-fg-secondary">{t('myWork.finalCut')}</h2>
        {finalVideo ? (
          <div className="relative w-full max-w-[300px]">
            <video src={finalVideo} controls playsInline poster={scenes.find((s) => s.frameUrl)?.frameUrl || undefined} className="w-full rounded-2xl border border-line bg-black" />
            <a href={finalVideo} download aria-label="Download video" className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-[#0064d9] text-white shadow-lg"><Download className="h-4 w-4" /></a>
          </div>
        ) : (
          <div className="grid aspect-video max-w-[300px] place-items-center rounded-2xl border border-dashed border-line bg-black/20 text-xs text-fg-faint">{t('myWork.finalPlaceholder')}</div>
        )}
      </section>

      {/* Character portraits */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-fg-secondary">🎭 {t('myWork.castPortraits')}</h2>
        {chars.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {chars.map((ch) => (
              <div key={ch.key} className="overflow-hidden rounded-xl border border-line bg-black/20">
                <div className="relative aspect-[3/4] w-full">
                  {ch.portraitUrl ? (
                     
                    <img src={ch.portraitUrl} alt={ch.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-3xl opacity-50">🎭</div>
                  )}
                </div>
                <div className="p-2 text-xs font-medium text-fg">{ch.name}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-xs text-fg-faint">{t('myWork.noCharacters')}</div>}
      </section>

      {/* Product reference image (product drama: user-uploaded or auto-generated, same product locked across all scenes) */}
      {f.productImageUrl && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-fg-secondary">🛍️ {t('myWork.productReference')}</h2>
          { }
          <img src={f.productImageUrl} alt="product" className="h-40 rounded-xl border border-line object-cover" referrerPolicy="no-referrer" loading="lazy" />
        </section>
      )}

      {/* Per-scene assets */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg-secondary">🎬 {t('myWork.scenes')}</h2>
        <div className="space-y-4">
          {scenes.map((s) => (
            <div key={s.i} className="rounded-xl border border-line bg-black/20 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-hover px-2 py-0.5 text-[11px]" style={{ color: 'var(--color-brand-accent)' }}>{t('myWork.scene', { n: s.i })}</span>
                {s.dialogue && <span className="truncate text-[11px] text-fg-faint">「{s.dialogue}」</span>}
              </div>
              <div className="flex flex-wrap gap-3">
                {s.frameUrl && (
                  <div>
                    <div className="mb-1 text-[10px] text-fg-faint">{t('myWork.firstFrame')}</div>
                    { }
                    <img src={s.frameUrl} alt="" className="h-40 rounded-lg border border-line object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  </div>
                )}
                {s.videoUrl ? (
                  <div>
                    <div className="mb-1 text-[10px] text-fg-faint">{t('myWork.video')}</div>
                    <video src={s.videoUrl} controls playsInline poster={s.frameUrl || undefined} className="h-40 rounded-lg border border-line bg-black" />
                  </div>
                ) : (
                  <div className="grid h-40 w-24 place-items-center rounded-lg border border-dashed border-line bg-black/20 text-[10px] text-fg-faint">{t('myWork.pending')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
