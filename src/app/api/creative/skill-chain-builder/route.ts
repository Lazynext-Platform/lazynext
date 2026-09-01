import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import type { Prisma } from '@prisma/client';
import {
  SKILL_CHAIN_BUILDER_CREDIT_COST,
  BUILTIN_ENHANCED_CHAINS,
  getEnhancedChain,
  listEnhancedChains,
  validateEnhancedChain,
  executeEnhancedChain,
  estimateEnhancedChainCredits,
  type EnhancedSkillChain,
} from '@/lib/creative/skill-chain-builder';
import { listSkills } from '@/lib/creative/skill-library';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

// ── GET: list built-in enhanced chains + available skills (auth required) ──

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  return NextResponse.json({
    creditCost: SKILL_CHAIN_BUILDER_CREDIT_COST,
    chains: listEnhancedChains(),
    skills: listSkills(),
  });
}

export const GET = withAtlas(__byokGET);

// ── POST: execute an enhanced chain by ID or custom chain definition ──

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const chainId = typeof body.chainId === 'string' ? body.chainId : '';
  const inputs =
    body.inputs && typeof body.inputs === 'object'
      ? (body.inputs as Record<string, unknown>)
      : {};

  // Resolve the chain: either a built-in id or a custom chain definition.
  let chain: EnhancedSkillChain | undefined;
  if (chainId) {
    chain = getEnhancedChain(chainId);
    if (!chain) {
      return NextResponse.json({ error: 'chain_not_found', detail: `Unknown chain: ${chainId}` }, { status: 404 });
    }
  } else if (body.chain && typeof body.chain === 'object') {
    // Custom chain definition provided inline.
    const def = body.chain as Record<string, unknown>;
    if (typeof def.id !== 'string' || typeof def.name !== 'string' || !Array.isArray(def.steps)) {
      return NextResponse.json({ error: 'invalid_chain_definition' }, { status: 400 });
    }
    chain = def as unknown as EnhancedSkillChain;
  } else {
    return NextResponse.json({ error: 'chain_id_or_definition_required' }, { status: 400 });
  }

  // Validate the chain (base steps + branch references).
  const validation = validateEnhancedChain(chain);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_chain', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  // Charge the estimated chain credits up front with an idempotency key.
  const cost = estimateEnhancedChainCredits(chain);
  const idempotencyKey = `enhanced-chain:${chain.id}:${randomUUID()}`;
  if (cost > 0) {
    try {
      await deductCredits(uid, cost, `creative:skill-chain-builder:${chain.id}`, undefined, idempotencyKey);
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
  const runId = randomUUID();
  try {
    await prisma.workflowRun.create({
      data: {
        id: runId,
        userId: uid,
        workflowType: 'skill-chain-builder',
        status: 'running',
        input: { chainId: chain.id, inputs, chainName: chain.name } as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.warn('[creative/skill-chain-builder] failed to create WorkflowRun:', String(e));
  }

  try {
    const result = await executeEnhancedChain(chain, inputs, planTier);

    try {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          output: { result, chainId: chain.id } as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    } catch (e) {
      console.warn('[creative/skill-chain-builder] failed to update WorkflowRun:', String(e));
    }

    return NextResponse.json({ result, runId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[creative/skill-chain-builder] execute ${chain.id} error:`, message);

    if (cost > 0) {
      await refundCredits(uid, cost, `creative:skill-chain-builder:${chain.id}`).catch(() => {});
    }

    try {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error: message,
          completedAt: new Date(),
        },
      });
    } catch {
      // Best-effort
    }

    return NextResponse.json(safeError(e, 'creative/skill-chain-builder', 'chain_execution_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
