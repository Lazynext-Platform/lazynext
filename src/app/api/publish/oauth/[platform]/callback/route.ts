import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Extract a cookie value from a Request's Cookie header. */
function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/**
 * GET /api/publish/oauth/[platform]/callback
 * OAuth callback handler — exchanges the authorization code for access/refresh tokens.
 *
 * Query params: ?code=xxx&state=userId:randomHex
 * Cookies expected: oauth_state (CSRF), oauth_code_verifier (PKCE, if applicable)
 * Redirects to /settings on success with a success flag, or error flag on failure.
 */
const TOKEN_ENDPOINTS: Record<string, { url: string; clientIdEnv: string; clientSecretEnv: string; redirectUriEnv: string }> = {
  tiktok: {
    url: 'https://open-api.tiktok.com/oauth/token/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    redirectUriEnv: 'TIKTOK_REDIRECT_URI',
  },
  youtube: {
    url: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    redirectUriEnv: 'YOUTUBE_REDIRECT_URI',
  },
  instagram: {
    url: 'https://api.instagram.com/oauth/access_token',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    redirectUriEnv: 'META_REDIRECT_URI',
  },
  facebook: {
    url: 'https://graph.facebook.com/v2.0/oauth/access_token',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    redirectUriEnv: 'META_REDIRECT_URI',
  },
  linkedin: {
    url: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    redirectUriEnv: 'LINKEDIN_REDIRECT_URI',
  },
};

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://lazynext.com';

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/settings?oauth_error=missing_code`);
  }

  // Verify state matches the cookie we set during initiation (CSRF protection)
  const cookieState = getCookie(req, 'oauth_state');
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${baseUrl}/settings?oauth_error=invalid_state`);
  }

  // Extract userId from state
  const [userId, ...rest] = state.split(':');
  if (!userId || rest.length === 0) {
    return NextResponse.redirect(`${baseUrl}/settings?oauth_error=invalid_state`);
  }

  const config = TOKEN_ENDPOINTS[platform];
  if (!config) {
    return NextResponse.redirect(`${baseUrl}/settings?oauth_error=invalid_platform`);
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  const redirectUri = process.env[config.redirectUriEnv];

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${baseUrl}/settings?oauth_error=not_configured`);
  }

  // Read PKCE code_verifier from cookie (set during initiation for PKCE-enabled platforms)
  const codeVerifier = getCookie(req, 'oauth_code_verifier');

  // Exchange code for tokens
  try {
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };

    // Include code_verifier if we have one (PKCE flow)
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenRes = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenRes.ok) {
      console.error(`[oauth/callback] ${platform} token exchange failed:`, tokenRes.status);
      return NextResponse.redirect(`${baseUrl}/settings?oauth_error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      user_id?: string;
      username?: string;
    };

    // Encrypt the access token before storing
    const { encryptToken } = await import('@/lib/publishing/token-crypto');
    const encryptedAccess = await encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Upsert the platform connection
    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform } },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        platformUserId: tokens.user_id || null,
        platformUsername: tokens.username || null,
      },
      create: {
        userId,
        platform,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        platformUserId: tokens.user_id || null,
        platformUsername: tokens.username || null,
      },
    });

    // Clear OAuth cookies on success
    const successResponse = NextResponse.redirect(`${baseUrl}/settings?oauth_success=${platform}`);
    successResponse.cookies.delete('oauth_state');
    successResponse.cookies.delete('oauth_code_verifier');
    return successResponse;
  } catch (e) {
    console.error(`[oauth/callback] ${platform} error:`, String(e));
    const errorResponse = NextResponse.redirect(`${baseUrl}/settings?oauth_error=exception`);
    errorResponse.cookies.delete('oauth_state');
    errorResponse.cookies.delete('oauth_code_verifier');
    return errorResponse;
  }
}
