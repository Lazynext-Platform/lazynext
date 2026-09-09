import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const incident = await CrisisService.closeIncident(id, session.user.id);
    if (!incident) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[crisis/incidents/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close_incident' }, { status: 500 });
  }
}
