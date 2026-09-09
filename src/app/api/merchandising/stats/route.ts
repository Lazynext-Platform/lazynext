import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MerchandisingService } from '@/lib/services/merchandising-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { assortmentCount: 0, planogramCount: 0, pricingCount: 0, promotionCount: 0, byAssortmentType: {}, byAssortmentStatus: {}, byPlanogramType: {}, byPlanogramStatus: {}, byPricingType: {}, byPricingStatus: {}, byPromotionType: {}, byPromotionStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await MerchandisingService.getMerchandisingStats(organizationId);
  return NextResponse.json({ stats });
}
