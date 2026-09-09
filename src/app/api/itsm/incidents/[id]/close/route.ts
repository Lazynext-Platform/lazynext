import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITSMService } from '@/lib/services/itsm-service';

/** POST /api/itsm/incidents/[id]/close — close an incident */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const incident = await ITSMService.closeIncident(id);
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[itsm/incidents/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close' }, { status: 500 });
  }
}
