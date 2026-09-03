import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/integrations — list connected integrations.
 * POST /api/integrations — connect an integration (stores a platform connection).
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const connections = await prisma.platformConnection.findMany({
    where: { userId: session.user.id },
    select: { id: true, platform: true, platformUsername: true, createdAt: true },
  });

  return NextResponse.json({ connections });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { platform?: string; accessToken?: string; platformUsername?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const platform = body.platform?.trim().toLowerCase().slice(0, 50);
  if (!platform) {
    return NextResponse.json({ error: 'platform_required' }, { status: 400 });
  }

  // For demo purposes, we store a placeholder token. In production, this would
  // come from an OAuth flow with the platform.
  const accessToken = (body.accessToken || `demo-token-${Date.now()}`).slice(0, 4096);
  const platformUsername = body.platformUsername?.trim().slice(0, 200) || null;

  try {
    // Upsert: if connection exists, update; otherwise create
    const existing = await prisma.platformConnection.findUnique({
      where: { userId_platform: { userId: session.user.id, platform } },
    });

    if (existing) {
      const connection = await prisma.platformConnection.update({
        where: { userId_platform: { userId: session.user.id, platform } },
        data: {
          accessToken,
          platformUsername: platformUsername || existing.platformUsername,
        },
      });
      // Never return the accessToken in the response.
      return NextResponse.json({ connection: { id: connection.id, platform: connection.platform, platformUsername: connection.platformUsername, createdAt: connection.createdAt } });
    }

    const connection = await prisma.platformConnection.create({
      data: {
        userId: session.user.id,
        platform,
        accessToken,
        platformUsername,
      },
    });

    // Never return the accessToken in the response.
    return NextResponse.json({ connection: { id: connection.id, platform: connection.platform, platformUsername: connection.platformUsername, createdAt: connection.createdAt } }, { status: 201 });
  } catch (e) {
    console.error('[integrations] connect error:', e);
    return NextResponse.json(
      { error: 'failed_to_connect' },
      { status: 500 },
    );
  }
}
