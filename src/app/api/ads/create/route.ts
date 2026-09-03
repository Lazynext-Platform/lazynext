import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { metaAds } from '@/lib/ad-platforms/meta';
import { googleAds } from '@/lib/ad-platforms/google';
import type { AdCampaignInput, PublishOptions } from '@/lib/ad-platforms/types';
import { dispatchWebhook } from '@/lib/webhooks';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const input = body.input as AdCampaignInput | undefined;
  if (!input || !input.platform || !input.name || !input.creativeIds?.length) {
    return NextResponse.json({ error: 'platform_name_creatives_required' }, { status: 400 });
  }

  const opts: PublishOptions = {
    dryRun: body.dryRun !== false, // default to dry-run for safety
    requireApproval: body.requireApproval !== false, // default to requiring approval
    spendCap: typeof body.spendCap === 'number' ? body.spendCap : undefined,
  };

  const provider = input.platform === 'meta' ? metaAds : googleAds;

  try {
    const result = await provider.createCampaign(input, opts);

    // Persist to DB
    const campaign = await prisma.adCampaign.create({
      data: {
        userId: uid,
        platform: input.platform,
        campaignId: result.campaignId || null,
        name: String(input.name).slice(0, 200),
        status: result.status,
        budgetDaily: input.budgetDaily || null,
        budgetTotal: input.budgetTotal || null,
        currency: input.currency || 'USD',
        targeting: input.targeting ? JSON.parse(JSON.stringify(input.targeting)) : undefined,
        creativeIds: input.creativeIds,
        metrics: result.metrics ? JSON.parse(JSON.stringify(result.metrics)) : undefined,
      },
    }).catch(() => null);

    await dispatchWebhook(uid, 'campaign.deployed', { campaignId: campaign?.id || result.campaignId, platform: input.platform, dryRun: opts.dryRun }).catch(() => {});

    return NextResponse.json({ campaign: result, dbId: campaign?.id || null });
  } catch (e) {
    console.error('[ads/create] error:', String(e));
    return NextResponse.json({ error: 'campaign_create_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
