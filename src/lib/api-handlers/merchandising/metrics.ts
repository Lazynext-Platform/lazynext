import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MerchandisingService } from '@/lib/services/merchandising-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeAssortments: 0, publishedPlanograms: 0, activePricings: 0, activePromotions: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await MerchandisingService.getMerchandisingMetrics(organizationId);
  return NextResponse.json({ metrics });
}
