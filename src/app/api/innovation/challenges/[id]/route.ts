import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/challenges/[id] — get a single challenge */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const challenge = await InnovationService.getChallenge(id);
  if (!challenge) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ challenge });
}

/** PATCH /api/innovation/challenges/[id] — update a challenge */
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
    const challenge = await InnovationService.updateChallenge(id, {
      title: body.title, description: body.description, category: body.category,
      prize: body.prize, deadline: body.deadline, status: body.status,
      participants: body.participants, submissions: body.submissions,
      winnerId: body.winnerId, criteria: body.criteria,
    });
    if (!challenge) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ challenge });
  } catch (e) {
    console.error('[innovation/challenges] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_challenge' }, { status: 500 });
  }
}
