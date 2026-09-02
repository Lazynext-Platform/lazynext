import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { metaAds } from '@/lib/ad-platforms/meta';
import { googleAds } from '@/lib/ad-platforms/google';
import type { AdCampaignInput, PublishOptions } from '@/lib/ad-platforms/types';

export const maxDuration = 60;

/**
 * @deprecated Use /api/creative/ab-automation instead. This route is kept
 * for backward compatibility but will be removed in a future release.
 * The ab-automation route provides workflow-per-variant execution,
 * winner tagging, and production hardening (BYOK, ownership validation).
 */

/**
 * POST /api/creative/ab-test
 * Body: {
 *   variants: Array<{ creationId: string; score?: number; name: string }>,
 *   platform: 'meta' | 'google',
 *   campaignName: string,
 *   budgetDaily?: number,
 *   budgetTotal?: number,
 *   currency?: string,
 *   targeting?: object,
 *   dryRun?: boolean,
 *   spendCap?: number,
 * }
 *
 * Creates an A/B test campaign with the top N variants as separate ad sets.
 * Each variant gets its own ad set with equal budget allocation.
 *
 * Returns the campaign result + per-variant ad set IDs.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const variants = Array.isArray(body.variants) ? body.variants : [];
  const platform = String(body.platform || '');
  const campaignName = String(body.campaignName || '');

  if (variants.length < 2) {
    return NextResponse.json({ error: 'min_2_variants', detail: 'A/B test requires at least 2 variants' }, { status: 400 });
  }
  if (variants.length > 5) {
    return NextResponse.json({ error: 'max_5_variants', detail: 'A/B test supports up to 5 variants' }, { status: 400 });
  }
  if (!platform || !['meta', 'google'].includes(platform)) {
    return NextResponse.json({ error: 'invalid_platform', detail: 'platform must be "meta" or "google"' }, { status: 400 });
  }
  if (!campaignName) {
    return NextResponse.json({ error: 'campaign_name_required' }, { status: 400 });
  }

  // Verify ownership of all creation IDs
  const creationIds = variants.map((v: { creationId: string }) => v.creationId);
  const owned = await prisma.creation.findMany({
    where: { id: { in: creationIds }, userId: uid },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map(c => c.id));
  const unowned = creationIds.filter((id: string) => !ownedIds.has(id));
  if (unowned.length > 0) {
    return NextResponse.json({ error: 'ownership_error', detail: `Not authorized for creations: ${unowned.join(', ')}` }, { status: 403 });
  }

  // Sort variants by score (highest first) if scores are provided
  const sortedVariants = [...variants].sort((a: { score?: number }, b: { score?: number }) => {
    const aScore = typeof a.score === 'number' ? a.score : 0;
    const bScore = typeof b.score === 'number' ? b.score : 0;
    return bScore - aScore;
  });

  const opts: PublishOptions = {
    dryRun: body.dryRun !== false, // default to dry-run for safety
    requireApproval: body.requireApproval !== false,
    spendCap: typeof body.spendCap === 'number' ? body.spendCap : undefined,
  };

  const provider = platform === 'meta' ? metaAds : googleAds;
  const perVariantBudget = body.budgetDaily ? Math.floor(body.budgetDaily / sortedVariants.length) : undefined;

  const adSetResults: Array<{ variantIndex: number; creationId: string; name: string; score?: number; result: unknown; error?: string }> = [];

  // Create a campaign with the first variant, then add additional ad sets for the rest
  // In dry-run mode, each variant creates a separate campaign entry for simplicity
  for (let i = 0; i < sortedVariants.length; i++) {
    const variant = sortedVariants[i];
    const input: AdCampaignInput = {
      platform: platform as 'meta' | 'google',
      name: `${campaignName} — Variant ${String.fromCharCode(65 + i)}`,
      creativeIds: [variant.creationId],
      budgetDaily: perVariantBudget,
      budgetTotal: body.budgetTotal,
      currency: body.currency || 'USD',
      targeting: body.targeting,
    };

    try {
      const result = await provider.createCampaign(input, opts);

      // Persist to DB
      const campaign = await prisma.adCampaign.create({
        data: {
          userId: uid,
          platform,
          campaignId: result.campaignId || null,
          name: input.name,
          status: result.status,
          budgetDaily: input.budgetDaily || null,
          budgetTotal: input.budgetTotal || null,
          currency: input.currency || 'USD',
          targeting: input.targeting ? JSON.parse(JSON.stringify(input.targeting)) : undefined,
          creativeIds: input.creativeIds,
          metrics: result.metrics ? JSON.parse(JSON.stringify(result.metrics)) : undefined,
        },
      }).catch(() => null);

      adSetResults.push({
        variantIndex: i,
        creationId: variant.creationId,
        name: variant.name,
        score: variant.score,
        result: { ...result, dbId: campaign?.id || null },
      });
    } catch (e) {
      adSetResults.push({
        variantIndex: i,
        creationId: variant.creationId,
        name: variant.name,
        score: variant.score,
        result: null,
        error: 'ad_create_failed',
      });
    }
  }

  const succeeded = adSetResults.filter(r => !r.error).length;
  const failed = adSetResults.length - succeeded;

  return NextResponse.json({
    campaignName,
    platform,
    dryRun: opts.dryRun,
    totalVariants: sortedVariants.length,
    succeeded,
    failed,
    adSets: adSetResults,
  });
}

export { __byokPOST as POST };
