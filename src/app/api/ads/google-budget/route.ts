import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { googleAds, checkGoogleSpendCap } from '@/lib/ad-platforms/google';
import type { PublishOptions } from '@/lib/ad-platforms/types';
import { dispatchWebhook } from '@/lib/webhooks';

export const maxDuration = 60;

/**
 * PATCH /api/ads/google-budget
 * Update a Google Ads campaign's daily budget.
 *
 * Mirrors /api/ads/budget but is scoped to Google campaigns only and uses
 * the Google provider's spend-cap safety check. Defaults to dry-run for
 * safety; verifies campaign ownership before mutating.
 */
async function __byokPATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : '';
  const budgetDaily = typeof body.budgetDaily === 'number' ? body.budgetDaily : NaN;

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId_required' }, { status: 400 });
  }
  if (!Number.isFinite(budgetDaily) || budgetDaily <= 0) {
    return NextResponse.json({ error: 'budget_daily_must_be_positive' }, { status: 400 });
  }

  // Verify ownership
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, userId: uid },
  }).catch(() => null);

  if (!campaign) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });

  // This route is scoped to Google campaigns only.
  if (campaign.platform !== 'google') {
    return NextResponse.json({ error: 'not_a_google_campaign' }, { status: 400 });
  }

  const opts: PublishOptions = {
    dryRun: body.dryRun !== false, // default to dry-run for safety
    requireApproval: body.requireApproval !== false,
    spendCap: typeof body.spendCap === 'number' ? body.spendCap : undefined,
  };

  // Spend-cap safety margin check (server-side guard before calling provider)
  if (typeof opts.spendCap === 'number' && opts.spendCap > 0) {
    const capCheck = checkGoogleSpendCap(budgetDaily, opts.spendCap);
    if (!capCheck.ok) {
      return NextResponse.json(
        {
          error: 'budget_exceeds_spend_cap',
          cap: capCheck.cap,
          value: capCheck.value,
          margin: capCheck.margin,
          maxAllowed: capCheck.cap * capCheck.margin,
        },
        { status: 400 },
      );
    }
  }

  if (!googleAds.updateBudget) {
    return NextResponse.json({ error: 'budget_update_unsupported_for_platform' }, { status: 400 });
  }

  try {
    const result = await googleAds.updateBudget(campaign.campaignId || campaign.id, budgetDaily, opts);

    // Persist updated budget to DB
    const updated = await prisma.adCampaign.update({
      where: { id: campaign.id },
      data: {
        budgetDaily,
        status: result.status,
      },
    }).catch(() => null);

    await dispatchWebhook(uid, 'campaign.budget_updated', {
      campaignId: campaign.id,
      platform: 'google',
      budgetDaily,
      dryRun: opts.dryRun,
    }).catch(() => {});

    return NextResponse.json({ campaign: updated || result, budgetUpdated: true });
  } catch (e) {
    const msg = String(e);
    if (msg.includes('budget_exceeds_spend_cap')) {
      return NextResponse.json({ error: 'budget_exceeds_spend_cap' }, { status: 400 });
    }
    if (msg.includes('budget_daily_must_be_positive')) {
      return NextResponse.json({ error: 'budget_daily_must_be_positive' }, { status: 400 });
    }
    console.error('[ads/google-budget] error:', msg);
    return NextResponse.json({ error: 'budget_update_failed', detail: msg }, { status: 500 });
  }
}

export const PATCH = withAtlas(__byokPATCH);
