import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics';
import { WorkspaceService } from '@/lib/services/workspace';

export const maxDuration = 60;

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 404 });

  try {
    const hub = await AnalyticsService.getHub(workspaces[0].organizationId);
    return NextResponse.json(hub);
  } catch (e) {
    console.error('[analytics/hub] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
