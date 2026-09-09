import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeiService } from '@/lib/services/dei-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const currentValue = Number(body.currentValue);
  if (isNaN(currentValue)) return NextResponse.json({ error: 'currentValue_required' }, { status: 400 });
  try {
    const goal = await DeiService.updateGoalProgress(id, currentValue, session.user.id);
    if (!goal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ goal });
  } catch (e) {
    console.error('[dei/goals/progress] error:', e);
    return NextResponse.json({ error: 'failed_to_update_progress' }, { status: 500 });
  }
}
