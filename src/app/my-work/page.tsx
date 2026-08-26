'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Download, Loader2, Clock, Play, X, Film, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { byokHeaders } from '@/lib/byok';
import { formatDateTime } from '@/lib/i18n-format';

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
  model?: string;
  prompt: string;
  inputImage: string | null;
  outputs: string[] | null;
  assets?: DramaAssets | null;
  status: string;
  createdAt: string;
};
type MediaKind = 'video' | 'image' | 'audio' | 'unknown';
type PlayTarget = { url: string; kind: MediaKind } | null;

// Only show studio-level works (per-shot/intermediate tasks already excluded server-side by /api/creations).
const SOURCE: Record<string, { zh: string; en: string }> = {
  'lazynext-studio': { zh: '产品广告', en: 'Ad' },
  'drama-studio': { zh: 'AI 剧情', en: 'Drama' },
  'ad-reference': { zh: '爆款复刻', en: 'Remake' },
};

function firstOutput(c: Creation) {
  return Array.isArray(c.outputs) && typeof c.outputs[0] === 'string' ? c.outputs[0] : '';
}
function mediaKind(url: string, model?: string): MediaKind {
  const u = url.toLowerCase().split('?')[0];
  const m = (model || '').toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(u) || m.includes('video') || m.includes('lipsync')) return 'video';
  if (/\.(png|jpe?g|webp|gif)$/.test(u) || m.includes('image')) return 'image';
  if (/\.(mp3|wav|m4a|aac|ogg)$/.test(u) || m.includes('speech') || m.includes('audio')) return 'audio';
  return 'unknown';
}

export default function MyWorkPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Creation[] | null>(null);
  const [play, setPlay] = useState<PlayTarget>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    setItems(null);
    const ac = new AbortController();
    const load = () =>
      fetch('/api/creations', { signal: ac.signal, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { creations: [] }))
        .then((j) => {
          const list = ((j.creations || []) as Creation[]).filter((c) => Boolean(SOURCE[c.templateId]));
          setItems(list);
          // Advance "generating" placeholders: trigger backend task reconciliation / timeout fallback, effective on next refresh (non-blocking render).
          list
            .filter((c) => c.status === 'processing')
            .forEach((c) => fetch(`/api/creations/${c.id}`, {
              signal: ac.signal,
              headers: byokHeaders(),
            }).catch(() => {}));
        })
        .catch((e) => { if (e?.name !== 'AbortError') setItems((prev) => prev ?? []); });
    void load();
    // Light refresh every 15s: generating → final / failed auto-updates card status
    const t = setInterval(() => void load(), 15_000);
    return () => { ac.abort(); clearInterval(t); };
  }, [status]);

  const generating = items?.filter((c) => c.status === 'processing').length || 0;

  const handleDelete = async (id: string) => {
    if (!confirm(t('myWork.deleteConfirm'))) return;
    setItems((prev) => prev?.filter((c) => c.id !== id) ?? null);
    try {
      await fetch(`/api/creations/${id}`, { method: 'DELETE' });
    } catch {
      // Optimistic delete failed — reload to restore
      fetch('/api/creations', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => setItems(((j.creations || []) as Creation[]).filter((c) => Boolean(SOURCE[c.templateId]))))
        .catch(() => {});
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#131416' }}>
      {/* Top bar (fixed right area provided by Shell) */}
      <div className="px-6 sm:px-8 py-5">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            { }
            <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 rounded-lg" />
            <b className="text-sm tracking-tight">Lazynext</b>
          </Link>
          <Link href="/" className="text-xs text-white/60 hover:text-white transition">{t('myWork.allApps')}</Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="pt-6 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('myWork.title')}</h1>
          <p className="mt-2 text-sm text-white/50">
            {t('myWork.subtitle')}
          </p>
          {generating > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#00b2fc]/30 bg-[#00b2fc]/[0.08] px-3 py-1 text-xs text-white/80">
              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#22d3ee' }} />
              {t('myWork.generating', { n: generating })}
            </div>
          )}
        </div>

        {status === 'loading' ? (
          <div className="grid place-items-center py-32"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>
        ) : status !== 'authenticated' ? (
          <div className="grid place-items-center gap-4 py-32 text-center">
            <div className="text-5xl">🔐</div>
            <p className="text-white/50">{t('myWork.signInPrompt')}</p>
            <Link href="/" className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#00b2fc' }}>{t('common.signIn')}</Link>
          </div>
        ) : items === null ? (
          <div className="grid place-items-center py-32"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-4 py-32 text-center">
            <div className="text-5xl">🎬</div>
            <p className="text-white/50">{t('myWork.empty')}</p>
            <Link href="/" className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#00b2fc' }}>{t('myWork.startCreating')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((c) => {
              const sourceKey = c.templateId === 'lazynext-studio' ? 'myWork.sourceAd' : c.templateId === 'drama-studio' ? 'myWork.sourceDrama' : c.templateId === 'ad-reference' ? 'myWork.sourceRemake' : null;
              const badge = sourceKey ? t(sourceKey) : null;
              const title = c.prompt || t('myWork.untitled');
              const time = formatDateTime(c.createdAt, locale);
              const url = firstOutput(c);

              // ★ drama work folder: click into standalone detail page to see characters/each scene (first frame + video)/final. Cover takes first portrait → scene image → final video.
              if (c.assets && c.assets.kind === 'drama') {
                const f = c.assets;
                const cover = f.characters?.find((x) => x.portraitUrl)?.portraitUrl || f.sceneImageUrl || url || '';
                const total = f.scenes?.length || 0;
                const doneVids = f.scenes?.filter((s) => s.videoUrl).length || 0;
                const hasFinal = !!url;
                const stateLabel = hasFinal ? t('myWork.finalReady') : total ? t('myWork.shotsProgress', { done: doneVids, total }) : t('myWork.inProgress');
                return (
                  <button key={c.id} onClick={() => router.push(`/my-work/${c.id}`)} className="group overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left">
                    <div className="relative aspect-[9/16] w-full">
                      {cover ? (
                         
                        <img src={cover} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-4xl">🎬</div>
                      )}
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90">{t('myWork.drama')}</span>
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90"><Film className="h-3 w-3" />{t('myWork.folder')}</span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                        <div className="text-[11px] font-medium text-white/90">{stateLabel}</div>
                      </div>
                      <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100"><div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">{t('myWork.openFolder')}</div></div>
                    </div>
                    <div className="p-3">
                      <div className="truncate text-xs font-medium">{f.title || title}</div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40"><Clock className="h-2.5 w-2.5" />{time}</div>
                    </div>
                  </button>
                );
              }

              // ① Generating: placeholder card (spinner), auto-becomes final video on completion
              if (c.status === 'processing') {
                return (
                  <div key={c.id} className="overflow-hidden rounded-2xl border border-[#00b2fc]/30 bg-black/30">
                    <div className="relative aspect-[9/16] w-full">
                      {c.inputImage && (
                         
                        <img src={c.inputImage} alt="" className="h-full w-full object-cover opacity-40" referrerPolicy="no-referrer" />
                      )}
                      <div className="absolute inset-0 grid place-items-center gap-2 bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#22d3ee' }} />
                        <span className="text-xs font-medium text-white/85">{t('myWork.generatingDots')}</span>
                      </div>
                      {badge && <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90">{badge}</span>}
                    </div>
                    <div className="p-3">
                      <div className="truncate text-xs font-medium">{title}</div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40"><Clock className="h-2.5 w-2.5" />{time}</div>
                    </div>
                  </div>
                );
              }

              // ② Failed: placeholder card (can retry in the corresponding studio)
              if (c.status === 'failed' || !url) {
                return (
                  <div key={c.id} className="overflow-hidden rounded-2xl border border-red-500/25 bg-black/30">
                    <div className="relative aspect-[9/16] w-full">
                      {c.inputImage && (
                         
                        <img src={c.inputImage} alt="" className="h-full w-full object-cover opacity-25" referrerPolicy="no-referrer" />
                      )}
                      <div className="absolute inset-0 grid place-items-center gap-2 bg-black/40">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-red-500/15"><X className="h-5 w-5 text-red-400" /></div>
                        <span className="text-xs font-medium text-red-300/90">{t('myWork.failed')}</span>
                      </div>
                      {badge && <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90">{badge}</span>}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-xs font-medium text-white/60">{title}</div>
                        <button onClick={() => handleDelete(c.id)} className="shrink-0 text-white/30 hover:text-red-400 transition" aria-label={t('myWork.delete')}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40"><Clock className="h-2.5 w-2.5" />{time}</div>
                    </div>
                  </div>
                );
              }

              // ③ Final video: playable + downloadable
              const kind = mediaKind(url, c.model);
              return (
                <div key={c.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <button onClick={() => setPlay({ url, kind })} className="group relative block aspect-[9/16] w-full">
                    {c.inputImage ? (
                       
                      <img src={c.inputImage} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : kind === 'image' ? (
                       
                      <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-4xl">{kind === 'audio' ? '♪' : '🎬'}</div>
                    )}
                    {badge && <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90">{badge}</span>}
                    <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60"><Play className="h-5 w-5 text-white" /></div>
                    </div>
                  </button>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-medium">{title}</div>
                      <button onClick={() => handleDelete(c.id)} className="shrink-0 text-white/30 hover:text-red-400 transition" aria-label={t('myWork.delete')}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40"><Clock className="h-2.5 w-2.5" />{time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {play && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-4" onClick={() => setPlay(null)}>
          <button onClick={() => setPlay(null)} className="absolute right-5 top-5 text-white/60 hover:text-white"><X className="h-6 w-6" /></button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {play.kind === 'image' ? (
               
              <img src={play.url} alt="" className="max-h-[85vh] w-auto rounded-xl border border-white/10" referrerPolicy="no-referrer" />
            ) : play.kind === 'audio' ? (
              <div className="rounded-xl border border-white/10 bg-[#1c1e21] p-6"><audio src={play.url} controls autoPlay className="w-[min(80vw,420px)]" /></div>
            ) : (
              <video src={play.url} controls autoPlay className="max-h-[85vh] w-auto rounded-xl border border-white/10" />
            )}
            <a href={play.url} download className="absolute -top-3 -right-3 grid h-9 w-9 place-items-center rounded-full bg-white text-black shadow-lg"><Download className="h-4 w-4" /></a>
          </div>
        </div>
      )}
    </div>
  );
}
