import { uploadBlobToAtlas, uploadRemoteMediaToAtlas } from '@/lib/atlas';
import { readMedia } from '@/lib/media-storage';
import { sameOriginMediaPath } from '@/lib/public-media-url';

// Same-origin R2 media (/api/marketing-studio/media/<key>) cannot be fetched by Atlas via the public URL —
// the Worker fetching its own R2 route returns 404 in the CF environment, and Atlas then fails with 1042 / "invalid parameter".
// Unified approach here: same-origin media is read directly via bucket.get(key) then uploadBlobToAtlas; external URLs go through uploadRemoteMediaToAtlas.
// Shared by ad-reference's character / edit endpoints, avoiding duplicate implementations.
const MEDIA_PATH_PREFIX = '/api/marketing-studio/media/';

export const ADREF_VIDEO_UPLOAD_LIMIT = 200_000_000;
export const ADREF_IMAGE_UPLOAD_LIMIT = 10_000_000;

function extensionForContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('bmp')) return 'bmp';
  if (ct.includes('mp4')) return 'mp4';
  if (ct.includes('quicktime')) return 'mov';
  if (ct.includes('avi')) return 'avi';
  return 'bin';
}

async function uploadSameOriginMediaToAtlas(path: string, filenamePrefix: string, maxBytes: number): Promise<string> {
  const key = decodeURIComponent(path.slice(MEDIA_PATH_PREFIX.length).split('?')[0] || '');
  if (!key) throw new Error('media_key_required');
  const media = await readMedia(path);
  if (!media) throw new Error(`media_not_found:${key}`);
  if (media.buffer.byteLength > maxBytes) {
    throw new Error(`media_too_large:${media.buffer.byteLength}`);
  }
  return uploadBlobToAtlas(
    new Blob([media.buffer], { type: media.contentType }),
    `${filenamePrefix}.${extensionForContentType(media.contentType)}`,
  );
}

// Upload an input media (either a same-origin R2 path or an external public URL) to Atlas temporary media, returning a URL Atlas can reliably fetch.
export async function uploadInputMediaToAtlas(
  rawValue: unknown,
  publicUrl: string,
  req: Request,
  filenamePrefix: string,
  maxBytes: number,
): Promise<string> {
  const path = sameOriginMediaPath(rawValue, req);
  if (path) return uploadSameOriginMediaToAtlas(path, filenamePrefix, maxBytes);
  return uploadRemoteMediaToAtlas(publicUrl, filenamePrefix, maxBytes);
}
