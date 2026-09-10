import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeInitiatives: 0, trainingCompletion: 0, goalProgress: 0, representationSummary: {} } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await DeiService.getDeiMetrics(organizationId);
  return NextResponse.json({ metrics });
}
