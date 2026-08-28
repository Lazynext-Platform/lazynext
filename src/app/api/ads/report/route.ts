import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { metaAds } from '@/lib/ad-platforms/meta';
import { googleAds } from '@/lib/ad-platforms/google';
import type { PublishOptions } from '@/lib/ad-platforms/types';
import { dispatchWebhook } from '@/lib/webhooks';

export const maxDuration = 60;

async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const campaignId = url.searchParams.get('campaignId') || '';
  if (!campaignId) return NextResponse.json({ error: 'campaignId_required' }, { status: 400 });

  // Verify ownership
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, userId: uid },
  }).catch(() => null);

  if (!campaign) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });

  const dryRun = url.searchParams.get('dryRun') !== 'false'; // default dry-run for safety
  const requireApproval = url.searchParams.get('requireApproval') !== 'false';
  const spendCapRaw = url.searchParams.get('spendCap');
  const spendCap = spendCapRaw ? Number(spendCapRaw) : undefined;

  const opts: PublishOptions = {
    dryRun,
    requireApproval,
    spendCap: typeof spendCap === 'number' && Number.isFinite(spendCap) ? spendCap : undefined,
  };

  const provider = campaign.platform === 'meta' ? metaAds : googleAds;
  if (!provider.getReport) {
    return NextResponse.json({ error: 'report_unsupported_for_platform' }, { status: 400 });
  }

  try {
    const report = await provider.getReport(campaign.campaignId || campaign.id, opts);

    await dispatchWebhook(uid, 'campaign.report_generated', {
      campaignId: campaign.id,
      platform: campaign.platform,
      dryRun: opts.dryRun,
    }).catch(() => {});

    return NextResponse.json({ report });
  } catch (e) {
    console.error('[ads/report] error:', String(e));
    return NextResponse.json({ error: 'report_failed', detail: String(e) }, { status: 500 });
  }
}

export const GET = withAtlas(__byokGET);
