import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { randomBytes, createHash } from 'crypto';

/**
 * GET /api/publish/oauth/[platform]
 * Initiates the OAuth flow for a publishing platform with PKCE.
 * Redirects the user to the platform's authorization page.
 *
 * PKCE (Proof Key for Code Exchange) is used for YouTube/Google and
 * LinkedIn. TikTok and Meta (Instagram/Facebook) do not require PKCE
 * for server-side flows, but the code_verifier is still generated and
 * stored in a cookie for consistency — the callback simply ignores it
 * for platforms that don't use it.
 *
 * Required env vars per platform:
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI
 *   META_APP_ID, META_APP_SECRET, META_REDIRECT_URI (for instagram + facebook)
 *   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI
 */
const OAUTH_CONFIGS: Record<string, {
  authUrl: string;
  scope: string;
  clientIdEnv: string;
  redirectUriEnv: string;
  /** Whether this platform supports PKCE. */
  supportsPkce: boolean;
  /** Extra params to add to the authorization URL. */
  extraParams?: Record<string, string>;
}> = {
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scope: 'user.info.basic,video.publish,video.upload',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    redirectUriEnv: 'TIKTOK_REDIRECT_URI',
    supportsPkce: false,
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    redirectUriEnv: 'YOUTUBE_REDIRECT_URI',
    supportsPkce: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    scope: 'instagram_content_publish',
    clientIdEnv: 'META_APP_ID',
    redirectUriEnv: 'META_REDIRECT_URI',
    supportsPkce: false,
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v2.0/dialog/oauth',
    scope: 'pages_manage_posts,pages_read_engagement',
    clientIdEnv: 'META_APP_ID',
    redirectUriEnv: 'META_REDIRECT_URI',
    supportsPkce: false,
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'w_member_social',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    redirectUriEnv: 'LINKEDIN_REDIRECT_URI',
    supportsPkce: true,
  },
};

/** Generate a PKCE code_verifier and code_challenge (S256). */
function generatePkce(): { verifier: string; challenge: string } {
  // Generate a high-entropy random code_verifier (43-128 chars, URL-safe)
  const verifier = randomBytes(32).toString('base64url');
  // Derive the code_challenge using SHA-256 (S256 method)
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const config = OAUTH_CONFIGS[platform];
  if (!config) return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });

  const clientId = process.env[config.clientIdEnv];
  const redirectUri = process.env[config.redirectUriEnv];
  if (!clientId || !redirectUri) {
    console.error(`[oauth/init] ${platform} missing env: ${config.clientIdEnv} or ${config.redirectUriEnv}`);
    return NextResponse.json({ error: 'oauth_not_configured' }, { status: 500 });
  }

  // Generate state for CSRF protection — encode userId so the callback can restore session
  const state = `${session.user.id}:${randomBytes(16).toString('hex')}`;

  // Generate PKCE pair if the platform supports it
  const pkce = config.supportsPkce ? generatePkce() : null;

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', state);

  // Add PKCE challenge if supported
  if (pkce) {
    authUrl.searchParams.set('code_challenge', pkce.challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
  }

  // Add extra params (e.g. access_type=offline for YouTube)
  if (config.extraParams) {
    for (const [key, value] of Object.entries(config.extraParams)) {
      authUrl.searchParams.set(key, value);
    }
  }

  // Build the redirect response
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://lazynext.com';
  const response = NextResponse.redirect(authUrl.toString());

  // Store state and code_verifier in short-lived cookies for the callback
  // Use SameSite=None + Secure so they survive the cross-site redirect
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'none' as const,
    secure: true,
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  };
  response.cookies.set('oauth_state', state, cookieOptions);
  if (pkce) {
    response.cookies.set('oauth_code_verifier', pkce.verifier, cookieOptions);
  }

  return response;
}
