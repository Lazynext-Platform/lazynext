import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CarbonManagementService } from '@/lib/services/carbon-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const inventory = await CarbonManagementService.reviewCarbonInventory(id, session.user.id);
  if (!inventory) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ inventory });
}
