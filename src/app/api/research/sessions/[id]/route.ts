import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ResearchService } from '@/lib/services/research';

/**
 * GET /api/research/sessions/[id] — get a research session by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const researchSession = await ResearchService.getSession(id);
    if (!researchSession) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ session: researchSession });
  } catch (e) {
    console.error('[research/sessions] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_session' }, { status: 500 });
  }
}

/**
 * PATCH /api/research/sessions/[id] — update a research session.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    findings?: Record<string, unknown>;
    summary?: string;
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    agentRunId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const existing = await ResearchService.getSession(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await ResearchService.updateSession(id, {
      findings: body.findings,
      summary: body.summary?.trim(),
      status: body.status,
      agentRunId: body.agentRunId?.trim(),
    });
    return NextResponse.json({ session: updated });
  } catch (e) {
    console.error('[research/sessions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_session' }, { status: 500 });
  }
}

/**
 * DELETE /api/research/sessions/[id] — delete a research session.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await ResearchService.getSession(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await ResearchService.deleteSession(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[research/sessions] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_session' }, { status: 500 });
  }
}
