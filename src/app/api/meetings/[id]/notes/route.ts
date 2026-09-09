import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MeetingService } from '@/lib/services/meeting-service';

/** PUT /api/meetings/[id]/notes — add/update meeting notes */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const notes = String(body.notes || '');

  try {
    const meeting = await MeetingService.addNotes(id, notes);
    return NextResponse.json({ meeting });
  } catch (e) {
    console.error('[meetings/notes] error:', e);
    return NextResponse.json({ error: 'failed_to_update_notes' }, { status: 500 });
  }
}
