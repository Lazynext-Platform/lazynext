import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/challenges — list challenges */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ challenges: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; status?: string } = {};
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  if (category) opts.category = category;
  if (status) opts.status = status;

  const challenges = await InnovationService.listChallenges(organizationId, opts as never);
  return NextResponse.json({ challenges });
}

/** POST /api/innovation/challenges — create a challenge */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const category = String(body.category || '').trim();
  if (!title || !category) {
    return NextResponse.json({ error: 'title_category_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const challenge = await InnovationService.createChallenge(
      ws.organizationId, ws.id,
      {
        title, category: category as never, description: body.description, prize: body.prize,
        deadline: body.deadline, status: body.status, participants: body.participants,
        submissions: body.submissions, winnerId: body.winnerId, criteria: body.criteria,
      },
      session.user.id,
    );
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (e) {
    console.error('[innovation/challenges] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_challenge' }, { status: 500 });
  }
}
