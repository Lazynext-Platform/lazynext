import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { IntegrationHealthMonitor } from '@/lib/automation/health-monitor';

/**
 * POST /api/integration-health/check — check a single integration's health.
 * Body: { integrationId }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { integrationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const integrationId = body.integrationId?.trim();
  if (!integrationId) {
    return NextResponse.json({ error: 'integrationId_required' }, { status: 400 });
  }

  try {
    // Verify ownership.
    const ownership = await prisma.platformConnection.findFirst({
      where: { id: integrationId, userId: session.user.id },
      select: { id: true },
    });
    if (!ownership) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const result = await IntegrationHealthMonitor.checkIntegration(integrationId);
    if (!result) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (e) {
    console.error('[integration-health/check] error:', e);
    return NextResponse.json({ error: 'failed_to_check_integration' }, { status: 500 });
  }
}
