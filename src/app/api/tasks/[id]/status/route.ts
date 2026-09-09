import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TaskService } from '@/lib/services/task';

/**
 * POST /api/tasks/[id]/status — update task status with dependency checking.
 * Body: { status: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const status = body.status?.trim();
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const result = await TaskService.updateStatus(id, status);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[tasks/status] error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_update_status' }, { status: 500 });
  }
}
