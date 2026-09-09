import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/speaker-opportunities/[id] — get a single speaker opportunity */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const speakerOpportunity = await CommunicationsService.getSpeakerOpportunity(id);
  if (!speakerOpportunity) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ speakerOpportunity });
}

/** PATCH /api/communications/speaker-opportunities/[id] — update a speaker opportunity */
export async function PATCH(
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
    const speakerOpportunity = await CommunicationsService.updateSpeakerOpportunity(id, {
      event: body.event, date: body.date, location: body.location, audience: body.audience,
      topic: body.topic, speaker: body.speaker, status: body.status,
      deadline: body.deadline, notes: body.notes,
    });
    if (!speakerOpportunity) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ speakerOpportunity });
  } catch (e) {
    console.error('[communications/speaker-opportunities] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_speaker_opportunity' }, { status: 500 });
  }
}
