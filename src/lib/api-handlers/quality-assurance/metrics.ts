import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { openDefects: 0, criticalDefects: 0, openCapas: 0, capaCompletionRate: 0, inspectionPassRate: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await QualityAssuranceService.getQualityAssuranceMetrics(organizationId);
  return NextResponse.json({ metrics });
}
