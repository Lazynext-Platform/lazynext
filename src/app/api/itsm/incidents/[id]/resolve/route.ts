import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITSMService } from '@/lib/services/itsm-service';

/** POST /api/itsm/incidents/[id]/resolve — resolve an incident */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const incident = await ITSMService.resolveIncident(id, body.resolution);
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[itsm/incidents/resolve] error:', e);
    return NextResponse.json({ error: 'failed_to_resolve' }, { status: 500 });
  }
}
