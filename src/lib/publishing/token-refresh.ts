/**
 * OAuth token refresh logic for publishing platforms.
 *
 * When a stored access token is expired (or close to expiry), this module
 * exchanges the stored refresh token for a new access token, updates the
 * PlatformConnection record, and returns the fresh access token.
 *
 * Each platform has a different refresh endpoint and response shape:
 *   - TikTok:     POST https://open-api.tiktok.com/oauth/refresh_token/
 *   - YouTube:    POST https://oauth2.googleapis.com/token
 *   - Instagram:  GET  https://graph.facebook.com/v18.0/ig_refresh_token
 *   - Facebook:   GET  https://graph.facebook.com/v18.0/oauth/access_token (long-lived exchange)
 *   - LinkedIn:   POST https://www.linkedin.com/oauth/v2/accessToken
 */

import type { PlatformConnection } from '@prisma/client';

interface RefreshConfig {
  url: string;
  method: 'GET' | 'POST';
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Build the request body/query for the refresh call. */
  buildParams: (clientId: string, clientSecret: string, refreshToken: string) => Record<string, string>;
  /** Extract the new access token from the response. */
  parseAccess: (json: Record<string, unknown>) => string | undefined;
  /** Extract the new refresh token (if rotated) from the response. */
  parseRefresh?: (json: Record<string, unknown>) => string | undefined;
  /** Extract the expires_in (seconds) from the response. */
  parseExpiresIn?: (json: Record<string, unknown>) => number | undefined;
}

const REFRESH_CONFIGS: Record<string, RefreshConfig> = {
  tiktok: {
    url: 'https://open-api.tiktok.com/oauth/refresh_token/',
    method: 'POST',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    buildParams: (cid, secret, rt) => ({
      client_key: cid,
      client_secret: secret,
      grant_type: 'refresh_token',
      refresh_token: rt,
    }),
    parseAccess: (j) => (j.data as Record<string, unknown> | undefined)?.access_token as string | undefined,
    parseRefresh: (j) => (j.data as Record<string, unknown> | undefined)?.refresh_token as string | undefined,
    parseExpiresIn: (j) => (j.data as Record<string, unknown> | undefined)?.expires_in as number | undefined,
  },
  youtube: {
    url: 'https://oauth2.googleapis.com/token',
    method: 'POST',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    buildParams: (cid, secret, rt) => ({
      client_id: cid,
      client_secret: secret,
      grant_type: 'refresh_token',
      refresh_token: rt,
    }),
    parseAccess: (j) => j.access_token as string | undefined,
    parseRefresh: (j) => j.refresh_token as string | undefined,
    parseExpiresIn: (j) => j.expires_in as number | undefined,
  },
  instagram: {
    // Instagram uses the Meta Graph API for long-lived token refresh
    url: 'https://graph.facebook.com/v18.0/ig_refresh_token',
    method: 'GET',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    buildParams: (_cid, _secret, rt) => ({
      grant_type: 'ig_refresh_token',
      access_token: rt,
    }),
    parseAccess: (j) => j.access_token as string | undefined,
    parseExpiresIn: (j) => j.expires_in as number | undefined,
  },
  facebook: {
    // Facebook long-lived token exchange
    url: 'https://graph.facebook.com/v18.0/oauth/access_token',
    method: 'GET',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    buildParams: (cid, secret, rt) => ({
      grant_type: 'fb_exchange_token',
      client_id: cid,
      client_secret: secret,
      fb_exchange_token: rt,
    }),
    parseAccess: (j) => j.access_token as string | undefined,
    parseExpiresIn: (j) => {
      const sec = j.expires_in as number | undefined;
      return sec;
    },
  },
  linkedin: {
    url: 'https://www.linkedin.com/oauth/v2/accessToken',
    method: 'POST',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    buildParams: (cid, secret, rt) => ({
      grant_type: 'refresh_token',
      refresh_token: rt,
      client_id: cid,
      client_secret: secret,
    }),
    parseAccess: (j) => j.access_token as string | undefined,
    parseExpiresIn: (j) => j.expires_in as number | undefined,
  },
};

/**
 * Attempt to refresh an expired access token for a platform connection.
 * On success, updates the PlatformConnection record with the new tokens
 * and returns the decrypted new access token.
 * Returns null if refresh is not possible (no refresh token, no client
 * credentials, or the refresh API call fails).
 */
export async function refreshPlatformToken(
  conn: PlatformConnection,
): Promise<string | null> {
  const config = REFRESH_CONFIGS[conn.platform];
  if (!config) return null;

  // Need a refresh token to refresh
  if (!conn.refreshToken) return null;

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    console.warn(`[token-refresh] ${conn.platform} client credentials not configured`);
    return null;
  }

  // Decrypt the refresh token
  let refreshToken: string;
  try {
    const { decryptToken } = await import('./token-crypto');
    refreshToken = await decryptToken(conn.refreshToken);
  } catch {
    console.error(`[token-refresh] ${conn.platform} refresh token decryption failed`);
    return null;
  }

  const params = config.buildParams(clientId, clientSecret, refreshToken);

  try {
    const url = config.method === 'GET'
      ? `${config.url}?${new URLSearchParams(params).toString()}`
      : config.url;

    const res = await fetch(url, {
      method: config.method,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: config.method === 'POST' ? new URLSearchParams(params).toString() : undefined,
    });

    if (!res.ok) {
      console.error(`[token-refresh] ${conn.platform} refresh failed: HTTP ${res.status}`);
      return null;
    }

    const json = (await res.json()) as Record<string, unknown>;
    const newAccess = config.parseAccess(json);
    if (!newAccess) {
      console.error(`[token-refresh] ${conn.platform} no access_token in refresh response`);
      return null;
    }

    const newRefresh = config.parseRefresh?.(json);
    const expiresIn = config.parseExpiresIn?.(json);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // Encrypt and persist the new tokens
    const { encryptToken } = await import('./token-crypto');
    const encryptedAccess = await encryptToken(newAccess);
    const encryptedRefresh = newRefresh ? await encryptToken(newRefresh) : conn.refreshToken;

    const { prisma } = await import('@/lib/prisma');
    await prisma.platformConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: expiresAt,
      },
    });

    return newAccess;
  } catch (e) {
    console.error(`[token-refresh] ${conn.platform} refresh error:`, String(e));
    return null;
  }
}

/**
 * Check if a token is expired or will expire within the given buffer window.
 */
export function isTokenExpired(expiresAt: Date | null, bufferMs = 60_000): boolean {
  if (!expiresAt) return false; // No expiry known — assume valid
  return new Date().getTime() + bufferMs > expiresAt.getTime();
}
