import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MeetingService } from '@/lib/services/meeting-service';

/** PUT /api/meetings/[id]/transcript — set meeting transcript */
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
  const transcript = String(body.transcript || '');

  try {
    const meeting = await MeetingService.setTranscript(id, transcript);
    return NextResponse.json({ meeting });
  } catch (e) {
    console.error('[meetings/transcript] error:', e);
    return NextResponse.json({ error: 'failed_to_update_transcript' }, { status: 500 });
  }
}
