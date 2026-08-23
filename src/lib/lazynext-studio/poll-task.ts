import { pollOnce } from '@/lib/atlas';
import {
  claimTaskCompletion,
  completedTaskOutputs,
  markTaskCompleted,
  refundFailedTask,
  releaseTaskCompletionClaim,
} from '@/lib/lazynext-studio/gen-task';
import { persistToR2 } from '@/lib/lazynext-studio/r2';

export type MarketingTaskPollResult = {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputs: string[];
  error?: string;
  transient?: boolean;
  cached?: boolean;
  persisted?: boolean;
};

/**
 * Single "poll + persist + record" pass for the final Atlas task.
 * Shared by both the generation page and the creations page, so even if the generation page is closed, the creations page can automatically collect Atlas-completed results into the creation card.
 */
export async function pollMarketingTask(getUrl: string): Promise<MarketingTaskPollResult> {
  try {
    const cachedOutputs = await completedTaskOutputs(getUrl);
    if (cachedOutputs) {
      return {
        status: 'completed',
        outputs: cachedOutputs,
        cached: true,
        persisted: true,
      };
    }
  } catch (error) {
    console.warn('[marketing/poll] completed output cache lookup failed:', String(error));
  }

  let result: Awaited<ReturnType<typeof pollOnce>>;
  try {
    result = await pollOnce(getUrl);
  } catch (error) {
    const message = String(error);
    if (/\b50[234]\b|timeout|timed ?out|ETIMEDOUT|ECONNRESET|socket|network|fetch failed/i.test(message)) {
      return { status: 'processing', outputs: [], transient: true };
    }
    throw error;
  }

  let completionClaimed = false;
  try {
    if (result.status === 'completed' && result.outputs?.length) {
      const claim = await claimTaskCompletion(getUrl);
      if (claim.kind === 'completed') {
        return {
          status: 'completed',
          outputs: claim.outputs,
          cached: true,
          persisted: true,
        };
      }
      if (claim.kind === 'failed') {
        return { status: 'failed', outputs: [], error: 'refunded' };
      }
      if (claim.kind === 'waiting') {
        return { status: 'processing', outputs: [], transient: true };
      }
      completionClaimed = claim.kind === 'claimed';
      const outputs = await Promise.all(result.outputs.map((url) => persistToR2(url)));
      const delivered = await markTaskCompleted(getUrl, outputs);
      if (!delivered) return { status: 'failed', outputs: [], error: 'refunded' };
      return { status: 'completed', outputs, persisted: true };
    }
    if (result.status === 'failed' || (result.status === 'completed' && !result.outputs?.length)) {
      const error = result.error || (result.status === 'completed' ? 'completed_no_output' : 'no_output');
      console.error('[marketing/poll] atlas task failed/empty:', result.status, error);
      await refundFailedTask(getUrl, error);
      return { status: 'failed', outputs: [], error };
    }
    return {
      status: result.status,
      outputs: result.outputs || [],
      error: result.error,
    };
  } catch (error) {
    if (completionClaimed) {
      try {
        await releaseTaskCompletionClaim(getUrl);
      } catch (releaseError) {
        console.error('[marketing/poll] completion claim release failed:', String(releaseError));
      }
    }
    console.error('[marketing/poll] post-process error:', String(error));
    if (result.status === 'completed' && result.outputs?.length) {
      return {
        status: 'completed',
        outputs: result.outputs,
        error: 'persist_failed',
        persisted: false,
      };
    }
    return {
      status: result.status,
      outputs: result.outputs || [],
      error: result.error,
    };
  }
}
