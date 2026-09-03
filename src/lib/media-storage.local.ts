// Local development media-storage (Node.js + filesystem). The Cloudflare
// version uses R2 bindings via getCloudflareContext(); this implementation
// stores files on the local filesystem so media upload/serve works in dev.
import { promises as fs } from 'fs';
import path from 'path';

const MEDIA_PATH_PREFIX = '/api/lazynext-studio/media/';
const LOCAL_MEDIA_DIR = path.join(process.cwd(), '.dev-media');
const META_SUFFIX = '.meta.json';

export type MediaStorageCapabilities = {
  provider: 'local';
  configured: boolean;
  directUpload: boolean;
};

export type StoredMedia = {
  buffer: ArrayBuffer;
  contentType: string;
};

export class MediaStorageNotConfiguredError extends Error {
  constructor() {
    super('local_storage_not_configured');
    this.name = 'MediaStorageNotConfiguredError';
  }
}

/** Sanitize a media key into a safe filesystem path component. */
function safeFilename(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Read the stored content-type for a given key (falls back to octet-stream). */
async function readMeta(key: string): Promise<string> {
  try {
    const meta = await fs.readFile(
      path.join(LOCAL_MEDIA_DIR, safeFilename(key) + META_SUFFIX),
      'utf-8',
    );
    return JSON.parse(meta).contentType || 'application/octet-stream';
  } catch {
    return 'application/octet-stream';
  }
}

export function getMediaStorageCapabilities(): MediaStorageCapabilities {
  return { provider: 'local', configured: true, directUpload: true };
}

export function isManagedMediaUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value, 'http://localhost');
    return u.pathname.startsWith(MEDIA_PATH_PREFIX);
  } catch {
    return false;
  }
}

export async function putMedia(
  key: string,
  value: ArrayBuffer,
  contentType: string,
): Promise<string> {
  await fs.mkdir(LOCAL_MEDIA_DIR, { recursive: true });
  const filename = safeFilename(key);
  await fs.writeFile(path.join(LOCAL_MEDIA_DIR, filename), Buffer.from(value));
  // Persist content-type so serveMedia can return the correct header.
  await fs.writeFile(
    path.join(LOCAL_MEDIA_DIR, filename + META_SUFFIX),
    JSON.stringify({ contentType, uploadedAt: Date.now() }),
  );
  return `${MEDIA_PATH_PREFIX}${encodeURIComponent(key)}`;
}

export async function readMedia(value: string): Promise<StoredMedia | null> {
  if (!isManagedMediaUrl(value)) return null;
  const key = value.replace(/.*\/api\/lazynext-studio\/media\//, '');
  try {
    const buffer = await fs.readFile(
      path.join(LOCAL_MEDIA_DIR, safeFilename(key)),
    );
    const contentType = await readMeta(key);
    return { buffer: buffer.buffer, contentType };
  } catch {
    return null;
  }
}

function baseHeaders(contentType: string, size: number) {
  return {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': 'inline',
    Vary: 'Range',
  };
}

function parseRange(value: string | null, size: number) {
  const match = value ? /^bytes=(\d+)-(\d*)$/.exec(value) : null;
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    return 'invalid' as const;
  }
  return { start, end: Math.min(end, size - 1) };
}

/**
 * Serve a media file from the local filesystem. Mirrors the Cloudflare
 * version's signature (request, key, includeBody) so the same route handler
 * works in both environments. Supports HTTP range requests for video seeking.
 */
export async function serveMedia(
  request: Request,
  key: string,
  includeBody: boolean,
): Promise<Response> {
  const filename = safeFilename(key);
  const filePath = path.join(LOCAL_MEDIA_DIR, filename);

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return new Response('not found', { status: 404 });
  }

  const size = stat.size;
  const contentType = await readMeta(key);
  const base = baseHeaders(contentType, size);
  const range = parseRange(request.headers.get('range'), size);

  if (range === 'invalid') {
    return new Response('range not satisfiable', {
      status: 416,
      headers: { ...base, 'Content-Range': `bytes */${size}` },
    });
  }

  if (range) {
    const { start, end } = range;
    const length = end - start + 1;
    const headers = {
      ...base,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(length),
    };
    if (!includeBody) return new Response(null, { status: 206, headers });
    const buffer = await fs.readFile(filePath);
    const slice = buffer.subarray(start, end + 1);
    return new Response(slice, { status: 206, headers });
  }

  const headers = { ...base, 'Content-Length': String(size) };
  if (!includeBody) return new Response(null, { headers });
  const buffer = await fs.readFile(filePath);
  return new Response(buffer, { headers });
}

/**
 * Handle a direct client upload (multipart/form-data) in local dev mode.
 * Stores the file on the local filesystem and returns a managed media URL.
 * Mirrors the Cloudflare version's signature.
 */
export async function handleClientUploadRequest(
  request: Request,
  _authorize: () => Promise<string>,
): Promise<Response> {
  try {
    // Authorize first (same as Cloudflare version)
    await _authorize();

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'no_file_provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const key = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
    const url = await putMedia(key, buffer, file.type || 'application/octet-stream');
    return Response.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'unauthorized') return Response.json({ error: 'unauthorized' }, { status: 401 });
    console.error('[media-storage.local] client upload error:', msg);
    return Response.json({ error: 'upload_failed' }, { status: 500 });
  }
}
