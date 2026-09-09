import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/certifications/expiring — list expiring certifications */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ certifications: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const daysAhead = Number(url.searchParams.get('daysAhead') || 90);

  const certifications = await TrainingService.getExpiringCertifications(organizationId, daysAhead);
  return NextResponse.json({ certifications });
}
