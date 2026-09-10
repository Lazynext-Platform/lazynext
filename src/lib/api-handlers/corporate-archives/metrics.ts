import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateArchivesService } from '@/lib/services/corporate-archives-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeRecords: 0, archivedRecords: 0, openCollections: 0, pendingAccessRequests: 0, inProgressDigitization: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await CorporateArchivesService.getCorporateArchivesMetrics(organizationId);
  return NextResponse.json({ metrics });
}
