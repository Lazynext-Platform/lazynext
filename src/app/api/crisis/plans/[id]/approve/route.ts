import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const plan = await CrisisService.approvePlan(id, session.user.id);
    if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[crisis/plans/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_plan' }, { status: 500 });
  }
}
