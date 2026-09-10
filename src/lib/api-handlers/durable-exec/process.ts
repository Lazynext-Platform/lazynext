import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DurableExecutionEngine } from '@/lib/services/durable-execution';

/**
 * POST /api/durable-exec/process — process pending jobs.
 * This endpoint can be called by a cron trigger or manually.
 *
 * Body (optional):
 *   workspaceId?: string — limit to a specific workspace
 *   limit?: number — max jobs to process (default 10)
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: string; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  try {
    // Also recover crashed jobs
    const recovered = await DurableExecutionEngine.recoverCrashedJobs();

    const result = await DurableExecutionEngine.processPendingJobs(
      body.workspaceId,
      body.limit || 10,
    );

    return NextResponse.json({
      ...result,
      crashedRecovered: recovered,
    });
  } catch (e) {
    console.error('[durable-exec/process] error:', e);
    return NextResponse.json({ error: 'failed_to_process_jobs' }, { status: 500 });
  }
}
