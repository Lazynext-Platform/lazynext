import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { randomBytes } from 'crypto';

/**
 * GET /api/publish/oauth/[platform]
 * Initiates the OAuth flow for a publishing platform.
 * Redirects the user to the platform's authorization page.
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
}> = {
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scope: 'user.info.basic,video.publish,video.upload',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    redirectUriEnv: 'TIKTOK_REDIRECT_URI',
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    redirectUriEnv: 'YOUTUBE_REDIRECT_URI',
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    scope: 'instagram_content_publish',
    clientIdEnv: 'META_APP_ID',
    redirectUriEnv: 'META_REDIRECT_URI',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v2.0/dialog/oauth',
    scope: 'pages_manage_posts,pages_read_engagement',
    clientIdEnv: 'META_APP_ID',
    redirectUriEnv: 'META_REDIRECT_URI',
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'w_member_social',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    redirectUriEnv: 'LINKEDIN_REDIRECT_URI',
  },
};

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const config = OAUTH_CONFIGS[platform];
  if (!config) return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });

  const clientId = process.env[config.clientIdEnv];
  const redirectUri = process.env[config.redirectUriEnv];
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'oauth_not_configured', detail: `Missing ${config.clientIdEnv} or ${config.redirectUriEnv}` }, { status: 500 });
  }

  // Generate state for CSRF protection — encode userId so the callback can restore session
  const state = `${session.user.id}:${randomBytes(16).toString('hex')}`;

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
