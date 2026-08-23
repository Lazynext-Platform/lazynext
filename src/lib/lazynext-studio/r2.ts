import { putMedia, readMedia } from '@/lib/media-storage';

// Atlas generation results land on a temporary OSS with force-download/hotlink-protection/8-day expiry/no CORS, unplayable in browser.
// Here we transfer them to our own R2 (lazynext-studio-media), returning a same-origin, inline-playable, non-expiring url.
// On transfer failure, falls back to the original url (at least doesn't break the entire generation).
function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function extensionForContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes('mp4')) return 'mp4';
  if (ct.includes('mpeg') || ct.includes('mp3')) return 'mp3';
  if (ct.includes('wav')) return 'wav';
  if (ct.includes('m4a')) return 'm4a';
  if (ct.includes('png')) return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('webp')) return 'webp';
  return 'bin';
}

function sniffMedia(buffer: ArrayBuffer, declared: string): { contentType: string; extension: string } {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 12) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { contentType: 'image/jpeg', extension: 'jpg' };
    }
    if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === 'PNG') {
      return { contentType: 'image/png', extension: 'png' };
    }
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
      return { contentType: 'image/webp', extension: 'webp' };
    }
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WAVE') {
      return { contentType: 'audio/wav', extension: 'wav' };
    }
    if (ascii(bytes, 4, 8) === 'ftyp') {
      const brand = ascii(bytes, 8, 12);
      return brand === 'qt  '
        ? { contentType: 'video/quicktime', extension: 'mov' }
        : { contentType: 'video/mp4', extension: 'mp4' };
    }
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { contentType: 'video/webm', extension: 'webm' };
  }
  if (bytes.length >= 3 && ascii(bytes, 0, 3) === 'ID3') {
    return { contentType: 'audio/mpeg', extension: 'mp3' };
  }
  return {
    contentType: declared || 'application/octet-stream',
    extension: extensionForContentType(declared),
  };
}

export async function persistToR2(sourceUrl: string): Promise<string> {
  if (!/^https?:\/\//.test(sourceUrl)) return sourceUrl;
  try {
    // Backend fetch is not subject to browser CORS/force-download restrictions; no Referer to bypass OSS hotlink protection.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    let buf: ArrayBuffer;
    let declaredType: string;
    try {
      const res = await fetch(sourceUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) return sourceUrl;
      declaredType =
        res.headers.get('content-type') || 'application/octet-stream';
      buf = await res.arrayBuffer();
    } finally {
      clearTimeout(timer);
    }
    const media = sniffMedia(buf, declaredType);
    const key = `${crypto.randomUUID()}.${media.extension}`;
    return await putMedia(key, buf, media.contentType);
  } catch {
    return sourceUrl;
  }
}

// Read a media image from R2 and convert to base64 data URI: for inline use with multimodal LLM.
// Inlining directly instead of passing the /media/ URL to the LLM, because overseas LLMs (gemini) often time out fetching workers.dev images (tested: expansion stalls due to this).
export async function mediaToDataUri(url: string): Promise<string> {
  try {
    const media = await readMedia(url);
    if (!media) return '';
    const bytes = new Uint8Array(media.buffer);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return `data:${media.contentType};base64,${btoa(bin)}`;
  } catch {
    return '';
  }
}
