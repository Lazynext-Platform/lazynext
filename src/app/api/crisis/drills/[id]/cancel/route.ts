import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  try {
    const drill = await CrisisService.cancelDrill(id, reason, session.user.id);
    if (!drill) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ drill });
  } catch (e) {
    console.error('[crisis/drills/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_drill' }, { status: 500 });
  }
}
