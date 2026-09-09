import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BusinessContinuityService } from '@/lib/services/business-continuity-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const plan = await BusinessContinuityService.activateContinuityPlan(id, session.user.id);
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ plan });
}
