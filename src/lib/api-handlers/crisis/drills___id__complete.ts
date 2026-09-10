import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const results = String(body.results || '').trim();
  try {
    const drill = await CrisisService.completeDrill(id, results, session.user.id);
    if (!drill) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ drill });
  } catch (e) {
    console.error('[crisis/drills/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_drill' }, { status: 500 });
  }
}
