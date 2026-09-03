import { getCloudflareContext } from '@opennextjs/cloudflare';

const MEDIA_PATH_PREFIX = '/api/lazynext-studio/media/';
const R2_S3_ENDPOINT =
  'https://85953070bae00da372951a8833bd3459.r2.cloudflarestorage.com';
const R2_BUCKET_NAME = 'lazynext-studio-media';

export type MediaStorageCapabilities = {
  provider: 'r2';
  configured: boolean;
  directUpload: boolean;
};

export type StoredMedia = {
  buffer: ArrayBuffer;
  contentType: string;
};

export class MediaStorageNotConfiguredError extends Error {
  constructor() {
    super('bucket_not_bound');
    this.name = 'MediaStorageNotConfiguredError';
  }
}

type EnvWithS3 = {
  R2_S3_ACCESS_KEY_ID?: string;
  R2_S3_SECRET_ACCESS_KEY?: string;
};

function getEnv(): EnvWithS3 {
  try {
    const { env } = getCloudflareContext();
    return env as unknown as EnvWithS3;
  } catch {
    return {};
  }
}

function isS3Configured(): boolean {
  const env = getEnv();
  return Boolean(env.R2_S3_ACCESS_KEY_ID && env.R2_S3_SECRET_ACCESS_KEY);
}

/* ---------- AWS Sig V4 helpers (Web Crypto API) ---------- */

const enc = new TextEncoder();

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const ck = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', ck, enc.encode(data));
}

async function hashHex(data: string): Promise<string> {
  return bufToHex(await crypto.subtle.digest('SHA-256', enc.encode(data)));
}

async function hashHexBuf(data: ArrayBuffer): Promise<string> {
  return bufToHex(await crypto.subtle.digest('SHA-256', data));
}

/* ---------- URL helpers ---------- */

function mediaKey(value: string): string {
  let path = value.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return '';
    }
  }
  if (!path.startsWith(MEDIA_PATH_PREFIX)) return '';
  const encodedKey =
    path.slice(MEDIA_PATH_PREFIX.length).split(/[?#]/, 1)[0] || '';
  try {
    return decodeURIComponent(encodedKey);
  } catch {
    return '';
  }
}

export function getMediaStorageCapabilities(): MediaStorageCapabilities {
  return { provider: 'r2', configured: isS3Configured(), directUpload: false };
}

export function isManagedMediaUrl(value: unknown): boolean {
  return typeof value === 'string' && Boolean(mediaKey(value));
}

/* ---------- Core S3 operations ---------- */

async function s3Put(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const env = getEnv();
  if (!env.R2_S3_ACCESS_KEY_ID || !env.R2_S3_SECRET_ACCESS_KEY) {
    throw new MediaStorageNotConfiguredError();
  }

  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
  const payloadHash = await hashHexBuf(body);
  const headers = await signHeaders(
    'PUT',
    url,
    { 'content-type': contentType },
    payloadHash,
    env.R2_S3_ACCESS_KEY_ID,
    env.R2_S3_SECRET_ACCESS_KEY,
  );

  const resp = await fetch(url.toString(), {
    method: 'PUT',
    headers,
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`R2 S3 PUT failed: ${resp.status} ${text}`);
  }
}

async function s3Get(
  key: string,
  range?: string,
): Promise<{ buffer: ArrayBuffer; contentType: string; size: number }> {
  const env = getEnv();
  if (!env.R2_S3_ACCESS_KEY_ID || !env.R2_S3_SECRET_ACCESS_KEY) {
    throw new MediaStorageNotConfiguredError();
  }

  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
  const extraHeaders: Record<string, string> = {};
  if (range) extraHeaders.range = range;

  const headers = await signHeaders(
    'GET',
    url,
    extraHeaders,
    'UNSIGNED-PAYLOAD',
    env.R2_S3_ACCESS_KEY_ID,
    env.R2_S3_SECRET_ACCESS_KEY,
  );

  const resp = await fetch(url.toString(), { method: 'GET', headers });
  if (resp.status === 404) throw new NotFoundError();
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`R2 S3 GET failed: ${resp.status} ${text}`);
  }
  const buffer = await resp.arrayBuffer();
  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  const size = Number(resp.headers.get('content-length') || buffer.byteLength);
  return { buffer, contentType, size };
}

async function s3Head(
  key: string,
): Promise<{ size: number; contentType: string }> {
  const env = getEnv();
  if (!env.R2_S3_ACCESS_KEY_ID || !env.R2_S3_SECRET_ACCESS_KEY) {
    throw new MediaStorageNotConfiguredError();
  }

  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
  const headers = await signHeaders(
    'HEAD',
    url,
    {},
    'UNSIGNED-PAYLOAD',
    env.R2_S3_ACCESS_KEY_ID,
    env.R2_S3_SECRET_ACCESS_KEY,
  );

  const resp = await fetch(url.toString(), { method: 'HEAD', headers });
  if (resp.status === 404) throw new NotFoundError();
  if (!resp.ok) throw new Error(`R2 S3 HEAD failed: ${resp.status}`);
  return {
    size: Number(resp.headers.get('content-length') || '0'),
    contentType: resp.headers.get('content-type') || 'application/octet-stream',
  };
}

class NotFoundError extends Error {
  constructor() {
    super('not_found');
    this.name = 'NotFoundError';
  }
}

/* ---------- AWS Sig V4 signing ---------- */

async function signHeaders(
  method: string,
  url: URL,
  extraHeaders: Record<string, string>,
  payloadHash: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  // Build headers to sign (all lowercase)
  const headersToSign: Record<string, string> = {
    host: url.host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    ...extraHeaders,
  };

  // Canonical headers (sorted, lowercase, trimmed)
  const sortedKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedKeys
    .map((k) => `${k}:${headersToSign[k].trim()}\n`)
    .join('');
  const signedHeaders = sortedKeys.join(';');

  // Canonical request
  const canonicalRequest = [
    method,
    url.pathname,
    url.search.replace(/^\?/, ''),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalHash = await hashHex(canonicalRequest);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalHash,
  ].join('\n');

  // Derive signing key: kDate → kRegion → kService → kSigning
  const kDate = await hmac(enc.encode(`AWS4${secretAccessKey}`).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = bufToHex(await hmac(kSigning, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Return headers for the fetch request (with proper casing for HTTP)
  const result: Record<string, string> = {};
  for (const k of sortedKeys) {
    // Normalize header names: x-amz-* stays lowercase, content-type becomes Content-Type
    if (k.startsWith('x-amz-')) {
      result[k] = headersToSign[k];
    } else if (k === 'content-type') {
      result['Content-Type'] = headersToSign[k];
    } else if (k === 'range') {
      result['Range'] = headersToSign[k];
    } else {
      result[k] = headersToSign[k];
    }
  }
  result['Authorization'] = authorization;
  return result;
}

/* ---------- Public API ---------- */

export async function putMedia(
  key: string,
  value: ArrayBuffer,
  contentType: string,
): Promise<string> {
  await s3Put(key, value, contentType);
  return `${MEDIA_PATH_PREFIX}${encodeURIComponent(key)}`;
}

export async function readMedia(value: string): Promise<StoredMedia | null> {
  const key = mediaKey(value);
  if (!key) return null;
  try {
    const { buffer, contentType } = await s3Get(key);
    return { buffer, contentType };
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
}

function baseHeaders(contentType: string, size: number) {
  return {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': 'inline',
    'Content-Length': String(size),
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

export async function serveMedia(
  request: Request,
  key: string,
  includeBody: boolean,
): Promise<Response> {
  let meta: { size: number; contentType: string };
  try {
    meta = await s3Head(key);
  } catch (e) {
    if (e instanceof NotFoundError) return new Response('not found', { status: 404 });
    console.error('[media-storage] s3Head error:', String(e));
    return new Response('storage_error', { status: 500 });
  }

  const size = meta.size;
  const base = baseHeaders(meta.contentType, size);
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
    const rangeHeaders = {
      ...base,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(length),
    };
    if (!includeBody) return new Response(null, { status: 206, headers: rangeHeaders });

    try {
      const { buffer } = await s3Get(key, `bytes=${start}-${end}`);
      return new Response(buffer, { status: 206, headers: rangeHeaders });
    } catch (e) {
      if (e instanceof NotFoundError) return new Response('not found', { status: 404 });
      console.error('[media-storage] s3Get range error:', String(e));
      return new Response('storage_error', { status: 500 });
    }
  }

  if (!includeBody) return new Response(null, { headers: base });

  try {
    const { buffer } = await s3Get(key);
    return new Response(buffer, { headers: base });
  } catch (e) {
    if (e instanceof NotFoundError) return new Response('not found', { status: 404 });
    console.error('[media-storage] s3Get error:', String(e));
    return new Response('storage_error', { status: 500 });
  }
}

export async function handleClientUploadRequest(
  _request: Request,
  _authorize: () => Promise<string>,
): Promise<Response> {
  return Response.json(
    { error: 'client_upload_not_supported_on_cloudflare' },
    { status: 404 },
  );
}
