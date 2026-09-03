import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/integrations/[platform] — disconnect an integration.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const existing = await prisma.platformConnection.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: platform.toLowerCase() } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.platformConnection.delete({
    where: { userId_platform: { userId: session.user.id, platform: platform.toLowerCase() } },
  });

  return NextResponse.json({ ok: true });
}
