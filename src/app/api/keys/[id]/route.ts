import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { AuditService, AuditActions } from '@/lib/services/audit';

// DELETE /api/keys/[id] — revoke an API key
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id, revokedAt: null },
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await AuditService.log({
    userId: session.user.id,
    workspaceId: apiKey.workspaceId || undefined,
    action: AuditActions.API_KEY_REVOKE,
    targetType: 'api_key',
    targetId: id,
    ip: req.headers.get('cf-connecting-ip') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json({ success: true });
}
