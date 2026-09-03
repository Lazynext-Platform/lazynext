import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { generateApiKey } from '@/lib/auth';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import { AuditService, AuditActions } from '@/lib/services/audit';

// GET /api/keys — list user's API keys
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ keys });
}

// POST /api/keys — create a new API key
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Rate limit
  const limited = await RateLimiter.check(req, RateLimits.API_KEY_CREATE, session.user.id);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'validation', message: 'Name is required' }, { status: 400 });
  }

  const scopes = Array.isArray(body.scopes) ? body.scopes : ['read'];
  const workspaceId = body.workspaceId || null;

  const { key, keyHash, keyPrefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      workspaceId,
      name,
      keyHash,
      keyPrefix,
      scopes: JSON.stringify(scopes),
    },
  });

  await AuditService.log({
    userId: session.user.id,
    workspaceId: workspaceId || undefined,
    action: AuditActions.API_KEY_CREATE,
    targetType: 'api_key',
    targetId: apiKey.id,
    metadata: { name, scopes },
    ip: req.headers.get('cf-connecting-ip') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  // Return the full key only once
  return NextResponse.json({
    id: apiKey.id,
    name,
    key,
    keyPrefix,
    scopes,
    createdAt: apiKey.createdAt,
  }, { status: 201 });
}
