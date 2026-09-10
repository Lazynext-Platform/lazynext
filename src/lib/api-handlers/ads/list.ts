import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const campaigns = await prisma.adCampaign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => []);

  return NextResponse.json({ campaigns });
}

export const GET = withAtlas(__byokGET);
