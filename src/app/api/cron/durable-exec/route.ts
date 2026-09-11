import { NextRequest, NextResponse } from 'next/server';
import { DurableExecutionEngine } from '@/lib/services/durable-execution';
import { TaskAutoAssigner } from '@/lib/services/task-auto-assigner';
import { MemoryService } from '@/lib/services/memory';

/**
 * POST /api/cron/durable-exec — cron-triggered durable execution processor.
 * Authenticates with CRON_SECRET env var.
 *
 * 1. Recovers crashed jobs
 * 2. Auto-assigns unassigned tasks to available agents
 * 3. Processes pending scheduled jobs
 * 4. Processes dead-letter queue (notifications)
 * 5. Sweeps expired episodic memories (24h TTL)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // 1. Recover crashed jobs
    const crashedRecovered = await DurableExecutionEngine.recoverCrashedJobs();

    // 2. Auto-assign tasks to agents
    const assigned = await TaskAutoAssigner.assignPendingTasks();

    // 3. Process pending jobs
    const jobResults = await DurableExecutionEngine.processPendingJobs(undefined, 20);

    // 4. Process dead-letter queue
    const deadLettered = await DurableExecutionEngine.processDeadLetterQueue();

    // 5. Sweep expired episodic memories (24h TTL)
    const episodicSwept = await MemoryService.sweepExpiredEpisodic().catch(() => 0);

    return NextResponse.json({
      crashedRecovered,
      tasksAssigned: assigned,
      jobs: jobResults,
      deadLettered,
      episodicSwept,
    });
  } catch (e) {
    console.error('[cron/durable-exec] error:', e);
    return NextResponse.json({ error: 'failed_to_process' }, { status: 500 });
  }
}
