import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SprintService } from '@/lib/services/sprint-service';

/** GET /api/sprints/[id]/burndown — get burndown data for a sprint */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const burndown = await SprintService.getBurndown(id);
  return NextResponse.json({ burndown });
}
