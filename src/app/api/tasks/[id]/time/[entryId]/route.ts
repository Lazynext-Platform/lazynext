import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TaskService } from '@/lib/services/task';

/**
 * POST /api/tasks/[id]/time/[entryId] — stop a time entry.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const { entryId } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await TaskService.stopTimeEntry(entryId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[tasks/time/entry] stop error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_stop_time_entry' }, { status: 500 });
  }
}
