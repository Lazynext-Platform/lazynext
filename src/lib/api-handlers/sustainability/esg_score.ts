import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/esg-score — aggregate ESG score (query: organizationId) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      environmental: 0, social: 0, governance: 0, overall: 0,
    });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  const score = await SustainabilityService.getESGScore(organizationId);
  return NextResponse.json(score);
}
