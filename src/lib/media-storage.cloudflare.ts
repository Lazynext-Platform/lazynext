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
  MEDIA_BUCKET?: unknown;
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

/**
 * Minimal AWS Signature V4 signing for R2 S3-compatible API.
 * Uses Web Crypto API (available in Cloudflare Workers).
 */
async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function signV4Request(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: ArrayBuffer | string | null,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string,
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash =
    body === null
      ? 'UNSIGNED-PAYLOAD'
      : typeof body === 'string'
        ? await sha256(body)
        : 'UNSIGNED-PAYLOAD';

  const allHeaders: Record<string, string> = {
    host: url.host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    ...headers,
  };

  const canonicalHeaders = Object.keys(allHeaders)
    .sort()
    .map((k) => `${k}:${allHeaders[k]}\n`)
    .join('');
  const signedHeaders = Object.keys(allHeaders).sort().join(';');

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.replace(/^\?/, ''),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalHash = await sha256(canonicalRequest);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalHash,
  ].join('\n');

  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretAccessKey}`).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = Array.from(new Uint8Array(await hmacSha256(kSigning, stringToSign)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...allHeaders,
    Authorization: authorization,
  };
}

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

export async function putMedia(
  key: string,
  value: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const env = getEnv();
  if (!env.R2_S3_ACCESS_KEY_ID || !env.R2_S3_SECRET_ACCESS_KEY) {
    throw new MediaStorageNotConfiguredError();
  }

  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
  const signedHeaders = await signV4Request(
    'PUT',
    url,
    { 'Content-Type': contentType },
    value,
    env.R2_S3_ACCESS_KEY_ID,
    env.R2_S3_SECRET_ACCESS_KEY,
    'auto',
    's3',
  );

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: signedHeaders,
    body: value,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 S3 PUT failed: ${response.status} ${text}`);
  }

  return `${MEDIA_PATH_PREFIX}${encodeURIComponent(key)}`;
}

export async function readMedia(value: string): Promise<StoredMedia | null> {
  const key = mediaKey(value);
  if (!key) return null;
  const env = getEnv();
  if (!env.R2_S3_ACCESS_KEY_ID || !env.R2_S3_SECRET_ACCESS_KEY) {
    throw new MediaStorageNotConfiguredError();
  }

  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
  const signedHeaders = await signV4Request(
    'GET',
    url,
    {},
    null,
    env.R2_S3_ACCESS_KEY_ID,
    env.R2_S3_SECRET_ACCESS_KEY,
    'auto',
    's3',
  );

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: signedHeaders,
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 S3 GET failed: ${response.status} ${text}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
  return { buffer, contentType };
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

async function headObject(
  key: string,
  env: EnvWithS3,
): Promise<{ size: number; contentType: string } | null> {
  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
  const signedHeaders = await signV4Request(
    'HEAD',
    url,
    {},
    null,
    env.R2_S3_ACCESS_KEY_ID!,
    env.R2_S3_SECRET_ACCESS_KEY!,
    'auto',
    's3',
  );

  const response = await fetch(url.toString(), {
    method: 'HEAD',
    headers: signedHeaders,
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const size = Number(response.headers.get('Content-Length') || '0');
  const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
  return { size, contentType };
}

export async function serveMedia(
  request: Request,
  key: string,
  includeBody: boolean,
): Promise<Response> {
  const env = getEnv();
  if (!env.R2_S3_ACCESS_KEY_ID || !env.R2_S3_SECRET_ACCESS_KEY) {
    return new Response('bucket not configured', { status: 500 });
  }

  const meta = await headObject(key, env);
  if (!meta) return new Response('not found', { status: 404 });

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

    const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
    const signedHeaders = await signV4Request(
      'GET',
      url,
      { Range: `bytes=${start}-${end}` },
      null,
      env.R2_S3_ACCESS_KEY_ID,
      env.R2_S3_SECRET_ACCESS_KEY,
      'auto',
      's3',
    );

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: signedHeaders,
    });
    if (!response.ok) return new Response('not found', { status: 404 });
    return new Response(response.body, { status: 206, headers: rangeHeaders });
  }

  if (!includeBody) return new Response(null, { headers: base });

  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET_NAME}/${encodeURIComponent(key)}`);
  const signedHeaders = await signV4Request(
    'GET',
    url,
    {},
    null,
    env.R2_S3_ACCESS_KEY_ID,
    env.R2_S3_SECRET_ACCESS_KEY,
    'auto',
    's3',
  );

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: signedHeaders,
  });
  if (!response.ok) return new Response('not found', { status: 404 });
  return new Response(response.body, { headers: base });
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
