import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/publish/oauth/[platform]/callback
 * OAuth callback handler — exchanges the authorization code for access/refresh tokens.
 *
 * Query params: ?code=xxx&state=userId:randomHex
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

  // Exchange code for tokens
  try {
    const tokenRes = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
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

    return NextResponse.redirect(`${baseUrl}/settings?oauth_success=${platform}`);
  } catch (e) {
    console.error(`[oauth/callback] ${platform} error:`, String(e));
    return NextResponse.redirect(`${baseUrl}/settings?oauth_error=exception`);
  }
}
