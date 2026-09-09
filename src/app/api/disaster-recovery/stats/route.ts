import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DisasterRecoveryService } from '@/lib/services/disaster-recovery-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { planCount: 0, backupCount: 0, testCount: 0, siteCount: 0, byPlanType: {}, byPlanStatus: {}, byBackupType: {}, byBackupStatus: {}, byTestType: {}, byTestStatus: {}, bySiteType: {}, bySiteStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await DisasterRecoveryService.getDisasterRecoveryStats(organizationId);
  return NextResponse.json({ stats });
}
