import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SprintService } from '@/lib/services/sprint-service';

/** POST /api/sprints/[id]/start — start a sprint */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sprint = await SprintService.start(id);
  if (!sprint) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ sprint });
}
