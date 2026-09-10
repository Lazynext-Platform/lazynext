import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TaskService } from '@/lib/services/task';

/**
 * POST /api/tasks/[id]/time — start a time entry.
 * Body: { userId?: string }
 *
 * GET /api/tasks/[id]/time — list time entries for a task.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: taskId } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional — use session user id
  }

  try {
    const entry = await TaskService.startTimeEntry(taskId, body.userId || session.user.id);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    console.error('[tasks/time] start error:', e);
    return NextResponse.json({ error: 'failed_to_start_time_entry' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id: taskId } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const entries = await TaskService.getTimeEntries(taskId);
    const totalSeconds = await TaskService.getTotalTime(taskId);
    return NextResponse.json({ entries, totalSeconds });
  } catch (e) {
    console.error('[tasks/time] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_time_entries' }, { status: 500 });
  }
}
