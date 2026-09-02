import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getPerformanceSummary, getLearningsContext } from '@/lib/creative/learning';
import { dispatchWebhook } from '@/lib/webhooks';

export const maxDuration = 30;

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const summary = await getPerformanceSummary(session.user.id);
  const learnings = await getLearningsContext(session.user.id);

  await dispatchWebhook(session.user.id, 'performance.recorded', { creationId: null, platform: summary.topPlatforms[0]?.value || null, roas: summary.overallRoas }).catch(() => {});

  return NextResponse.json({ summary, learnings });
}

export const GET = withAtlas(__byokGET);
