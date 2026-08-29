import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getChain, executeChain, estimateChainCredits } from '@/lib/creative/skill-library';
import type { SkillExecutionResult } from '@/lib/creative/skill-library';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const chainId = typeof body.chainId === 'string' ? body.chainId : '';
  const inputs = (body.inputs && typeof body.inputs === 'object' ? body.inputs : {}) as Record<string, unknown>;

  if (!chainId) return NextResponse.json({ error: 'chain_id_required' }, { status: 400 });

  const chain = getChain(chainId);
  if (!chain) {
    return NextResponse.json({ error: 'chain_not_found' }, { status: 404 });
  }

  // Charge the total chain credits up front with an idempotency key
  // so duplicate requests (e.g. retries) don't double-charge.
  const cost = estimateChainCredits(chain);
  const idempotencyKey = `chain:${chainId}:${randomUUID()}`;
  if (cost > 0) {
    try {
      await deductCredits(uid, cost, `creative:skill-chain:${chainId}`, undefined, idempotencyKey);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
        },
        { status: 402 },
      );
    }
  }

  // Create a durable WorkflowRun record for persistence and visibility.
  // This unifies chain execution with the pipeline engine's durability model:
  // chain runs now appear in the pipeline list and can be inspected after completion.
  const runId = randomUUID();
  try {
    await prisma.workflowRun.create({
      data: {
        id: runId,
        userId: uid,
        workflowType: 'skill-chain',
        status: 'running',
        input: { chainId, inputs, chainName: chain.name } as any,
      },
    });
  } catch (e) {
    console.warn('[creative/skills/chain] failed to create WorkflowRun:', String(e));
    // Continue execution even if persistence fails — the chain still works
  }

  try {
    const { results, finalOutput } = await executeChain(chainId, inputs, planTier);

    // Update the WorkflowRun with the results
    try {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          output: { results, finalOutput, chainId } as any,
          completedAt: new Date(),
        },
      });
    } catch (e) {
      console.warn('[creative/skills/chain] failed to update WorkflowRun:', String(e));
    }

    return NextResponse.json({ results, finalOutput, runId });
  } catch (e) {
    // Partial-failure handling: refund only the credits for unexecuted steps
    const completedResults = (e as any)?.completedResults as SkillExecutionResult[] | undefined;
    const remainingSteps = (e as any)?.remainingSteps as number | undefined;
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[creative/skills/chain] execute ${chainId} error:`, message);

    if (cost > 0) {
      if (remainingSteps !== undefined && remainingSteps > 0) {
        // Refund only the unexecuted steps' credits
        const stepCost = cost / chain.steps.length;
        const refundAmount = Math.ceil(stepCost * remainingSteps);
        if (refundAmount > 0) {
          await refundCredits(uid, refundAmount, `creative:skill-chain:${chainId}`).catch(() => {});
        }
      } else {
        // Full refund — no steps completed
        await refundCredits(uid, cost, `creative:skill-chain:${chainId}`).catch(() => {});
      }
    }

    // Mark the WorkflowRun as failed
    try {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error: message,
          output: completedResults ? { partialResults: completedResults, chainId } as any : undefined,
          completedAt: new Date(),
        },
      });
    } catch {
      // Best-effort
    }

    // Return partial results if available
    if (completedResults && completedResults.length > 0) {
      return NextResponse.json({
        error: 'chain_step_failed',
        runId,
        partialResults: completedResults,
        failedAtStep: (e as any)?.stepIndex,
        failedSkillId: (e as any)?.skillId,
      }, { status: 500 });
    }

    return NextResponse.json({ error: 'chain_execution_failed', runId }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
