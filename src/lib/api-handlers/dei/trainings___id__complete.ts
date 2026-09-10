import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeiService } from '@/lib/services/dei-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const completionRate = Number(body.completionRate);
  if (isNaN(completionRate)) return NextResponse.json({ error: 'completionRate_required' }, { status: 400 });
  try {
    const training = await DeiService.completeTraining(id, completionRate, session.user.id);
    if (!training) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ training });
  } catch (e) {
    console.error('[dei/trainings/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_training' }, { status: 500 });
  }
}
