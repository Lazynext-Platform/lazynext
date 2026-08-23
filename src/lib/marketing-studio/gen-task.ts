import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deductCredits, grantCredits } from '@/lib/credits';
import { isByok } from '@/lib/request-context';
import {
  selectInternalTask,
  taskOutputUrls,
} from '@/lib/marketing-studio/task-outputs';

// Distinguish two charge failure types: insufficient balance (→402) vs system/DB error (→500, must not masquerade as "insufficient credits").
export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
  }
}
export class ChargeError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'ChargeError';
  }
}

/** Synchronous charge (for plan/script type sync-return, refund-on-failure scenarios). Distinguishes insufficient balance from system error. */
export async function chargeSync(uid: string, cost: number, ref: string): Promise<void> {
  try {
    await deductCredits(uid, cost, 'generate', ref);
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_CREDITS') throw new InsufficientCreditsError();
    throw new ChargeError(String(e));
  }
}

/** Synchronous refund (for plan/script generation failure rollback). */
export async function refundSync(uid: string, cost: number, ref: string): Promise<void> {
  await grantCredits(uid, cost, 'refund', ref);
}

/**
 * Unified flow for async generation tasks: charge → submit to Atlas → create a processing Creation record (for async failure refund on poll).
 * - Charge failure: throws InsufficientCreditsError / ChargeError, route converts to 402 / 500 respectively.
 * - Submit failure: refunds immediately and throws the original Atlas error (route passes through detail).
 * - DB write failure: doesn't affect video output, only logs (cost is that async failure can't auto-refund for this task).
 * templateId uses shot/intermediate-step-specific values (mk-shot/drama-shot/adref:*), to avoid mixing into the "history" panel.
 */
export async function chargeAndSubmit(opts: {
  uid: string;
  cost: number;
  ref: string;
  templateId: string;
  model: string;
  prompt?: string;
  submit: () => Promise<{ id: string; getUrl: string }>;
}): Promise<{ id: string; getUrl: string }> {
  try {
    await deductCredits(opts.uid, opts.cost, 'generate', opts.ref);
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_CREDITS') throw new InsufficientCreditsError();
    throw new ChargeError(String(e));
  }

  let res: { id: string; getUrl: string };
  try {
    res = await opts.submit();
  } catch (e) {
    await grantCredits(opts.uid, opts.cost, 'refund', opts.ref);
    throw e;
  }

  try {
    await prisma.creation.create({
      data: {
        userId: opts.uid,
        templateId: opts.templateId,
        model: opts.model,
        prompt: (opts.prompt || '').slice(0, 500),
        status: 'processing',
        taskId: res.id,
        getUrl: res.getUrl,
        cost: isByok() ? 0 : opts.cost,
      },
    });
  } catch (e) {
    console.error('[gen-task] creation.create failed (async refund will be unavailable for this task):', String(e));
  }
  return res;
}

/**
 * Attach the final video task to a studio-level creation placeholder. Only allows associating the current user's own Marketing Studio
 * processing records; association failure must not make an already-submitted, already-charged Atlas task appear "submit failed" on the frontend and get re-submitted.
 */
export async function linkMarketingCreationTask(opts: {
  uid: string;
  creationId?: string;
  taskId: string;
  getUrl: string;
  model: string;
}): Promise<boolean> {
  const creationId = (opts.creationId || '').trim();
  if (!creationId) return false;
  try {
    const update = await prisma.creation.updateMany({
      where: {
        id: creationId,
        userId: opts.uid,
        templateId: 'marketing-studio',
        status: 'processing',
      },
      data: {
        taskId: opts.taskId,
        getUrl: opts.getUrl,
        model: opts.model,
        error: null,
      },
    });
    if (update.count !== 1) {
      console.warn(`[gen-task] parent creation was not linked: creation=${creationId} task=${opts.taskId}`);
    }
    return update.count === 1;
  } catch (error) {
    console.error(`[gen-task] parent creation link failed: creation=${creationId} task=${opts.taskId}`, String(error));
    return false;
  }
}

async function trackedTask(getUrl: string, status?: string) {
  const tasks = await prisma.creation.findMany({
    where: {
      getUrl,
      ...(status ? { status } : {}),
    },
  });
  return selectInternalTask(tasks);
}

/**
 * Refund when poll detects Atlas task failure. Uses getUrl to precisely locate the DB record (the getUrl passed back verbatim by frontend === the getUrl stored at DB write time,
 * doesn't depend on URL format parsing, most reliable). Uses atomic processing→failed transition for idempotency:
 * only the first successful processing→failed change (count===1) refunds; multiple frontend polls won't double-refund.
 */
export async function refundFailedTask(getUrl: string, atlasError?: string): Promise<void> {
  if (!getUrl) return;
  const c = await trackedTask(getUrl, 'processing');
  if (!c) return;
  const upd = await prisma.creation.updateMany({
    where: { id: c.id, status: 'processing' },
    data: { status: 'failed', error: (atlasError || '').slice(0, 500) },
  });
  if (upd.count === 1 && c.cost > 0) {
    try {
      await grantCredits(c.userId, c.cost, 'refund', c.taskId || `creation:${c.id}`);
    } catch (e) {
      // Very low probability: status already set to failed but refund transaction failed. Log for manual compensation.
      // Don't auto-revert status — reverting would make the next poll retry the refund, combined with concurrent polls could double-refund; better to leave a log for manual compensation.
      console.error(`[gen-task] REFUND FAILED (needs manual comp) uid=${c.userId} cost=${c.cost} task=${c.taskId}:`, String(e));
    }
  }
}

/**
 * Completed task outputs serve as the idempotent cache for the poll endpoint. On page refresh or network retry, return the R2/Blob URLs here first,
 * avoiding re-downloading the same Atlas temporary file and repeatedly writing to object storage.
 */
export async function completedTaskOutputs(getUrl: string): Promise<string[] | null> {
  if (!getUrl) return null;
  const creations = await prisma.creation.findMany({
    where: { getUrl, status: 'completed' },
    select: { outputs: true },
  });
  for (const creation of creations) {
    const outputs = taskOutputUrls(creation.outputs);
    if (outputs.length) return outputs;
  }
  return null;
}

export type CompletionClaim =
  | { kind: 'claimed' }
  | { kind: 'completed'; outputs: string[] }
  | { kind: 'failed' }
  | { kind: 'waiting' }
  | { kind: 'untracked' };

/**
 * Atomically claim the right to persist the completed result. Multiple tabs may see Atlas completed simultaneously;
 * only the first request to successfully transition processing → persisting may write to object storage, others wait for the cache.
 */
export async function claimTaskCompletion(getUrl: string): Promise<CompletionClaim> {
  if (!getUrl) return { kind: 'untracked' };
  const creation = await trackedTask(getUrl);
  if (!creation) return { kind: 'untracked' };

  const existingOutputs = taskOutputUrls(creation.outputs);
  if (creation.status === 'completed' && existingOutputs.length) {
    return { kind: 'completed', outputs: existingOutputs };
  }
  if (creation.status === 'failed') return { kind: 'failed' };

  let claimed = false;
  if (creation.status === 'processing' || creation.status === 'completed') {
    const update = await prisma.creation.updateMany({
      where: { id: creation.id, status: creation.status },
      data: { status: 'persisting' },
    });
    claimed = update.count === 1;
  } else if (
    creation.status === 'persisting'
    && Date.now() - new Date(creation.updatedAt).getTime() > 2 * 60_000
  ) {
    // The previous persist request may have been killed by the platform. After the 2-minute lease expires, allow one request to atomically take over.
    const update = await prisma.creation.updateMany({
      where: {
        id: creation.id,
        status: 'persisting',
        updatedAt: { lte: new Date(Date.now() - 2 * 60_000) },
      },
      data: { status: 'persisting' },
    });
    claimed = update.count === 1;
  }
  if (claimed) return { kind: 'claimed' };

  // Another request is currently persisting. Briefly wait for it to write the cache; if still not done, let the client continue polling later.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const current = await prisma.creation.findUnique({ where: { id: creation.id } });
    if (!current) return { kind: 'untracked' };
    const outputs = taskOutputUrls(current.outputs);
    if (current.status === 'completed' && outputs.length) {
      return { kind: 'completed', outputs };
    }
    if (current.status === 'failed') return { kind: 'failed' };
  }
  return { kind: 'waiting' };
}

export async function releaseTaskCompletionClaim(getUrl: string): Promise<void> {
  if (!getUrl) return;
  await prisma.creation.updateMany({
    where: { getUrl, status: 'persisting' },
    data: { status: 'processing' },
  });
}

/**
 * When poll detects task completion, marks the processing record as completed (idempotent, located by getUrl) and saves playable outputs.
 * Returns whether "deliverable": if the task is already in failed terminal state (already refunded), returns false, poll uses this to refuse delivering the video to the client,
 * preventing "refund + delivery" coexistence (defense in depth). If no DB record exists (fault-tolerant scenario), defaults to allowing delivery.
 */
export async function markTaskCompleted(getUrl: string, outputs?: string[]): Promise<boolean> {
  if (!getUrl) return true;
  const c = await trackedTask(getUrl);
  if (!c) return true; // no DB record, can't determine refund status, allow delivery
  if (c.status === 'failed') return false; // already refunded, refuse to deliver the video again
  await prisma.creation.updateMany({
    where: { id: c.id },
    data: {
      status: 'completed',
      ...(outputs?.length ? { outputs } : {}),
    },
  });
  return true;
}

/** Unifies charge/submit phase exceptions into HTTP responses: insufficient balance→402, charge system error→500, Atlas submit failure→502 (passes through original message). */
export function chargeErrorResponse(e: unknown, tag: string) {
  if (e instanceof InsufficientCreditsError) {
    return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
  }
  if (e instanceof ChargeError) {
    console.error(`[${tag}] charge error:`, String(e));
    return NextResponse.json({ error: 'charge_failed', detail: String(e) }, { status: 500 });
  }
  console.error(`[${tag}] atlas error:`, String(e));
  return NextResponse.json({ error: 'atlas_submit_failed', detail: String(e) }, { status: 502 });
}
