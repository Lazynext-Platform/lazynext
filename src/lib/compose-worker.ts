/**
 * Web Worker for FFmpeg video composition.
 *
 * Runs the entire composition flow (media fetching, FFmpeg loading,
 * encoding, concatenation) off the main thread to avoid UI jank.
 *
 * Messages:
 *   In:  { type: 'compose', job: 'course' | 'reel', sections: ComposeSection[] | string[] }
 *   Out: { type: 'progress', frac: number, note: string }
 *   Out: { type: 'done', blob: Blob }
 *   Out: { type: 'error', message: string }
 */

/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const CORE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
let ffPromise: Promise<FFmpeg> | null = null;

async function getFF(): Promise<FFmpeg> {
  if (ffPromise) return ffPromise;
  ffPromise = (async () => {
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ff;
  })();
  return ffPromise;
}

/** Fetch media bytes from a URL (runs in worker, not main thread) */
async function fetchMediaBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch_failed: ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

interface ComposeSection {
  slideUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
}

type InMessage =
  | { type: 'compose'; job: 'course'; sections: ComposeSection[] }
  | { type: 'compose'; job: 'reel'; videoUrls: string[] };

function postProgress(frac: number, note: string) {
  self.postMessage({ type: 'progress', frac, note });
}

async function composeCourseVideo(sections: ComposeSection[]): Promise<Blob> {
  const ff = await getFF();
  const segs: string[] = [];
  const usable = sections.filter((s) => s.slideUrl && (s.videoUrl || s.audioUrl));
  if (!usable.length) throw new Error('no_sections');

  for (let i = 0; i < usable.length; i++) {
    const s = usable[i];
    postProgress((i / usable.length) * 0.9, `Composing section ${i + 1}/${usable.length}`);
    await ff.writeFile(`slide${i}.jpg`, await fetchMediaBytes(s.slideUrl!));
    if (s.videoUrl) {
      await ff.writeFile(`t${i}.mp4`, await fetchMediaBytes(s.videoUrl));
      await ff.exec([
        '-loop', '1', '-i', `slide${i}.jpg`, '-i', `t${i}.mp4`,
        '-filter_complex',
        '[0:v]scale=640:720:force_original_aspect_ratio=decrease,pad=640:720:(ow-iw)/2:(oh-ih)/2,setsar=1[l];' +
          '[1:v]scale=640:720:force_original_aspect_ratio=decrease,pad=640:720:(ow-iw)/2:(oh-ih)/2,setsar=1[r];' +
          '[l][r]hstack=inputs=2[v]',
        '-map', '[v]', '-map', '1:a', '-shortest', '-r', '25',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', `seg${i}.mp4`,
      ]);
    } else {
      await ff.writeFile(`a${i}.mp3`, await fetchMediaBytes(s.audioUrl!));
      await ff.exec([
        '-loop', '1', '-i', `slide${i}.jpg`, '-i', `a${i}.mp3`,
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1',
        '-map', '0:v', '-map', '1:a', '-shortest', '-r', '25',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', `seg${i}.mp4`,
      ]);
    }
    segs.push(`seg${i}.mp4`);
  }

  postProgress(0.92, 'Concatenating full course');
  await ff.writeFile('list.txt', new TextEncoder().encode(segs.map((f) => `file '${f}'`).join('\n')));
  await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'out.mp4']);
  const data = await ff.readFile('out.mp4');
  postProgress(1, 'Done');
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  return new Blob([bytes as BlobPart], { type: 'video/mp4' });
}

async function composeAdReel(videoUrls: string[]): Promise<Blob> {
  const ff = await getFF();
  const clips = videoUrls.filter((u): u is string => typeof u === 'string' && u.length > 0);
  if (!clips.length) throw new Error('no_clips');
  const segs: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    postProgress((i / clips.length) * 0.9, `Composing shot ${i + 1}/${clips.length}`);
    await ff.writeFile(`v${i}.mp4`, await fetchMediaBytes(clips[i]));
    await ff.exec([
      '-i', `v${i}.mp4`,
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-ar', '44100', '-r', '30', `seg${i}.mp4`,
    ]);
    segs.push(`seg${i}.mp4`);
  }
  postProgress(0.92, 'Concatenating full reel');
  await ff.writeFile('list.txt', new TextEncoder().encode(segs.map((f) => `file '${f}'`).join('\n')));
  await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'reel.mp4']);
  const data = await ff.readFile('reel.mp4');
  postProgress(1, 'Done');
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  return new Blob([bytes as BlobPart], { type: 'video/mp4' });
}

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  if (msg.type !== 'compose') return;
  try {
    let blob: Blob;
    if (msg.job === 'course') {
      blob = await composeCourseVideo(msg.sections);
    } else {
      blob = await composeAdReel(msg.videoUrls);
    }
    self.postMessage({ type: 'done', blob });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message });
  }
};
