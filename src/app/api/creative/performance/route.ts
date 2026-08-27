import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getPerformanceSummary, getLearningsContext } from '@/lib/creative/learning';

export const maxDuration = 30;

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const summary = await getPerformanceSummary(session.user.id);
  const learnings = await getLearningsContext(session.user.id);

  return NextResponse.json({ summary, learnings });
}

export const GET = withAtlas(__byokGET);
