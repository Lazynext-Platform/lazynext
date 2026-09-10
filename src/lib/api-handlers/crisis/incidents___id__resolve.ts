import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const resolution = String(body.resolution || '').trim();
  try {
    const incident = await CrisisService.resolveIncident(id, resolution, session.user.id);
    if (!incident) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[crisis/incidents/resolve] error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_incident' }, { status: 500 });
  }
}
