import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AgentRuntime } from '@/lib/services/agent-runtime';

/**
 * GET /api/agents/run/[id] — get agent run status.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const run = await AgentRuntime.getRun(id);
  if (!run) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ run });
}

/**
 * POST /api/agents/run/[id] — cancel or resume an agent run.
 * Body: { action: 'cancel' | 'resume' }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.action === 'cancel') {
    await AgentRuntime.cancelRun(id);
    return NextResponse.json({ status: 'cancelled' });
  }

  if (body.action === 'resume') {
    const result = await AgentRuntime.resumeRun(id);
    if (!result) {
      return NextResponse.json({ error: 'cannot_resume' }, { status: 400 });
    }
    return NextResponse.json({ run: result });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
