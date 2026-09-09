import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalObligationService } from '@/lib/services/legal-obligation-service';

/** GET /api/legal/obligations/upcoming — obligations due within N days */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ obligations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10);
  const obligations = await LegalObligationService.getUpcoming(organizationId, days);
  return NextResponse.json({ obligations });
}
