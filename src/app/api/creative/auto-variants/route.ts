import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { generateVariants, scoreCreative, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { CreativeBrief, ScriptCandidate, CreativeVariant, CreativeScore } from '@/lib/creative/types';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

/**
 * POST /api/creative/auto-variants
 *
 * Autonomous variant optimization loop:
 * 1. Takes a brief + script + optional existing score
 * 2. Generates N variants (2-5)
 * 3. Scores each variant
 * 4. Returns variants sorted by overall score (descending)
 * 5. Identifies the highest-scoring variant as the "winner"
 *
 * Body: { brief, script, count?, existingScore? }
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  const script = body.script as ScriptCandidate | undefined;
  if (!brief || !script) {
    return NextResponse.json({ error: 'brief_script_required' }, { status: 400 });
  }

  const count = typeof body.count === 'number' ? Math.min(Math.max(body.count, 2), 5) : 3;
  const existingScore = body.existingScore as CreativeScore | undefined;

  // Cost: variants + scoring for each variant
  const totalCost = CREATIVE_COSTS.variants + CREATIVE_COSTS.score * count;

  try {
    await deductCredits(uid, totalCost, 'creative:auto-variants');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    // Step 1: Generate variants
    const variants = await generateVariants(brief, script, count, planTier);

    if (variants.length === 0) {
      await refundCredits(uid, totalCost, 'creative:auto-variants');
      return NextResponse.json({ error: 'no_variants_generated' }, { status: 500 });
    }

    // Step 2: Score each variant in parallel
    // Build a modified brief for each variant to score against
    const scoredVariants = await Promise.allSettled(
      variants.map(async (variant) => {
        // Create a variant brief by swapping in the variant's hook/angle/cta
        const variantBrief: CreativeBrief = {
          ...brief,
          hook: variant.hook || brief.hook,
          cta: variant.cta || brief.cta,
        };

        // Create a variant script summary
        const variantScript: ScriptCandidate = {
          ...script,
          title: variant.script ? `${script.title} (${variant.id})` : script.title,
          scenes: script.scenes, // Keep original scenes; the variant modifies the hook/angle/cta
        };

        const score = await scoreCreative({
          brief: variantBrief,
          script: variantScript,
          planTier,
        });

        return { variant, score };
      }),
    );

    // Collect successful results
    const results: Array<{ variant: CreativeVariant; score: CreativeScore }> = [];
    for (const result of scoredVariants) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    if (results.length === 0) {
      await refundCredits(uid, totalCost, 'creative:auto-variants');
      return NextResponse.json({ error: 'scoring_failed' }, { status: 500 });
    }

    // Step 3: Sort by overall score (descending)
    results.sort((a, b) => b.score.overall - a.score.overall);

    // Step 4: Identify winner and compute improvement
    const winner = results[0];
    const baselineScore = existingScore?.overall ?? 0;
    const improvement = baselineScore > 0
      ? ((winner.score.overall - baselineScore) / baselineScore) * 100
      : 0;

    // Refund for any variants that failed to score
    const failedCount = variants.length - results.length;
    if (failedCount > 0) {
      await refundCredits(uid, CREATIVE_COSTS.score * failedCount, 'creative:auto-variants');
    }

    return NextResponse.json({
      variants: results.map((r, idx) => ({
        ...r.variant,
        score: r.score,
        rank: idx + 1,
        isWinner: idx === 0,
      })),
      winner: {
        variant: winner.variant,
        score: winner.score,
        improvement: Math.round(improvement * 10) / 10,
      },
      baselineScore,
      totalCost: CREATIVE_COSTS.variants + CREATIVE_COSTS.score * results.length,
      generated: results.length,
      failed: failedCount,
    });
  } catch (e) {
    await refundCredits(uid, totalCost, 'creative:auto-variants');
    console.error('[creative/auto-variants] error:', String(e));
    return NextResponse.json({ error: 'auto_variants_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
