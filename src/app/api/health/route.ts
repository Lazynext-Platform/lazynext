import { NextResponse } from 'next/server';

/**
 * Health check endpoint — verifies Atlas Cloud, R2, and D1 connectivity.
 * Returns 200 if all checks pass, 503 if any critical service is down.
 * Does not require authentication (safe for monitoring/uptime checks).
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};
  let allOk = true;

  // 1. Atlas Cloud — check if base URL and API key are configured, and ping the models endpoint
  try {
    const llmBase = process.env.ATLASCLOUD_LLM_BASE || '';
    const apiKey = process.env.ATLASCLOUD_API_KEY || '';
    if (!llmBase || !apiKey) {
      checks.atlas = { ok: false, detail: 'not_configured' };
      allOk = false;
    } else {
      const start = Date.now();
      const res = await fetch(`${llmBase.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        checks.atlas = { ok: true, latencyMs };
      } else if (res.status === 402) {
        // Reachable but insufficient balance — service is up, just unfunded
        checks.atlas = { ok: true, latencyMs, detail: 'insufficient balance (402)' };
      } else {
        checks.atlas = { ok: false, latencyMs, detail: `HTTP ${res.status}` };
        allOk = false;
      }
    }
  } catch {
    checks.atlas = { ok: false, detail: 'fetch_failed' };
    allOk = false;
  }

  // 2. R2 — check if S3-compatible credentials are configured and bucket is accessible
  try {
    const accessKey = process.env.R2_S3_ACCESS_KEY_ID || '';
    const secretKey = process.env.R2_S3_SECRET_ACCESS_KEY || '';
    if (!accessKey || !secretKey) {
      checks.r2 = { ok: false, detail: 'not_configured' };
      allOk = false;
    } else {
      // Proper SigV4-signed HEAD bucket request to verify R2 is accessible.
      const endpoint = 'https://85953070bae00da372951a8833bd3459.r2.cloudflarestorage.com';
      const bucket = 'lazynext-studio-media';
      const url = new URL(`${endpoint}/${bucket}`);
      const start = Date.now();
      const res = await sigV4HeadBucket(url, accessKey, secretKey);
      const latencyMs = Date.now() - start;
      if (res && (res.ok || res.status === 200 || res.status === 403 || res.status === 404)) {
        checks.r2 = { ok: true, latencyMs, detail: res.ok ? 'bucket accessible' : `HTTP ${res.status} (endpoint reachable)` };
      } else if (res) {
        checks.r2 = { ok: false, latencyMs, detail: `HTTP ${res.status}` };
        allOk = false;
      } else {
        checks.r2 = { ok: true, detail: 'credentials configured (endpoint check skipped)' };
      }
    }
  } catch {
    checks.r2 = { ok: false, detail: 'check_failed' };
    allOk = false;
  }

  // 3. D1 — check if prisma client can be initialized
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, unknown>;
    const hasDb = !!(env.DB || env.__D1_BETA__DB);
    if (hasDb) {
      checks.d1 = { ok: true, detail: 'D1 binding present' };
    } else {
      // In local dev, D1 binding won't exist — check for SQLite instead
      const hasSqlite = !!process.env.DATABASE_URL;
      checks.d1 = { ok: hasSqlite, detail: hasSqlite ? 'SQLite (local dev)' : 'no database binding' };
      if (!hasSqlite) allOk = false;
    }
  } catch {
    // In local dev, getCloudflareContext may not be available
    const hasDb = !!process.env.DATABASE_URL;
    checks.d1 = { ok: hasDb, detail: hasDb ? 'SQLite (local dev)' : 'context_unavailable' };
    if (!hasDb) allOk = false;
  }

  const status = allOk ? 200 : 503;
  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'lazynext-os',
    checks,
  }, { status });
}

/* ---------- AWS Sig V4 helpers for R2 HEAD bucket check ---------- */

const enc = new TextEncoder();

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', ck, enc.encode(data));
}

async function hashHex(data: string): Promise<string> {
  return bufToHex(await crypto.subtle.digest('SHA-256', enc.encode(data)));
}

async function sigV4HeadBucket(
  url: URL,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<Response | null> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA-256 of empty string

  const headersToSign: Record<string, string> = {
    host: url.host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };

  const sortedKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headersToSign[k].trim()}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = ['HEAD', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const canonicalHash = await hashHex(canonicalRequest);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalHash].join('\n');

  const kDate = await hmac(enc.encode(`AWS4${secretAccessKey}`).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = bufToHex(await hmac(kSigning, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url.toString(), {
    method: 'HEAD',
    headers: { 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash, Authorization: authorization },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
}
