import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TraceService } from '@/lib/services/trace-service';

/**
 * GET /api/traces/[id] — get a trace with all its spans.
 * The [id] param is the traceId (not the database PK).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const trace = await TraceService.getTrace(id);
    if (!trace) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ trace });
  } catch (e) {
    console.error('[traces] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_trace' }, { status: 500 });
  }
}
