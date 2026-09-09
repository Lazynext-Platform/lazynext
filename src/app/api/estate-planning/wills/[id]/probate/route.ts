import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const will = await EstatePlanningService.probateWill(id, session.user.id);
  if (!will) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ will });
}
