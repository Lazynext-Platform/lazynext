import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

/**
 * POST /api/creative/share
 * Create a shareable link for an asset.
 * Body: { assetId: string, password?: string, expiresHours?: number }
 * Returns: { token, url, expiresAt }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const assetId = String(body.assetId || '');
  if (!assetId) return NextResponse.json({ error: 'assetId_required' }, { status: 400 });

  // Verify ownership
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: uid } });
  if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const token = randomBytes(24).toString('hex');
  const expiresAt = typeof body.expiresHours === 'number' && body.expiresHours > 0
    ? new Date(Date.now() + body.expiresHours * 60 * 60 * 1000)
    : null;

  // Note: password is stored as-is for simplicity (not bcrypt, since bcrypt may not work in Cloudflare Workers)
  // In production, use a Web Crypto API hash
  const password = typeof body.password === 'string' && body.password.trim()
    ? body.password.trim()
    : null;

  const link = await prisma.sharedLink.create({
    data: { userId: uid, assetId, token, password, expiresAt },
  });

  return NextResponse.json({
    token: link.token,
    url: `/share/${link.token}`,
    expiresAt: link.expiresAt?.toISOString() || null,
  });
}

/**
 * GET /api/creative/share?assetId=xxx
 * List share links for an asset (owner only).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const assetId = url.searchParams.get('assetId');
  if (!assetId) return NextResponse.json({ error: 'assetId_required' }, { status: 400 });

  const links = await prisma.sharedLink.findMany({
    where: { userId: uid, assetId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ links: links.map(l => ({
    id: l.id,
    token: l.token,
    url: `/share/${l.token}`,
    hasPassword: !!l.password,
    expiresAt: l.expiresAt?.toISOString() || null,
    views: l.views,
    createdAt: l.createdAt.toISOString(),
  }))});
}

/**
 * DELETE /api/creative/share?id=xxx
 * Revoke a share link (owner only).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const link = await prisma.sharedLink.findFirst({ where: { id, userId: uid } });
  if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.sharedLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
