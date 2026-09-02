import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

const VALID_PLATFORMS = new Set(['tiktok', 'youtube', 'instagram', 'facebook', 'linkedin']);

/** GET /api/publish/connections — list the user's connected platforms */
async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const connections = await prisma.platformConnection.findMany({
    where: { userId: uid },
    select: {
      id: true,
      platform: true,
      platformUsername: true,
      tokenExpiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ connections });
}

/** POST /api/publish/connections — store or update a platform OAuth token
 *  Body: { platform, accessToken, refreshToken?, tokenExpiresAt?, platformUserId?, platformUsername? }
 *  Tokens are encrypted at rest using AES-256-GCM.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const platform = String(body.platform || '');
  const accessToken = String(body.accessToken || '');

  if (!VALID_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
  }
  if (!accessToken) {
    return NextResponse.json({ error: 'access_token_required' }, { status: 400 });
  }

  // Encrypt tokens before storing
  const { encryptToken } = await import('@/lib/publishing/token-crypto');
  const encryptedAccess = await encryptToken(accessToken);
  const encryptedRefresh = body.refreshToken ? await encryptToken(String(body.refreshToken)) : null;

  // Upsert: update if connection exists, create if not
  const connection = await prisma.platformConnection.upsert({
    where: { userId_platform: { userId: uid, platform } },
    update: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
      platformUserId: body.platformUserId ? String(body.platformUserId) : null,
      platformUsername: body.platformUsername ? String(body.platformUsername) : null,
    },
    create: {
      userId: uid,
      platform,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
      platformUserId: body.platformUserId ? String(body.platformUserId) : null,
      platformUsername: body.platformUsername ? String(body.platformUsername) : null,
    },
  });

  return NextResponse.json({
    connection: {
      id: connection.id,
      platform: connection.platform,
      platformUsername: connection.platformUsername,
      tokenExpiresAt: connection.tokenExpiresAt?.toISOString() || null,
    },
  });
}

/** DELETE /api/publish/connections?platform=xxx — disconnect a platform */
async function __byokDELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const platform = url.searchParams.get('platform');
  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
  }

  await prisma.platformConnection.deleteMany({
    where: { userId: uid, platform },
  });

  return NextResponse.json({ ok: true });
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
export const DELETE = withAtlas(__byokDELETE);
