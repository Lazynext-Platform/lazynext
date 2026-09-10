import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { SecurityService } from '@/lib/services/security';
import { safeError } from '@/lib/security';
import { IntegrationRegistry, type IntegrationConfig } from '@/lib/integrations';

/**
 * GET /api/integrations — list connected integrations AND registered integration clients.
 * POST /api/integrations — connect an integration (stores a platform connection),
 *                          or test an integration connection when `action: 'test'`.
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

  // Also expose the registry of built-in integration clients (stub framework).
  const integrations = IntegrationRegistry.list().map((name) => {
    const client = IntegrationRegistry.get(name);
    return { name, type: client?.type ?? 'unknown' };
  });

  return NextResponse.json({ connections, integrations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    platform?: string;
    accessToken?: string;
    platformUsername?: string;
    action?: string;
    name?: string;
    credentials?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // ── Test an integration connection via the registry ──
  if (body.action === 'test') {
    const name = body.name?.trim().toLowerCase().slice(0, 50);
    if (!name) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 });
    }
    const client = IntegrationRegistry.get(name);
    if (!client) {
      return NextResponse.json({ error: 'integration_not_found' }, { status: 404 });
    }

    const config: IntegrationConfig = {
      id: name,
      name,
      type: client.type,
      enabled: true,
      credentials: body.credentials ?? {},
    };
    client.configure(config);

    try {
      const result = await client.testConnection();
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
      return NextResponse.json(safeError(e, 'integrations', 'test_failed'), { status: 500 });
    }
  }

  // ── Default: connect a platform (existing OAuth-connection flow) ──
  const platform = body.platform?.trim().toLowerCase().slice(0, 50);
  if (!platform) {
    return NextResponse.json({ error: 'platform_required' }, { status: 400 });
  }

  // For demo purposes, we store a placeholder token. In production, this would
  // come from an OAuth flow with the platform.
  const rawToken = (body.accessToken || `demo-token-${Date.now()}`).slice(0, 4096);
  const platformUsername = body.platformUsername?.trim().slice(0, 200) || null;

  // Encrypt the token before storing it at rest
  const accessToken = await SecurityService.encryptTokenIfPlain(rawToken);

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
